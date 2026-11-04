import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startServer, type TestServer } from "./testing.js";

let server: TestServer;

beforeEach(async () => {
  server = await startServer();
});

afterEach(async () => {
  await server.close();
});

describe("Away in the Lobby", () => {
  it("shows everyone a Player with no tab open as Away, and as back once they open one", async () => {
    const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood" });
    const joinerPlayer = server.createPlayer();
    const joiner = await server.playerInLobby(gameCode, { playerName: "Ginny Weasley", player: joinerPlayer });
    await host.nextMessage();

    await joiner.close();

    expect(await host.nextMessage()).toMatchObject({
      game: {
        players: [
          { playerName: "Luna Lovegood", away: false },
          { playerName: "Ginny Weasley", away: true },
        ],
      },
    });

    const rejoined = await joinerPlayer.connect();

    const back = {
      game: {
        players: [
          { playerName: "Luna Lovegood", away: false },
          { playerName: "Ginny Weasley", away: false },
        ],
      },
    };
    expect(await host.nextMessage()).toMatchObject(back);
    expect(await rejoined.nextMessage()).toMatchObject(back);
  });

  it("doesn't show a Player with two tabs open as Away when they close one, nor tell anyone anything", async () => {
    const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood" });
    const joinerPlayer = server.createPlayer();
    const joiner = await server.playerInLobby(gameCode, { playerName: "Ginny Weasley", player: joinerPlayer });
    await host.nextMessage();
    const otherTab = await joinerPlayer.connect();
    expect(await otherTab.nextMessage()).toMatchObject({ game: { players: [{ away: false }, { away: false }] } });

    await otherTab.close();
    // The Host is sent this change, so anything sent to them about the closed tab would be read before it.
    await joiner.leaveGame();

    expect(await host.nextMessage()).toMatchObject({ game: { players: [{ playerName: "Luna Lovegood" }] } });
  });
});

/**
 * A 2-Player Game in play, the Host in Seat 0 and the joiner in Seat 2, with the Host's Turn first, the Rolls
 * scripted to be these in turn, then 1s, and everything sent so far already read.
 */
const gameInPlay = async (...rolls: number[]) => {
  // The Game code, then the first Player, then each Roll.
  server = await server.restartWithRandomNumbers(42, 0, ...rolls.map((roll) => roll - 1));
  const hostPlayer = server.createPlayer();
  const joinerPlayer = server.createPlayer();
  const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood", player: hostPlayer });
  const joiner = await server.playerInLobby(gameCode, { playerName: "Ginny Weasley", player: joinerPlayer });
  await host.nextMessage();
  await host.startGame();
  await host.nextMessage();
  await joiner.nextMessage();
  return { host, joiner, hostPlayer, joinerPlayer };
};

describe("Away during play", () => {
  it("shows everyone a Player with no tab open as Away by their Seat, and as back once they open one", async () => {
    const { host, joiner, hostPlayer } = await gameInPlay();

    await host.close();

    expect(await joiner.nextMessage()).toMatchObject({
      game: {
        players: [{ away: true }, { away: false }],
        board: {
          seats: [
            { playerName: "Luna Lovegood", away: true },
            { playerName: null, away: false },
            { playerName: "Ginny Weasley", away: false },
            { playerName: null, away: false },
          ],
        },
      },
    });

    await hostPlayer.connect();

    expect(await joiner.nextMessage()).toMatchObject({
      game: { players: [{ away: false }, { away: false }], board: { seats: [{ away: false }, {}, { away: false }, {}] } },
    });
  });

  it("doesn't show an empty Seat, or one whose Player Left, as Away", async () => {
    server = await server.restartWithRandomNumbers(42, 0);
    const { host, gameCode } = await server.hostInLobby();
    const second = await server.playerInLobby(gameCode);
    const third = await server.playerInLobby(gameCode);
    await host.startGame();
    await third.leaveGame();
    await third.close();
    // The third Player joining, the Game starting, then the third Player Leaving it.
    await second.nextMessage();
    await second.nextMessage();

    const message = await second.nextMessage();

    // Of 3 Players, the third sits clockwise from the first, leaving the last Seat empty.
    expect(message).toMatchObject({
      game: {
        board: {
          seats: [
            { left: false, away: false },
            { left: true, away: false },
            { left: false, away: false },
            { playerName: null, away: false },
          ],
        },
      },
    });
  });

  it("makes the Game wait for a Player who is Away on their Turn, with nothing changed when they come back", async () => {
    const { host, joiner, hostPlayer } = await gameInPlay();
    await host.close();
    await joiner.nextMessage();

    // However long it waits, the Turn stays theirs, and the other Player can't take it.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(await joiner.roll()).toEqual({ ok: false, reason: "notYourTurn" });
    const rejoined = await hostPlayer.connect();

    expect(await rejoined.nextMessage()).toMatchObject({ game: { state: "playing", board: { turn: 0, rolled: false } } });
  });
});

describe("Rejoining during play", () => {
  it("brings a Player back before they've Rolled on their Turn, still to Roll", async () => {
    const { host, hostPlayer } = await gameInPlay(6);
    await host.close();

    const rejoined = await hostPlayer.connect();

    expect(await rejoined.nextMessage()).toMatchObject({
      game: { state: "playing", board: { seat: 0, turn: 0, rolled: false, moves: [] } },
    });
    expect(await rejoined.roll()).toEqual({ ok: true });
  });

  it("brings a Player back after they've Rolled on their Turn, with their legal Moves marked", async () => {
    const { host, hostPlayer } = await gameInPlay(6);
    await host.roll();
    await host.close();

    const rejoined = await hostPlayer.connect();

    expect(await rejoined.nextMessage()).toMatchObject({
      game: {
        state: "playing",
        board: { seat: 0, turn: 0, rolled: true, lastRoll: { seat: 0, number: 6 }, moves: [0, 1, 2, 3] },
      },
    });
    expect(await rejoined.move(0)).toEqual({ ok: true });
  });

  it("brings the Game back as it is now, after the other Players played on while they were Away", async () => {
    const { host, joiner, joinerPlayer } = await gameInPlay(6, 3);
    await joiner.close();
    // The Host brings a Token out on a 6, which earns another Roll, then Moves it on by a 3, passing the Turn.
    await host.roll();
    await host.move(2);
    await host.roll();
    await host.move(2);

    const rejoined = await joinerPlayer.connect();

    expect(await rejoined.nextMessage()).toMatchObject({
      game: {
        state: "playing",
        board: {
          seat: 2,
          seats: [{ tokens: [yard, yard, track(3), yard] }, {}, { tokens: [yard, yard, yard, yard] }, {}],
          turn: 2,
          rolled: false,
          lastRoll: { seat: 0, number: 3 },
          lastMove: { seat: 0, token: 2, from: track(0), to: track(3) },
        },
      },
    });
  });
});

const yard = { area: "yard" };
const track = (cell: number) => ({ area: "track", cell });
