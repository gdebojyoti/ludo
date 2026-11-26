import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startServer, type TestServer } from "./testing.js";

const endedAt = "2026-11-26T10:00:00.000Z";

let server: TestServer;

beforeEach(async () => {
  server = await startServer({ now: () => new Date(endedAt) });
});

afterEach(async () => {
  await server.close();
});

/**
 * A 2-Player Game in play, following `mode`, the Host in Seat 0 and the joiner in Seat 2, with the Host's Turn first,
 * the Rolls scripted to be these in turn, then 1s, and everything sent so far already read.
 */
const gameInPlay = async (mode: "classic" | "oneKillWin", ...rolls: number[]) => {
  // The Game code, then the first Player, then each Roll.
  server = await server.restartWithRandomNumbers(42, 0, ...rolls.map((roll) => roll - 1));
  const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood", mode });
  const joiner = await server.playerInLobby(gameCode, { playerName: "Ginny Weasley" });
  await host.startGame();
  return { host, joiner, gameCode };
};

// A Token's whole 56-Cell journey Home, out on a 6, then nine 6s and a 2, every one of which earns another Roll.
const tokenJourney = [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2];

const gameId = expect.any(String);

describe("a Classic Game won by bringing every Token Home", () => {
  it("keeps one result, with each Player's Standing and Tokens Home", async () => {
    const { host } = await gameInPlay("classic", ...[0, 1, 2, 3].flatMap(() => tokenJourney));
    for (const token of [0, 1, 2, 3]) {
      for (let roll = 0; roll < tokenJourney.length; roll++) {
        await host.roll();
        await host.move(token);
      }
    }

    expect(await server.gameResults()).toEqual([{
      gameId,
      mode: "classic",
      turnsPlayed: 1,
      endedAt,
      players: [
        { seat: 0, joinedVia: "webApp", accountId: null, standing: 1, captures: 0, tokensHome: 4, left: false },
        { seat: 2, joinedVia: "webApp", accountId: null, standing: 2, captures: 0, tokensHome: 0, left: false },
      ],
    }]);
  });
});

describe("a One Kill Win Game won by a Capture", () => {
  it("keeps one result, with the Capture and every Turn played", async () => {
    // The Host takes a Token from Cell 0 to 24 on four 6s, then to 25 on a 1, passing the Turn. The joiner's 1 takes a
    // Token from Cell 26 to 27, passing it back. The Host's 2 then Captures it, in the third Turn.
    const { host, joiner } = await gameInPlay("oneKillWin", 6, 6, 6, 6, 1, 1, 2);
    for (let moves = 0; moves < 5; moves++) {
      await host.roll();
      await host.move(0);
    }
    await joiner.roll();
    await joiner.move(0);
    await host.roll();
    await host.move(0);

    expect(await server.gameResults()).toEqual([{
      gameId,
      mode: "oneKillWin",
      turnsPlayed: 3,
      endedAt,
      players: [
        { seat: 0, joinedVia: "webApp", accountId: null, standing: 1, captures: 1, tokensHome: 0, left: false },
        { seat: 2, joinedVia: "webApp", accountId: null, standing: 2, captures: 0, tokensHome: 0, left: false },
      ],
    }]);
  });
});

describe("a Game won by every other Player Leaving", () => {
  it("keeps one result, with the Tokens Home each Leaver had when they Left", async () => {
    // The Host brings a Token Home, then Rolls a 1 no Token can Move by, passing the Turn to the joiner.
    const { host, joiner } = await gameInPlay("classic", ...tokenJourney, 1);
    for (let roll = 0; roll < tokenJourney.length; roll++) {
      await host.roll();
      await host.move(0);
    }
    await host.roll();

    await host.leaveGame();

    expect(await server.gameResults()).toEqual([{
      gameId,
      mode: "classic",
      turnsPlayed: 2,
      endedAt,
      players: [
        { seat: 0, joinedVia: "webApp", accountId: null, standing: 2, captures: 0, tokensHome: 1, left: true },
        { seat: 2, joinedVia: "webApp", accountId: null, standing: 1, captures: 0, tokensHome: 0, left: false },
      ],
    }]);
    expect(await joiner.roll()).toEqual({ ok: false, reason: "noActiveGame" });
  });

  it("is still won when its result can't be kept, which is logged", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = {
      save: () => Promise.reject(new Error("Connection terminated unexpectedly")),
      findResult: async () => undefined,
    };
    await server.close();
    server = await startServer({ gameResults: failing });
    const { host, gameCode } = await server.hostInLobby();
    const joiner = await server.playerInLobby(gameCode);
    await host.startGame();
    // The joiner joining, then the Game starting.
    await host.nextMessage();
    await host.nextMessage();

    expect(await joiner.leaveGame()).toEqual({ ok: true });

    expect(await host.nextMessage()).toMatchObject({ game: { state: "won", board: { winner: 0 } } });
    expect(logged).toHaveBeenCalledWith(
      expect.stringMatching(/^The result of Game .+ couldn't be kept:$/),
      "Connection terminated unexpectedly",
    );
    expect(await (await server.playerWithNoGame()).createGame("Neville Longbottom")).toMatchObject({ ok: true });
    logged.mockRestore();
  });

  it("keeps how each Player joined, an AI Player over MCP, and counts the Turns begun as others Left", async () => {
    // The Game code, the first Player, then a 1 for the Host, which no Token can Move by.
    server = await server.restartWithRandomNumbers(42, 0, 0);
    const { host, gameCode } = await server.hostInLobby();
    const ai = await server.connectAi();
    await ai.joinGame(gameCode);
    const third = await server.playerInLobby(gameCode);
    await host.startGame();
    // The Host, in Seat 0, Rolls a 1, passing the Turn to the third Player, in Seat 1, who Leaves on it, passing it to
    // the AI Player, in Seat 2, who Leaves too.
    await host.roll();
    await third.leaveGame();
    await ai.leaveGame();

    expect(await server.gameResults()).toEqual([{
      gameId,
      mode: "classic",
      turnsPlayed: 3,
      endedAt,
      players: [
        { seat: 0, joinedVia: "webApp", accountId: null, standing: 1, captures: 0, tokensHome: 0, left: false },
        { seat: 1, joinedVia: "webApp", accountId: null, standing: 2, captures: 0, tokensHome: 0, left: true },
        { seat: 2, joinedVia: "mcp", accountId: null, standing: 2, captures: 0, tokensHome: 0, left: true },
      ],
    }]);
  });
});

describe("a Game that never ends", () => {
  it("keeps no result when its Host cancels it in the Lobby", async () => {
    const { host, gameCode } = await server.hostInLobby();
    await server.playerInLobby(gameCode);

    await host.leaveGame();

    expect(await server.gameResults()).toEqual([]);
  });

  it("keeps no result while it's still being played", async () => {
    const { host } = await gameInPlay("classic", 6);
    await host.roll();
    await host.move(0);

    expect(await server.gameResults()).toEqual([]);
  });
});
