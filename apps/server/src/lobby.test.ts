import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startServer, type Player, type TestServer } from "./testing.js";

let server: TestServer;

beforeEach(async () => {
  server = await startServer();
});

afterEach(async () => {
  await server.close();
});

/** What the server first sends the Player when they open a new tab. */
const messageOnReturn = async (player: Player) => (await player.connect()).nextMessage();

describe("connecting", () => {
  it("tells a Player with no active Game that they have none", async () => {
    const tab = await server.createPlayer().connect();

    expect(await tab.nextMessage()).toEqual({ event: "noActiveGame" });
  });
});

describe("creating a Game", () => {
  it("puts the Player in the Lobby as its Host, with a six-digit Game code", async () => {
    const tab = await server.playerWithNoGame();

    const reply = await tab.createGame("Luna Lovegood");

    expect(reply).toEqual({
      ok: true,
      game: {
        state: "lobby",
        gameCode: expect.stringMatching(/^\d{6}$/),
        isHost: true,
        players: [{ playerName: "Luna Lovegood", isHost: true, away: false }],
        board: null,
      },
    });
  });

  it("gives each Game in the Lobby its own zero-padded Game code, picked at random", async () => {
    server = await server.restartWithRandomNumbers(42, 42, 7);

    const first = await server.hostInLobby({ playerName: "Luna Lovegood" });
    const second = await server.hostInLobby({ playerName: "Ginny Weasley" });

    expect(first.gameCode).toBe("000042");
    expect(second.gameCode).toBe("000007");
  });

  it("sends the Lobby to every tab the Player has open", async () => {
    const player = server.createPlayer();
    const tab = await server.playerWithNoGame(player);
    const otherTab = await server.playerWithNoGame(player);

    const reply = await tab.createGame("Luna Lovegood");

    expect(reply.ok).toBe(true);
    expect(await tab.nextMessage()).toEqual({ event: "game", game: reply.ok && reply.game });
    expect(await otherTab.nextMessage()).toEqual({ event: "game", game: reply.ok && reply.game });
  });

  it("is refused while the Player is already in an active Game, the Lobby included", async () => {
    const { host } = await server.hostInLobby();

    const reply = await host.createGame("Luna Lovegood");

    expect(reply).toEqual({ ok: false, reason: "alreadyInActiveGame" });
  });

  it("is refused the second time when a Player asks twice at once", async () => {
    const tab = await server.playerWithNoGame();

    const replies = await Promise.all([tab.createGame("Luna Lovegood"), tab.createGame("Luna Lovegood")]);

    expect(replies).toEqual([
      { ok: true, game: expect.objectContaining({ state: "lobby" }) },
      { ok: false, reason: "alreadyInActiveGame" },
    ]);
  });
});

describe("the Player name sent when creating a Game", () => {
  it("is trimmed", async () => {
    const tab = await server.playerWithNoGame();

    const reply = await tab.createGame("  Neville Longbottom\n");

    expect(reply).toMatchObject({ ok: true, game: { players: [{ playerName: "Neville Longbottom" }] } });
  });

  it.each([
    ["empty", ""],
    ["only spaces", "   "],
    ["31 characters long", "A".repeat(31)],
  ])("is refused when it's %s, and no Game is created", async (_, playerName) => {
    const player = server.createPlayer();
    const tab = await server.playerWithNoGame(player);

    const reply = await tab.createGame(playerName);

    expect(reply).toEqual({ ok: false, reason: "invalidPlayerName" });
    expect(await messageOnReturn(player)).toEqual({ event: "noActiveGame" });
  });

  it("can be 30 characters long, counting each character once however it's encoded", async () => {
    const tab = await server.playerWithNoGame();

    const longest = await tab.createGame(`  ${"🦉".repeat(30)}  `);

    expect(longest).toMatchObject({ ok: true, game: { players: [{ playerName: "🦉".repeat(30) }] } });
  });
});

describe("the Player name sent when joining a Game", () => {
  it("is trimmed", async () => {
    const { gameCode } = await server.hostInLobby();
    const tab = await server.playerWithNoGame();

    const reply = await tab.joinGame(gameCode, "  Neville Longbottom\n");

    expect(reply).toMatchObject({ ok: true, game: { players: [{}, { playerName: "Neville Longbottom" }] } });
  });

  it.each([
    ["empty", ""],
    ["only spaces", "   "],
    ["31 characters long", "A".repeat(31)],
  ])("is refused when it's %s, and the Player isn't added", async (_, playerName) => {
    const hostPlayer = server.createPlayer();
    const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood", player: hostPlayer });
    const player = server.createPlayer();
    const tab = await server.playerWithNoGame(player);

    const reply = await tab.joinGame(gameCode, playerName);
    await host.close();

    expect(reply).toEqual({ ok: false, reason: "invalidPlayerName" });
    expect(await messageOnReturn(player)).toEqual({ event: "noActiveGame" });
    expect(await messageOnReturn(hostPlayer)).toMatchObject({ game: { players: [{ playerName: "Luna Lovegood" }] } });
  });
});

