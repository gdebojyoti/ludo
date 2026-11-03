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
 * A 2-Player Game in play, the Host in Seat 0 and the joiner in Seat 2, with the Host's Turn first, the Rolls
 * scripted to be these in turn, then 1s, and everything sent so far already read. Each Player comes with their
 * browser, so they can open another tab.
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

const yard = { area: "yard" };

/** Reads the next `count` messages the connection has been sent, and returns them. */
const readMessages = async (connection: Connection, count: number) => {
  const messages = [];
  for (let read = 0; read < count; read++) messages.push(await connection.nextMessage());
  return messages;
};

describe("Rolling", () => {
  it("on a Player's Turn shows everyone the number, and the Player alone the Tokens they can Move", async () => {
    const { host, joiner } = await gameInPlay(6);

    const reply = await host.roll();

    expect(reply).toEqual({ ok: true });
    const lastRoll = { seat: 0, number: 6 };
    expect(await host.nextMessage()).toMatchObject({
      game: { board: { turn: 0, rolled: true, lastRoll, lastMove: null, moves: [0, 1, 2, 3] } },
    });
    expect(await joiner.nextMessage()).toMatchObject({
      game: { board: { turn: 0, rolled: true, lastRoll, lastMove: null, moves: [] } },
    });
  });
});

describe("Moving", () => {
  it("takes the chosen Token by the Roll, shows everyone the Move, and passes the Turn clockwise", async () => {
    const { host, joiner } = await gameInPlay(6);
    await host.roll();
    await host.nextMessage();
    await joiner.nextMessage();

    const reply = await host.move(2);

    expect(reply).toEqual({ ok: true });
    const board = {
      seats: [{ tokens: [yard, yard, { area: "track", cell: 0 }, yard] }, {}, { tokens: [yard, yard, yard, yard] }, {}],
      turn: 2,
      rolled: false,
      lastRoll: { seat: 0, number: 6 },
      lastMove: { seat: 0, token: 2, from: yard, to: { area: "track", cell: 0 } },
      moves: [],
    };
    expect(await host.nextMessage()).toMatchObject({ game: { board } });
    expect(await joiner.nextMessage()).toMatchObject({ game: { board } });
  });

  it("is still the Player's choice when only one Move is legal", async () => {
    // The Host brings a Token out on a 6, then the joiner's 2 can't Move any of theirs.
    const { host, joiner } = await gameInPlay(6, 2, 3);
    await host.roll();
    await host.move(0);
    await joiner.roll();
    await readMessages(host, 3);

    await host.roll();

    expect(await host.nextMessage()).toMatchObject({
      game: { board: { turn: 0, rolled: true, lastRoll: { seat: 0, number: 3 }, moves: [0] } },
    });
  });

  it("takes a Token on from its Start cell along the Track", async () => {
    const { host, joiner } = await gameInPlay(6, 1, 4);
    await host.roll();
    await host.move(3);
    await joiner.roll();
    await host.roll();

    await host.move(3);

    const [message] = (await readMessages(host, 5)).slice(-1);
    const tokens = [yard, yard, yard, { area: "track", cell: 4 }];
    expect(message).toMatchObject({ game: { board: { seats: [{ tokens }, {}, {}, {}] } } });
  });
});

describe("a Roll with no legal Move", () => {
  it("passes the Turn by itself, still showing everyone the Roll", async () => {
    const { host, joiner } = await gameInPlay(5);

    const reply = await host.roll();

    expect(reply).toEqual({ ok: true });
    const board = { turn: 2, rolled: false, lastRoll: { seat: 0, number: 5 }, lastMove: null, moves: [] };
    expect(await host.nextMessage()).toMatchObject({ game: { board } });
    expect(await joiner.nextMessage()).toMatchObject({ game: { board } });
  });
});

describe("Turn order", () => {
  it("goes clockwise round the taken Seats, skipping an empty one", async () => {
    // The Game code, then the first Player, the Host, then Rolls of 1, which pass each Turn.
    server = await server.restartWithRandomNumbers(42, 0);
    const { host, gameCode } = await server.hostInLobby();
    const second = await server.playerInLobby(gameCode);
    const third = await server.playerInLobby(gameCode);
    await host.startGame();
    await readMessages(host, 3);

    // Seat 0, then Seat 1, the third to join, then Seat 2, the second, then round past the empty Seat 3.
    const replies = [await host.roll(), await third.roll(), await second.roll()];
    const turns = (await readMessages(host, 3)).map((message) => message.event === "game" && message.game.board?.turn);

    expect(replies).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(turns).toEqual([1, 2, 0]);
  });
});

