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
const track = (cell: number) => ({ area: "track", cell });

// A Token's whole 56-Cell journey Home, out on a 6, then nine 6s and a 2, every one of which earns another Roll.
const tokenJourney = [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2];

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
    // The Host brings a Token out on a 6, which earns another Roll, then Rolls a 3.
    const { host, joiner } = await gameInPlay(6, 3);
    await host.roll();
    await host.move(2);
    await host.roll();
    await readMessages(host, 3);
    await readMessages(joiner, 3);

    const reply = await host.move(2);

    expect(reply).toEqual({ ok: true });
    const board = {
      seats: [{ tokens: [yard, yard, track(3), yard] }, {}, { tokens: [yard, yard, yard, yard] }, {}],
      turn: 2,
      rolled: false,
      lastRoll: { seat: 0, number: 3 },
      lastMove: { seat: 0, token: 2, from: track(0), to: track(3) },
      moves: [],
      extraRoll: false,
    };
    expect(await host.nextMessage()).toMatchObject({ game: { board } });
    expect(await joiner.nextMessage()).toMatchObject({ game: { board } });
  });

  it("is still the Player's choice when only one Move is legal", async () => {
    // The Host brings a Token out on a 6, which earns another Roll, then Rolls a 3, which can Move only that one.
    const { host } = await gameInPlay(6, 3);
    await host.roll();
    await host.move(0);
    await readMessages(host, 2);

    await host.roll();

    expect(await host.nextMessage()).toMatchObject({
      game: { board: { turn: 0, rolled: true, lastRoll: { seat: 0, number: 3 }, moves: [0] } },
    });
  });

  it("takes a Token on from its Start cell along the Track", async () => {
    const { host } = await gameInPlay(6, 4);
    await host.roll();
    await host.move(3);
    await host.roll();

    await host.move(3);

    const [message] = (await readMessages(host, 4)).slice(-1);
    const tokens = [yard, yard, yard, track(4)];
    expect(message).toMatchObject({ game: { board: { seats: [{ tokens }, {}, {}, {}] } } });
  });
});

describe("Capturing", () => {
  it("sends the Token a Move lands on back to its Yard, showing everyone which, and earns a Roll", async () => {
    // The Host's 1 passes. The joiner brings a Token out on a 6, then on a 3, to Cell 29, which isn't a Safe cell.
    // Then the Host brings a Token out on a 6, and on four more 6s, to Cell 24, and Rolls a 5.
    const { host, joiner } = await gameInPlay(1, 6, 3, 6, 6, 6, 6, 6, 5);
    await host.roll();
    for (let move = 0; move < 2; move++) {
      await joiner.roll();
      await joiner.move(0);
    }
    for (let move = 0; move < 5; move++) {
      await host.roll();
      await host.move(0);
    }
    await host.roll();
    await readMessages(host, 16);
    await readMessages(joiner, 16);

    await host.move(0);

    const board = {
      seats: [{ tokens: [track(29), yard, yard, yard] }, {}, { tokens: [yard, yard, yard, yard] }, {}],
      turn: 0,
      rolled: false,
      lastMove: { seat: 0, token: 0, from: track(24), to: track(29), captured: [{ seat: 2, token: 0 }] },
      extraRoll: true,
    };
    expect(await host.nextMessage()).toMatchObject({ game: { board } });
    expect(await joiner.nextMessage()).toMatchObject({ game: { board } });
  });
});

