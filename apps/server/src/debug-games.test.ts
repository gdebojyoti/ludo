import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startServer, type TestServer } from "./testing.js";

let server: TestServer;

beforeEach(async () => {
  // A clock that moves on a second each time it's read, so every save has its own time.
  let seconds = 0;
  server = await startServer({ now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, seconds++)) });
});

afterEach(async () => {
  await server.close();
});

/** The Game created last, as the debug list shows it. */
const newestGame = async () => {
  const [game] = (await server.debugGames()).games;
  if (!game) throw new Error("The debug list has no Games");
  return game;
};

/**
 * A 2-Player Game in play, the Host in Seat 0 and the joiner in Seat 2, with the Host's Turn first and the Rolls
 * scripted to be these in turn, then 1s. Each Player comes with their browser.
 */
const gameInPlay = async (...rolls: number[]) => {
  // The Game code, then the first Player, then each Roll.
  server = await server.restartWithRandomNumbers(42, 0, ...rolls.map((roll) => roll - 1));
  const hostPlayer = server.createPlayer();
  const joinerPlayer = server.createPlayer();
  const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood", player: hostPlayer });
  const joiner = await server.playerInLobby(gameCode, { playerName: "Ginny Weasley", player: joinerPlayer });
  await host.startGame();
  return { host, joiner, hostPlayer, joinerPlayer };
};

const label = expect.stringMatching(/^[0-9a-f]{6}$/);
const yard = { area: "yard" };
const emptySeat = { label: null, playerName: null, left: false, tokens: [] };

describe("the debug list of Games", () => {
  it("shows a Game in the Lobby with its Host, its masked Game code and when it was created", async () => {
    const { gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood" });

    const { games } = await server.debugGames();

    expect(games).toEqual([{
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      mode: "classic",
      state: "lobby",
      gameCode: `${gameCode.slice(0, 2)}****`,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      players: [{ label, playerName: "Luna Lovegood", isHost: true, away: false }],
      board: null,
    }]);
    // The Board is the longest part, so it comes after everything else.
    expect(Object.keys(games[0] ?? {}).at(-1)).toBe("board");
  });

  it("shows a Game in play with its Board, its latest Roll and Move, and no Game code", async () => {
    // The Host brings a Token out on a 6, which earns another Roll.
    const { host } = await gameInPlay(6);
    await host.roll();
    await host.move(1);

    const game = await newestGame();

    expect(game).toMatchObject({
      state: "playing",
      gameCode: null,
      players: [
        { label, playerName: "Luna Lovegood", isHost: true, away: false },
        { label, playerName: "Ginny Weasley", isHost: false, away: false },
      ],
      board: {
        turn: 0,
        rolled: false,
        lastRoll: { seat: 0, number: 6, index: 0 },
        lastMove: { seat: 0, token: 1, from: yard, to: { area: "track", cell: 0 }, captured: [], index: 0 },
        winner: null,
        seats: [
          {
            label,
            playerName: "Luna Lovegood",
            left: false,
            tokens: [yard, { area: "track", cell: 0 }, yard, yard],
          },
          emptySeat,
          { label, playerName: "Ginny Weasley", left: false, tokens: [yard, yard, yard, yard] },
          emptySeat,
        ],
      },
    });
  });

  it("never shows a player ID, only the same 6-character label for a Player in every Game", async () => {
    const { host, hostPlayer, joinerPlayer } = await gameInPlay();
    await host.leaveGame();
    await host.createGame("Luna Lovegood");

    const { body, games } = await server.debugGames();

    const hostId = hostPlayer.playerId() ?? "";
    const joinerId = joinerPlayer.playerId() ?? "";
    expect(body).not.toContain(hostId);
    expect(body).not.toContain(joinerId);
    // Every ID in the list must be a Game's.
    const gameIds = games.map((game) => game.id);
    for (const uuid of body.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? []) {
      expect(gameIds).toContain(uuid);
    }
    const [newGame, oldGame] = games;
    expect(newGame?.players[0]?.label).toBe(hostId.slice(0, 6));
    expect(oldGame?.players[0]?.label).toBe(joinerId.slice(0, 6));
    expect(oldGame?.board?.seats[2]?.label).toBe(joinerId.slice(0, 6));
  });

  it("shows whether each Player is Away right now", async () => {
    const { joiner } = await gameInPlay();
    await joiner.close();

    const game = await newestGame();

    expect(game.players.map((player) => player.away)).toEqual([false, true]);
  });

  it("shows the Seat of a Player who Left during play, and the winner it left", async () => {
    const { host } = await gameInPlay();
    await host.leaveGame();

    const game = await newestGame();

    expect(game).toMatchObject({
      state: "won",
      players: [{ playerName: "Ginny Weasley", isHost: false }],
      board: { winner: 2, seats: [{ label: null, playerName: "Luna Lovegood", left: true, tokens: [] }, {}, {}, {}] },
    });
  });

  it("shows a Game cancelled in the Lobby with no Game code", async () => {
    const { host } = await server.hostInLobby();
    await host.leaveGame();

    const game = await newestGame();

    expect(game).toMatchObject({ state: "cancelled", gameCode: null, board: null });
  });

  it("lists only the newest 100 Games, newest first", async () => {
    await gameInPlay();
    const host = await server.playerWithNoGame();
    for (let i = 0; i < 100; i++) {
      await host.createGame("Luna Lovegood");
      if (i < 99) await host.leaveGame();
    }

    const { games } = await server.debugGames();

    expect(games).toHaveLength(100);
    expect(games[0]?.state).toBe("lobby");
    // The Game in play was created first, so it's the one left out.
    expect(games.slice(1).every((game) => game.state === "cancelled")).toBe(true);
    const createdAts = games.map((game) => game.createdAt);
    expect(createdAts).toEqual([...createdAts].sort().reverse());
  });
});

describe("when a Game was last saved, in the debug list", () => {
  it("moves on with every join, the start, every Roll and Move, and Leave game, while when it was created stays", async () => {
    // The Host brings a Token out on a 6.
    server = await server.restartWithRandomNumbers(42, 0, 5);
    const { host, gameCode } = await server.hostInLobby();
    const { createdAt } = await newestGame();
    const updatedAts = [(await newestGame()).updatedAt];
    const updated = async (command: () => Promise<unknown>) => {
      await command();
      updatedAts.push((await newestGame()).updatedAt);
    };
    const joiner = await server.playerWithNoGame();

    await updated(() => joiner.joinGame(gameCode, "Ginny Weasley"));
    await updated(() => host.startGame());
    await updated(() => host.roll());
    await updated(() => host.move(0));
    await updated(() => joiner.leaveGame());

    expect(new Set(updatedAts).size).toBe(updatedAts.length);
    expect(updatedAts).toEqual([...updatedAts].sort());
    expect((await newestGame()).createdAt).toBe(createdAt);
  });
});