describe("refusals", () => {
  it("refuse a Roll, or a Move, from a Player whose Turn it isn't", async () => {
    const { joiner } = await gameInPlay(6);

    expect(await joiner.roll()).toEqual({ ok: false, reason: "notYourTurn" });
    expect(await joiner.move(0)).toEqual({ ok: false, reason: "notYourTurn" });
  });

  it("refuse a second Roll before Moving", async () => {
    const { host } = await gameInPlay(6);
    await host.roll();

    expect(await host.roll()).toEqual({ ok: false, reason: "alreadyRolled" });
  });

  it("refuse a Move before Rolling", async () => {
    const { host } = await gameInPlay();

    expect(await host.move(0)).toEqual({ ok: false, reason: "notRolled" });
  });

  it("refuse a Move of a Token that can't Move by the Roll, leaving the Player to Move another", async () => {
    // The Host brings Token 0 out on a 6, the joiner's 1 passes, then the Host's 3 can Move only Token 0.
    const { host, joiner } = await gameInPlay(6, 1, 3);
    await host.roll();
    await host.move(0);
    await joiner.roll();
    await host.roll();

    expect(await host.move(1)).toEqual({ ok: false, reason: "illegalMove" });
    expect(await host.move(0)).toEqual({ ok: true });
  });

  it.each([4, -1, 0.5, "0", null])("refuse a Move of %j, which isn't one of the Seat's Tokens", async (token) => {
    const { host } = await gameInPlay(6);
    await host.roll();

    // Sent as no well-behaved client would.
    expect(await host.move(token as number)).toEqual({ ok: false, reason: "illegalMove" });
    expect(await host.move(0)).toEqual({ ok: true });
  });

  it.each([
    ["Roll", (tab: Connection) => tab.roll()],
    ["Move", (tab: Connection) => tab.move(0)],
  ])("refuse a %s in the Lobby, which isn't in play, or with no active Game", async (_, command) => {
    const { host } = await server.hostInLobby();
    const tab = await server.playerWithNoGame();

    expect(await command(host)).toEqual({ ok: false, reason: "gameNotInPlay" });
    expect(await command(tab)).toEqual({ ok: false, reason: "noActiveGame" });
  });
});

describe("winning", () => {
  // Each of the Host's Tokens comes out on a 6, then makes its 56-Cell journey Home in nine 6s and a 2. Every Roll
  // of the joiner's is a 1, which can't bring a Token out, so the Turn comes straight back to the Host.
  const tokenJourney = [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2];
  const tokens = [0, 1, 2, 3];

  /** A 2-Player Game in which the Host brings all their Tokens Home, with every message sent during it unread. */
  const gameWonByHost = async () => {
    const game = await gameInPlay(...tokens.flatMap(() => tokenJourney).flatMap((roll) => [roll, 1]));
    const { host, joiner } = game;
    for (const token of tokens) {
      for (const [rollIndex] of tokenJourney.entries()) {
        await host.roll();
        expect(await host.move(token)).toEqual({ ok: true });
        const won = token === tokens.length - 1 && rollIndex === tokenJourney.length - 1;
        if (!won) await joiner.roll();
      }
    }
    return game;
  };

  /** Reads the connection's messages up to the one that ended the Game, and returns it. */
  const endOfGame = async (connection: Connection) => {
    for (;;) {
      const message = await connection.nextMessage();
      if (message.event === "game" && message.game.state !== "playing") return message;
    }
  };

  it("ends the Game when a Seat's last Token reaches Home, showing everyone its Player as the winner", async () => {
    const { host, joiner } = await gameWonByHost();

    const home = { area: "home" };
    const ended = {
      state: "won",
      board: {
        seats: [{ playerName: "Luna Lovegood", tokens: [home, home, home, home] }, {}, {}, {}],
        winner: 0,
        lastMove: { seat: 0, token: 3, from: { area: "homeColumn", cell: 3 }, to: home },
        moves: [],
      },
    };
    expect(await endOfGame(host)).toMatchObject({ event: "game", game: ended });
    expect(await endOfGame(joiner)).toMatchObject({ event: "game", game: ended });
  });

  it("leaves its Players with no active Game, so a Roll or a Move is refused, and they can start another", async () => {
    const { host, joiner } = await gameWonByHost();

    expect(await joiner.roll()).toEqual({ ok: false, reason: "noActiveGame" });
    expect(await host.move(0)).toEqual({ ok: false, reason: "noActiveGame" });
    const reply = await host.createGame("Luna Lovegood");
    if (!reply.ok || !reply.game.gameCode) throw new Error("The Game wasn't created");
    expect(await joiner.joinGame(reply.game.gameCode, "Ginny Weasley")).toMatchObject({ ok: true });
  });

  it("sends a Player reconnecting after it that they have no active Game", async () => {
    const { hostPlayer, joinerPlayer } = await gameWonByHost();

    expect(await (await hostPlayer.connect()).nextMessage()).toEqual({ event: "noActiveGame" });
    expect(await (await joinerPlayer.connect()).nextMessage()).toEqual({ event: "noActiveGame" });
  });
});
