import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startServer, type Connection, type TestServer } from "./testing.js";

let server: TestServer;

beforeEach(async () => {
  server = await startServer();
});

afterEach(async () => {
  await server.close();
});

/**
 * A 2-Player One Kill Win Game in play, the Host in Seat 0 and the joiner in Seat 2, with the Host's Turn first, the
 * Rolls scripted to be these in turn, then 1s, and everything sent so far already read.
 */
const gameInPlay = async (...rolls: number[]) => {
  // The Game code, then the first Player, then each Roll.
  server = await server.restartWithRandomNumbers(42, 0, ...rolls.map((roll) => roll - 1));
  const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood", mode: "oneKillWin" });
  const joiner = await server.playerInLobby(gameCode, { playerName: "Ginny Weasley" });
  await host.nextMessage();
  await host.startGame();
  await host.nextMessage();
  await joiner.nextMessage();
  return { host, joiner };
};

const yard = { area: "yard" };
const track = (cell: number) => ({ area: "track", cell });

/** Reads the next `count` messages the connection has been sent, and returns the last. */
const lastOf = async (connection: Connection, count: number) => {
  let message;
  for (let read = 0; read < count; read++) message = await connection.nextMessage();
  return message;
};

describe("creating a One Kill Win Game", () => {
  it("puts the Host in its Lobby, which shows every Player its Game mode", async () => {
    const { host, gameCode } = await server.hostInLobby({ mode: "oneKillWin" });

    const joiner = await server.playerWithNoGame();
    const reply = await joiner.joinGame(gameCode, "Ginny Weasley");

    expect(reply).toMatchObject({ ok: true, game: { mode: "oneKillWin", state: "lobby" } });
    expect(await host.nextMessage()).toMatchObject({ game: { mode: "oneKillWin", state: "lobby" } });
  });

  it.each([
    ["one that isn't a Game mode", "quickGame"],
    ["a number", 1],
    ["null", null],
  ])("is refused when the Game mode is %s", async (_, mode) => {
    const tab = await server.playerWithNoGame();

    const reply = await new Promise((resolve) => tab.sendUnchecked("createGame", "Luna Lovegood", mode, resolve));

    expect(reply).toEqual({ ok: false, reason: "invalidGameMode" });
  });

  it("creates a Classic Game when it has a callback but no Game mode, as an older web app sends", async () => {
    const tab = await server.playerWithNoGame();

    const reply = await new Promise((resolve) => tab.sendUnchecked("createGame", "Luna Lovegood", resolve));

    expect(reply).toMatchObject({ ok: true, game: { mode: "classic", state: "lobby" } });
  });
});

describe("starting a One Kill Win Game", () => {
  it("puts 2 of each Seat's Tokens on its Start cell, the other 2 in its Yard", async () => {
    const { host, gameCode } = await server.hostInLobby({ mode: "oneKillWin" });
    await server.playerInLobby(gameCode);
    await host.nextMessage();

    await host.startGame();

    expect(await host.nextMessage()).toMatchObject({
      game: {
        mode: "oneKillWin",
        state: "playing",
        board: {
          seats: [
            { tokens: [track(0), track(0), yard, yard] },
            { tokens: [] },
            { tokens: [track(26), track(26), yard, yard] },
            { tokens: [] },
          ],
        },
      },
    });
  });

  it("lets the first Player Move on their first Roll, without a 6", async () => {
    const { host } = await gameInPlay(3);

    await host.roll();

    expect(await host.nextMessage()).toMatchObject({
      game: { board: { turn: 0, rolled: true, lastRoll: { seat: 0, number: 3 }, moves: [0, 1] } },
    });
  });
});

describe("winning a One Kill Win Game", () => {
  // The Host takes a Token from Cell 0 to 24 on four 6s, each earning another Roll, then a 1 to Cell 25, passing the
  // Turn. The joiner's 1 takes a Token from its Start cell, Cell 26, on to Cell 27, which isn't a Safe cell. Then the
  // Host Rolls a 2, which can take their Token on to Cell 27.
  const beforeTheCapture = async () => {
    const game = await gameInPlay(6, 6, 6, 6, 1, 1, 2);
    const { host, joiner } = game;
    for (let moves = 0; moves < 5; moves++) {
      await host.roll();
      await host.move(0);
    }
    await joiner.roll();
    await joiner.move(0);
    // Each Roll and Move of the 6 sent everyone a Game.
    await lastOf(host, 12);
    await lastOf(joiner, 12);
    await host.roll();
    await host.nextMessage();
    await joiner.nextMessage();
    return game;
  };

  it("ends the Game at the first Capture, showing everyone the Capturing Player as the winner", async () => {
    const { host, joiner } = await beforeTheCapture();

    const reply = await host.move(0);

    expect(reply).toEqual({ ok: true });
    const board = {
      seats: [
        { tokens: [track(27), track(0), yard, yard] },
        {},
        { tokens: [yard, track(26), yard, yard] },
        {},
      ],
      lastMove: { seat: 0, token: 0, from: track(25), to: track(27), captured: [{ seat: 2, token: 0 }] },
      winner: 0,
    };
    expect(await host.nextMessage()).toMatchObject({ game: { state: "won", board } });
    expect(await joiner.nextMessage()).toMatchObject({ game: { state: "won", board } });
  });

  it("frees its Players, so they can start another", async () => {
    const { host, joiner } = await beforeTheCapture();
    await host.move(0);

    expect(await host.roll()).toEqual({ ok: false, reason: "noActiveGame" });
    expect(await joiner.createGame("Ginny Weasley", "oneKillWin")).toMatchObject({ ok: true });
  });

  it("goes on past a Move that makes no Capture, passing the Turn", async () => {
    const { host, joiner } = await gameInPlay(2);
    await host.roll();

    await host.move(0);

    const board = { seats: [{ tokens: [track(2), track(0), yard, yard] }, {}, {}, {}], turn: 2, winner: null };
    expect(await lastOf(host, 2)).toMatchObject({ game: { state: "playing", board } });
    expect(await lastOf(joiner, 2)).toMatchObject({ game: { state: "playing", board } });
  });

  it("is the last Player remaining's when the others Leave, as in Classic", async () => {
    const { host, joiner } = await gameInPlay();

    await joiner.leaveGame();

    expect(await host.nextMessage()).toMatchObject({ game: { state: "won", board: { winner: 0 } } });
  });
});
