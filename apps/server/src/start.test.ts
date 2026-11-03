import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startServer, type TestServer } from "./testing.js";

let server: TestServer;

beforeEach(async () => {
  server = await startServer();
});

afterEach(async () => {
  await server.close();
});

/** A Seat's 4 Tokens, all in its Yard. */
const inYard = Array.from({ length: 4 }, () => ({ area: "yard" }));

const emptySeat = { playerName: null, left: false, tokens: [] };

describe("the Host starting the Game", () => {
  it("with 2 Players seats them opposite each other, and sends each of them the Board from their own Seat", async () => {
    // The Game code, then the first Player: the first to join.
    server = await server.restartWithRandomNumbers(42, 0);
    const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood" });
    const joiner = await server.playerInLobby(gameCode, { playerName: "Ginny Weasley" });
    await host.nextMessage();

    const reply = await host.startGame();

    expect(reply).toEqual({ ok: true });
    const players = [{ playerName: "Luna Lovegood", isHost: true }, { playerName: "Ginny Weasley", isHost: false }];
    const seats = [
      { playerName: "Luna Lovegood", left: false, tokens: inYard },
      emptySeat,
      { playerName: "Ginny Weasley", left: false, tokens: inYard },
      emptySeat,
    ];
    // Nobody has Rolled yet, or won.
    const board = { seats, turn: 0, rolled: false, lastRoll: null, lastMove: null, moves: [], winner: null };
    expect(await host.nextMessage()).toEqual({
      event: "game",
      game: { state: "playing", gameCode: null, isHost: true, players, board: { ...board, seat: 0 } },
    });
    expect(await joiner.nextMessage()).toEqual({
      event: "game",
      game: { state: "playing", gameCode: null, isHost: false, players, board: { ...board, seat: 2 } },
    });
  });

  it("with 3 Players seats the third clockwise from the first, leaving the last Seat empty", async () => {
    const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood" });
    await server.playerInLobby(gameCode, { playerName: "Ginny Weasley" });
    const third = await server.playerInLobby(gameCode, { playerName: "Neville Longbottom" });

    await host.startGame();

    expect(await third.nextMessage()).toMatchObject({
      game: {
        board: {
          seat: 1,
          seats: [
            { playerName: "Luna Lovegood", tokens: inYard },
            { playerName: "Neville Longbottom", tokens: inYard },
            { playerName: "Ginny Weasley", tokens: inYard },
            emptySeat,
          ],
        },
      },
    });
  });

  it("seats 2 Players opposite each other even after someone Left the Lobby", async () => {
    const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood" });
    const leaver = await server.playerInLobby(gameCode, { playerName: "Ginny Weasley" });
    await leaver.leaveGame();
    const stayer = await server.playerInLobby(gameCode, { playerName: "Neville Longbottom" });

    await host.startGame();

    expect(await stayer.nextMessage()).toMatchObject({
      game: {
        board: {
          seat: 2,
          seats: [{ playerName: "Luna Lovegood" }, emptySeat, { playerName: "Neville Longbottom" }, emptySeat],
        },
      },
    });
  });

  it("gives the first Turn to the Player the server picks at random", async () => {
    // The Game code, then the first Player: the second to join, in Seat 2.
    server = await server.restartWithRandomNumbers(42, 1);
    const { host, gameCode } = await server.hostInLobby();
    const joiner = await server.playerInLobby(gameCode);
    await host.nextMessage();

    await host.startGame();

    expect(await host.nextMessage()).toMatchObject({ game: { board: { turn: 2 } } });
    expect(await joiner.nextMessage()).toMatchObject({ game: { board: { turn: 2 } } });
  });

  it("retires the Game code, so nobody else can join, and a new Game in the Lobby can be given it", async () => {
    server = await server.restartWithRandomNumbers(42, 0, 42);
    const { host, gameCode } = await server.hostInLobby();
    await server.playerInLobby(gameCode);
    await host.startGame();
    const latecomer = await server.playerWithNoGame();

    const reply = await latecomer.joinGame(gameCode, "Ron Weasley");
    const next = await server.hostInLobby();

    expect(reply).toEqual({ ok: false, reason: "gameCodeNotFound" });
    expect(next.gameCode).toBe(gameCode);
  });

  it("is refused for a Player who isn't the Host", async () => {
    const { gameCode } = await server.hostInLobby();
    const joiner = await server.playerInLobby(gameCode);

    expect(await joiner.startGame()).toEqual({ ok: false, reason: "notHost" });
  });

  it("is refused while the Host is alone in the Lobby, which stays as it was", async () => {
    const player = server.createPlayer();
    const { host } = await server.hostInLobby({ player });

    const reply = await host.startGame();
    await host.close();

    expect(reply).toEqual({ ok: false, reason: "notEnoughPlayers" });
    expect(await (await player.connect()).nextMessage()).toMatchObject({ game: { state: "lobby" } });
  });

  it("is refused for a Player with no active Game", async () => {
    const tab = await server.playerWithNoGame();

    expect(await tab.startGame()).toEqual({ ok: false, reason: "noActiveGame" });
  });

  it("is ignored when sent without a callback", async () => {
    const player = server.createPlayer();
    const { host, gameCode } = await server.hostInLobby({ player });
    await server.playerInLobby(gameCode);

    host.sendUnchecked("startGame");
    await host.close();

    expect(await (await player.connect()).nextMessage()).toMatchObject({ game: { state: "lobby" } });
  });
});