describe("creating a Game in a way a well-behaved client wouldn't", () => {
  it.each([
    ["a number", 42],
    ["null", null],
    ["an object", { playerName: "Luna Lovegood" }],
  ])("is refused when the Player name is %s", async (_, playerName) => {
    const tab = await server.playerWithNoGame();

    const reply = await new Promise((resolve) => tab.sendUnchecked("createGame", playerName, resolve));

    expect(reply).toEqual({ ok: false, reason: "invalidPlayerName" });
  });

  it("is refused when it has a callback but no Player name, and the server carries on", async () => {
    const tab = await server.playerWithNoGame();

    const reply = await new Promise((resolve) => tab.sendUnchecked("createGame", resolve));

    expect(reply).toEqual({ ok: false, reason: "invalidPlayerName" });
    expect(await tab.createGame("Luna Lovegood")).toMatchObject({ ok: true });
  });

  it("is ignored when it has no callback", async () => {
    const player = server.createPlayer();
    const firstVisit = await server.playerWithNoGame(player);

    firstVisit.sendUnchecked("createGame", "Luna Lovegood");
    await firstVisit.close();

    expect(await messageOnReturn(player)).toEqual({ event: "noActiveGame" });
  });
});

describe("joining a Game", () => {
  it("puts the Player in the Lobby after the Host, and sends everyone the Players in join order", async () => {
    const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood" });
    const tab = await server.playerWithNoGame();

    const reply = await tab.joinGame(gameCode, "Ginny Weasley");

    const players = [
      { playerName: "Luna Lovegood", isHost: true, away: false },
      { playerName: "Ginny Weasley", isHost: false, away: false },
    ];
    expect(reply).toEqual({ ok: true, game: { state: "lobby", gameCode, isHost: false, players, board: null } });
    expect(await tab.nextMessage()).toEqual({ event: "game", game: reply.ok && reply.game });
    expect(await host.nextMessage()).toEqual({
      event: "game",
      game: { state: "lobby", gameCode, isHost: true, players, board: null },
    });
  });

  it("is refused when no Game in the Lobby has the Game code, and the Player stays without one", async () => {
    server = await server.restartWithRandomNumbers(42);
    await server.hostInLobby();
    const player = server.createPlayer();
    const tab = await server.playerWithNoGame(player);

    const reply = await tab.joinGame("000043", "Ginny Weasley");

    expect(reply).toEqual({ ok: false, reason: "gameCodeNotFound" });
    expect(await messageOnReturn(player)).toEqual({ event: "noActiveGame" });
  });

  it.each([
    ["the Host of this Game", "host"],
    ["a Player who has joined it", "joiner"],
    ["the Host of another Game", "otherHost"],
  ] as const)("is refused for %s, as a Player can be in only one active Game", async (_, who) => {
    const { host, gameCode } = await server.hostInLobby();
    const joiner = await server.playerWithNoGame();
    await joiner.joinGame(gameCode, "Ginny Weasley");
    const { host: otherHost } = await server.hostInLobby();
    const tabs = { host, joiner, otherHost };

    const reply = await tabs[who].joinGame(gameCode, "Neville Longbottom");

    expect(reply).toEqual({ ok: false, reason: "alreadyInActiveGame" });
  });

  it("is refused once 4 Players are in, as if there were no Game with the Game code", async () => {
    const { gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood" });
    await server.playerInLobby(gameCode, { playerName: "Ginny Weasley" });
    await server.playerInLobby(gameCode, { playerName: "Neville Longbottom" });
    const fourth = await server.playerWithNoGame();
    const fifth = await server.playerWithNoGame();

    const fourthReply = await fourth.joinGame(gameCode, "Hermione Granger");
    const fifthReply = await fifth.joinGame(gameCode, "Ron Weasley");

    expect(fourthReply).toMatchObject({
      ok: true,
      game: { players: [{}, {}, {}, { playerName: "Hermione Granger" }] },
    });
    expect(fifthReply).toEqual({ ok: false, reason: "gameCodeNotFound" });
  });

  it("gives the last place to only one of two Players joining at once", async () => {
    const { gameCode } = await server.hostInLobby();
    await server.playerInLobby(gameCode);
    await server.playerInLobby(gameCode);
    const first = await server.playerWithNoGame();
    const second = await server.playerWithNoGame();

    const replies = await Promise.all([
      first.joinGame(gameCode, "Ron Weasley"),
      second.joinGame(gameCode, "Draco Malfoy"),
    ]);

    expect(replies).toEqual([
      { ok: true, game: expect.objectContaining({ state: "playing" }) },
      { ok: false, reason: "gameCodeNotFound" },
    ]);
  });

  it("is refused once the Host has cancelled the Game", async () => {
    const { host, gameCode } = await server.hostInLobby();
    await host.leaveGame();
    const tab = await server.playerWithNoGame();

    expect(await tab.joinGame(gameCode, "Ginny Weasley")).toEqual({ ok: false, reason: "gameCodeNotFound" });
  });
});

describe("joining a Game in a way a well-behaved client wouldn't", () => {
  it.each([
    ["too short", "00042"],
    ["too long", "0000042"],
    ["not only digits", "00004a"],
    ["padded with spaces", " 000042"],
  ])("is refused when the Game code is %s", async (_, gameCode) => {
    server = await server.restartWithRandomNumbers(42);
    await server.hostInLobby();
    const tab = await server.playerWithNoGame();

    expect(await tab.joinGame(gameCode, "Ginny Weasley")).toEqual({ ok: false, reason: "gameCodeNotFound" });
  });

  it.each([
    ["a number", 42],
    ["null", null],
    ["an object", { gameCode: "000042" }],
  ])("is refused when the Game code is %s", async (_, gameCode) => {
    server = await server.restartWithRandomNumbers(42);
    await server.hostInLobby();
    const tab = await server.playerWithNoGame();

    const reply = await new Promise((resolve) => tab.sendUnchecked("joinGame", gameCode, "Ginny Weasley", resolve));

    expect(reply).toEqual({ ok: false, reason: "gameCodeNotFound" });
  });

  it.each([
    ["a number", 42],
    ["null", null],
  ])("is refused when the Player name is %s", async (_, playerName) => {
    const { gameCode } = await server.hostInLobby();
    const tab = await server.playerWithNoGame();

    const reply = await new Promise((resolve) => tab.sendUnchecked("joinGame", gameCode, playerName, resolve));

    expect(reply).toEqual({ ok: false, reason: "invalidPlayerName" });
  });

  it.each([
    ["a Game code but no Player name", ["000042"]],
    ["nothing else", []],
  ])("is refused when it has a callback and %s, and the server carries on", async (_, args) => {
    server = await server.restartWithRandomNumbers(42);
    const { gameCode } = await server.hostInLobby();
    const tab = await server.playerWithNoGame();

    const reply = await new Promise((resolve) => tab.sendUnchecked("joinGame", ...args, resolve));

    expect(reply).toEqual({ ok: false, reason: "invalidPlayerName" });
    expect(await tab.joinGame(gameCode, "Ginny Weasley")).toMatchObject({ ok: true });
  });

  it("is ignored when it has no callback", async () => {
    const { gameCode } = await server.hostInLobby();
    const player = server.createPlayer();
    const firstVisit = await server.playerWithNoGame(player);

    firstVisit.sendUnchecked("joinGame", gameCode, "Ginny Weasley");
    await firstVisit.close();

    expect(await messageOnReturn(player)).toEqual({ event: "noActiveGame" });
  });
});

describe("connecting while in the Lobby", () => {
  it("brings a Host who comes back to the same Lobby, with the same Game code", async () => {
    const player = server.createPlayer();
    const firstVisit = await server.playerWithNoGame(player);
    const created = await firstVisit.createGame("Luna Lovegood");
    await firstVisit.close();

    const message = await messageOnReturn(player);

    expect(created.ok).toBe(true);
    expect(message).toEqual({ event: "game", game: created.ok && created.game });
  });

  it("doesn't put a different Player into someone else's Lobby", async () => {
    await server.hostInLobby();

    expect(await messageOnReturn(server.createPlayer())).toEqual({ event: "noActiveGame" });
  });
});

describe("a Player who isn't the Host Leaving the Lobby", () => {
  it("removes them, and sends the others the Lobby without them, in join order", async () => {
    const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood" });
    const leaver = await server.playerInLobby(gameCode, { playerName: "Ginny Weasley" });
    const stayer = await server.playerInLobby(gameCode, { playerName: "Neville Longbottom" });
    await host.nextMessage();
    await host.nextMessage();
    await leaver.nextMessage();

    const reply = await leaver.leaveGame();

    expect(reply).toEqual({ ok: true });
    const players = [
      { playerName: "Luna Lovegood", isHost: true, away: false },
      { playerName: "Neville Longbottom", isHost: false, away: false },
    ];
    expect(await host.nextMessage()).toEqual({
      event: "game",
      game: { state: "lobby", gameCode, isHost: true, players, board: null },
    });
    expect(await stayer.nextMessage()).toEqual({
      event: "game",
      game: { state: "lobby", gameCode, isHost: false, players, board: null },
    });
  });

  it("tells every tab of theirs that they have no active Game, leaving them free to join again", async () => {
    const { gameCode } = await server.hostInLobby();
    const player = server.createPlayer();
    const leaver = await server.playerInLobby(gameCode, { player });
    const otherTab = await player.connect();
    await otherTab.nextMessage();

    await leaver.leaveGame();

    expect(await leaver.nextMessage()).toEqual({ event: "noActiveGame" });
    expect(await otherTab.nextMessage()).toEqual({ event: "noActiveGame" });
    expect(await leaver.joinGame(gameCode, "Ginny Weasley")).toMatchObject({ ok: true });
  });

  it("opens up their place, so it takes one more Player joining to fill the Lobby", async () => {
    const { gameCode } = await server.hostInLobby();
    await server.playerInLobby(gameCode);
    const leaver = await server.playerInLobby(gameCode);
    await leaver.leaveGame();
    await server.playerInLobby(gameCode);
    const tab = await server.playerWithNoGame();

    expect(await tab.joinGame(gameCode, "Ron Weasley")).toMatchObject({ ok: true, game: { state: "playing" } });
  });
});

describe("the Host Leaving the Lobby", () => {
  it("cancels the Game, and sends every tab of the Host the cancelled Game, with no Game code", async () => {
    const player = server.createPlayer();
    const { host } = await server.hostInLobby({ playerName: "Luna Lovegood", player });
    const otherTab = await player.connect();
    await otherTab.nextMessage();

    const reply = await host.leaveGame();

    expect(reply).toEqual({ ok: true });
    const cancelled = {
      event: "game",
      game: {
        state: "cancelled",
        gameCode: null,
        isHost: true,
        players: [{ playerName: "Luna Lovegood", isHost: true, away: false }],
        board: null,
      },
    };
    expect(await host.nextMessage()).toEqual(cancelled);
    expect(await otherTab.nextMessage()).toEqual(cancelled);
  });

  it("sends every other Player the cancelled Game, so they know the Host cancelled it, and frees them", async () => {
    const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood" });
    const joiner = await server.playerInLobby(gameCode, { playerName: "Ginny Weasley" });

    await host.leaveGame();

    expect(await joiner.nextMessage()).toEqual({
      event: "game",
      game: {
        state: "cancelled",
        gameCode: null,
        isHost: false,
        players: [
          { playerName: "Luna Lovegood", isHost: true, away: false },
          { playerName: "Ginny Weasley", isHost: false, away: false },
        ],
        board: null,
      },
    });
    expect(await joiner.createGame("Ginny Weasley")).toMatchObject({ ok: true, game: { state: "lobby" } });
  });

  it("leaves the Host with no active Game, free to create another", async () => {
    const player = server.createPlayer();
    const { host } = await server.hostInLobby({ player });
    await host.leaveGame();
    await host.close();

    const secondVisit = await player.connect();

    expect(await secondVisit.nextMessage()).toEqual({ event: "noActiveGame" });
    expect(await secondVisit.createGame("Luna Lovegood")).toMatchObject({ ok: true, game: { state: "lobby" } });
  });

  it("retires the Game code, so a new Game in the Lobby can be given it", async () => {
    server = await server.restartWithRandomNumbers(42, 42);
    const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood" });
    await host.leaveGame();

    const next = await server.hostInLobby({ playerName: "Ginny Weasley" });

    expect(gameCode).toBe("000042");
    expect(next.gameCode).toBe("000042");
  });

  it("is refused for a Player with no active Game", async () => {
    const { host } = await server.hostInLobby();
    await host.leaveGame();
    const stranger = await server.playerWithNoGame();

    expect(await host.leaveGame()).toEqual({ ok: false, reason: "noActiveGame" });
    expect(await stranger.leaveGame()).toEqual({ ok: false, reason: "noActiveGame" });
  });

  it("is ignored when sent without a callback", async () => {
    const player = server.createPlayer();
    const { host } = await server.hostInLobby({ player });

    host.sendUnchecked("leaveGame");
    await host.close();

    expect(await messageOnReturn(player)).toMatchObject({ event: "game", game: { state: "lobby" } });
  });
});