describe("extra Rolls", () => {
  it("let a Player Roll again after each 6, with no limit, until a Move that earns none passes the Turn", async () => {
    const { host, joiner } = await gameInPlay(6, 6, 6, 4);
    const moves = [];
    for (const token of [0, 1, 0, 0]) {
      expect(await host.roll()).toEqual({ ok: true });
      expect(await host.move(token)).toEqual({ ok: true });
      moves.push((await readMessages(host, 2))[1]);
    }

    const afterEach = [[track(0), yard], [track(0), track(0)], [track(6), track(0)], [track(10), track(0)]];
    expect(moves).toMatchObject(afterEach.map(([first, second], move) => {
      const seats = [{ tokens: [first, second, yard, yard] }, {}, {}, {}];
      return { game: { board: { seats, turn: move < 3 ? 0 : 2, rolled: false, extraRoll: move < 3 } } };
    }));
    expect((await readMessages(joiner, 8)).at(-1)).toMatchObject({ game: { board: { turn: 2, rolled: false } } });
  });

  it("show everyone the Player Rolls again, the Move's Seat still to Roll on its Turn", async () => {
    const { host, joiner } = await gameInPlay(6);
    await host.roll();
    await joiner.nextMessage();

    await host.move(0);

    const board = { turn: 0, rolled: false, lastRoll: { seat: 0, number: 6 }, lastMove: { seat: 0 }, extraRoll: true };
    expect(await joiner.nextMessage()).toMatchObject({ game: { board } });
    expect(await joiner.roll()).toEqual({ ok: false, reason: "notYourTurn" });
  });

  it("come after a Move that brings a Token Home, but not after a 6 no Token can Move by", async () => {
    // All in one Turn, as each Move earns another Roll: the Host brings three Tokens Home, each out on a 6, then nine
    // 6s and a 2, then Token 3 out and on nine 6s, to 2 Cells short of Home. Then the 6 can't Move it.
    const rolls = [...[0, 1, 2].flatMap(() => tokenJourney), ...tokenJourney.slice(0, -1), 6];
    const { host, joiner } = await gameInPlay(...rolls);
    for (const token of [0, 1, 2]) {
      for (let roll = 0; roll < tokenJourney.length; roll++) {
        await host.roll();
        expect(await host.move(token)).toEqual({ ok: true });
      }
      expect((await readMessages(joiner, 2 * tokenJourney.length)).at(-1)).toMatchObject({
        game: { board: { turn: 0, lastMove: { to: { area: "home" } }, extraRoll: true } },
      });
    }
    for (let roll = 0; roll < tokenJourney.length - 1; roll++) {
      await host.roll();
      expect(await host.move(3)).toEqual({ ok: true });
    }
    await readMessages(joiner, 2 * (tokenJourney.length - 1));

    expect(await host.roll()).toEqual({ ok: true });

    expect(await joiner.nextMessage()).toMatchObject({
      game: { board: { turn: 2, rolled: false, lastRoll: { seat: 0, number: 6 }, moves: [], extraRoll: false } },
    });
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
    // The Host brings Token 0 out on a 6, which earns another Roll, then the Host's 3 can Move only Token 0.
    const { host } = await gameInPlay(6, 3);
    await host.roll();
    await host.move(0);
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
  const tokens = [0, 1, 2, 3];

  /**
   * A 2-Player Game in which the Host brings all their Tokens Home, one after another, in their first Turn, as each
   * Move earns another Roll, with every message sent during it unread.
   */
  const gameWonByHost = async () => {
    const game = await gameInPlay(...tokens.flatMap(() => tokenJourney));
    const { host } = game;
    for (const token of tokens) {
      for (let roll = 0; roll < tokenJourney.length; roll++) {
        await host.roll();
        expect(await host.move(token)).toEqual({ ok: true });
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

describe("Leaving during play", () => {
  /**
   * A 3-Player Game in play: the Host in Seat 0, the second to join in Seat 2 and the third in Seat 1, with the
   * Host's Turn first, the Rolls scripted to be these in turn, then 1s, and everything sent so far already read.
   */
  const gameOfThreeInPlay = async (...rolls: number[]) => {
    server = await server.restartWithRandomNumbers(42, 0, ...rolls.map((roll) => roll - 1));
    const thirdPlayer = server.createPlayer();
    const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood" });
    const second = await server.playerInLobby(gameCode, { playerName: "Ginny Weasley" });
    const third = await server.playerInLobby(gameCode, { playerName: "Neville Longbottom", player: thirdPlayer });
    await host.startGame();
    await readMessages(host, 3);
    await readMessages(second, 2);
    await third.nextMessage();
    return { host, second, third, thirdPlayer };
  };

  it("takes the Leaver's Tokens off the Board and leaves their Seat empty, showing everyone", async () => {
    const { host, second, third } = await gameOfThreeInPlay();

    const reply = await third.leaveGame();

    expect(reply).toEqual({ ok: true });
    const game = {
      state: "playing",
      players: [{ playerName: "Luna Lovegood", isHost: true }, { playerName: "Ginny Weasley", isHost: false }],
      board: {
        seats: [
          { playerName: "Luna Lovegood", left: false, tokens: [yard, yard, yard, yard] },
          { playerName: "Neville Longbottom", left: true, tokens: [] },
          { playerName: "Ginny Weasley", left: false, tokens: [yard, yard, yard, yard] },
          { playerName: null, left: false, tokens: [] },
        ],
        turn: 0,
        winner: null,
      },
    };
    expect(await host.nextMessage()).toMatchObject({ event: "game", game });
    expect(await second.nextMessage()).toMatchObject({ event: "game", game });
  });

  it("tells every tab of the Leaver's that they have no active Game, leaving them free to start another", async () => {
    const { third, thirdPlayer } = await gameOfThreeInPlay();
    const otherTab = await thirdPlayer.connect();
    await otherTab.nextMessage();

    await third.leaveGame();

    expect(await third.nextMessage()).toEqual({ event: "noActiveGame" });
    expect(await otherTab.nextMessage()).toEqual({ event: "noActiveGame" });
    expect(await third.roll()).toEqual({ ok: false, reason: "noActiveGame" });
    expect(await third.createGame("Neville Longbottom")).toMatchObject({ ok: true, game: { state: "lobby" } });
  });

  it.each([
    ["before", false],
    ["after", true],
  ])("passes the Turn to the next taken Seat clockwise, if it was the Leaver's, %s they Rolled", async (_, rolled) => {
    // A 6, so a Roll leaves the Host a Move to make.
    const { host, second, third } = await gameOfThreeInPlay(6);
    if (rolled) {
      expect(await host.roll()).toEqual({ ok: true });
      await second.nextMessage();
    }

    await host.leaveGame();

    expect(await second.nextMessage()).toMatchObject({ game: { state: "playing", board: { turn: 1, rolled: false } } });
    expect(await third.roll()).toEqual({ ok: true });
  });

  it("skips the Leaver's empty Seat in the Turns from then on", async () => {
    // Every Roll is a 1, which can't bring a Token out, so each Turn passes.
    const { host, second, third } = await gameOfThreeInPlay();
    await third.leaveGame();

    const replies = [await host.roll(), await second.roll(), await host.roll()];

    expect(replies).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
  });

  it("makes the last Player remaining the winner, even mid-Turn, and ends the Game, freeing them", async () => {
    const { host, joiner, joinerPlayer } = await gameInPlay(6);
    await host.roll();
    await joiner.nextMessage();

    await host.leaveGame();

    expect(await joiner.nextMessage()).toMatchObject({
      event: "game",
      game: {
        state: "won",
        players: [{ playerName: "Ginny Weasley", isHost: false }],
        board: {
          seats: [{ playerName: "Luna Lovegood", left: true, tokens: [] }, {}, { playerName: "Ginny Weasley" }, {}],
          turn: 2,
          rolled: false,
          moves: [],
          winner: 2,
        },
      },
    });
    expect(await (await joinerPlayer.connect()).nextMessage()).toEqual({ event: "noActiveGame" });
    expect(await joiner.createGame("Ginny Weasley")).toMatchObject({ ok: true, game: { state: "lobby" } });
  });

  it("goes on while 2 or more Players remain", async () => {
    const { host, second, third } = await gameOfThreeInPlay();

    await third.leaveGame();

    expect(await host.nextMessage()).toMatchObject({ game: { state: "playing", board: { winner: null } } });
    expect(await second.leaveGame()).toEqual({ ok: true });
    expect(await host.nextMessage()).toMatchObject({ game: { state: "won", board: { winner: 0 } } });
  });
});