describe("the fourth Player joining", () => {
  it("starts the Game in the same command, seating the Players in join order, and tells everyone", async () => {
    const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood" });
    const second = await server.playerInLobby(gameCode, { playerName: "Ginny Weasley" });
    const third = await server.playerInLobby(gameCode, { playerName: "Neville Longbottom" });
    const fourth = await server.playerWithNoGame();

    const reply = await fourth.joinGame(gameCode, "Hermione Granger");

    const seats = [
      { playerName: "Luna Lovegood", tokens: inYard },
      { playerName: "Neville Longbottom", tokens: inYard },
      { playerName: "Ginny Weasley", tokens: inYard },
      { playerName: "Hermione Granger", tokens: inYard },
    ];
    expect(reply).toMatchObject({ ok: true, game: { state: "playing", gameCode: null, board: { seat: 3, seats } } });
    expect(await fourth.nextMessage()).toMatchObject({ game: { state: "playing", board: { seat: 3, seats } } });
    await host.nextMessage();
    await host.nextMessage();
    expect(await host.nextMessage()).toMatchObject({ game: { state: "playing", board: { seat: 0, seats } } });
    await second.nextMessage();
    expect(await second.nextMessage()).toMatchObject({ game: { state: "playing", board: { seat: 2, seats } } });
    expect(await third.nextMessage()).toMatchObject({ game: { state: "playing", board: { seat: 1, seats } } });
  });
});

describe("once the Game has started", () => {
  it("can't be started again, by the Host or anyone else, and carries on", async () => {
    const hostPlayer = server.createPlayer();
    const { host, gameCode } = await server.hostInLobby({ player: hostPlayer });
    const joiner = await server.playerInLobby(gameCode);
    await host.startGame();

    const replies = [await host.startGame(), await joiner.startGame()];
    await host.close();

    expect(replies).toEqual([
      { ok: false, reason: "gameNotInLobby" },
      { ok: false, reason: "gameNotInLobby" },
    ]);
    expect(await (await hostPlayer.connect()).nextMessage()).toMatchObject({ game: { state: "playing" } });
  });

  it("doesn't cancel it when the Host Leaves: they forfeit like any other Player", async () => {
    const { host, gameCode } = await server.hostInLobby();
    const second = await server.playerInLobby(gameCode);
    const third = await server.playerInLobby(gameCode);
    await host.startGame();
    await second.nextMessage();
    await second.nextMessage();

    expect(await host.leaveGame()).toEqual({ ok: true });
    const seats = [{ left: true }, {}, {}, {}];
    expect(await second.nextMessage()).toMatchObject({ game: { state: "playing", board: { seats } } });
    expect(await third.leaveGame()).toEqual({ ok: true });
  });

  it("brings a Player who comes back to the Board as it is, from their own Seat", async () => {
    server = await server.restartWithRandomNumbers(42, 1);
    const { host, gameCode } = await server.hostInLobby();
    const player = server.createPlayer();
    const joiner = await server.playerInLobby(gameCode, { player });
    await host.startGame();
    const started = await joiner.nextMessage();
    await joiner.close();

    const message = await (await player.connect()).nextMessage();

    expect(started).toMatchObject({ game: { state: "playing", board: { seat: 2, turn: 2 } } });
    expect(message).toEqual(started);
  });

  it("keeps its Players from creating or joining another Game", async () => {
    const { host, gameCode } = await server.hostInLobby();
    const joiner = await server.playerInLobby(gameCode);
    await host.startGame();
    const other = await server.hostInLobby();

    expect(await host.createGame("Luna Lovegood")).toEqual({ ok: false, reason: "alreadyInActiveGame" });
    expect(await joiner.joinGame(other.gameCode, "Ginny Weasley")).toEqual({
      ok: false,
      reason: "alreadyInActiveGame",
    });
  });
});
