import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startServer, type TestServer } from "./testing.js";

let server: TestServer;

beforeEach(async () => {
  server = await startServer();
});

afterEach(async () => {
  await server.close();
});

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
        players: [{ playerName: "Luna Lovegood" }],
      },
    });
  });

  it("gives each Game in the Lobby its own zero-padded Game code, picked at random", async () => {
    await server.close();
    const numbers = [42, 42, 7];
    server = await startServer({ randomInt: () => numbers.shift() ?? 0 });

    const first = await server.hostInLobby("Luna Lovegood");
    const second = await server.hostInLobby("Ginny Weasley");

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

describe("the Player name sent with Create", () => {
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
    expect(await (await player.connect()).nextMessage()).toEqual({ event: "noActiveGame" });
  });

  it("can be 30 characters long, counting each character once however it's encoded", async () => {
    const tab = await server.playerWithNoGame();

    const longest = await tab.createGame(`  ${"🦉".repeat(30)}  `);

    expect(longest).toMatchObject({ ok: true, game: { players: [{ playerName: "🦉".repeat(30) }] } });
  });
});

describe("a Create a well-behaved client wouldn't send", () => {
  it.each([
    ["a number", 42],
    ["null", null],
    ["an object", { playerName: "Luna Lovegood" }],
  ])("is refused when the Player name is %s", async (_, playerName) => {
    const tab = await server.playerWithNoGame();

    const reply = await new Promise((resolve) => tab.sendUnchecked("createGame", playerName, resolve));

    expect(reply).toEqual({ ok: false, reason: "invalidPlayerName" });
  });

  it("is ignored when it has a callback but no Player name, and the server carries on", async () => {
    const player = server.createPlayer();
    const tab = await server.playerWithNoGame(player);

    tab.sendUnchecked("createGame", () => {});

    expect(await tab.createGame("Luna Lovegood")).toMatchObject({ ok: true });
  });

  it("is ignored when it has no callback", async () => {
    const player = server.createPlayer();
    const firstVisit = await server.playerWithNoGame(player);

    firstVisit.sendUnchecked("createGame", "Luna Lovegood");
    await firstVisit.close();

    expect(await (await player.connect()).nextMessage()).toEqual({ event: "noActiveGame" });
  });
});

describe("connecting while in the Lobby", () => {
  it("brings a Host who comes back to the same Lobby, with the same Game code", async () => {
    const player = server.createPlayer();
    const firstVisit = await server.playerWithNoGame(player);
    const created = await firstVisit.createGame("Luna Lovegood");
    await firstVisit.close();

    const secondVisit = await player.connect();

    expect(created.ok).toBe(true);
    expect(await secondVisit.nextMessage()).toEqual({ event: "game", game: created.ok && created.game });
  });

  it("doesn't put a different Player into someone else's Lobby", async () => {
    await server.hostInLobby();

    const other = await server.createPlayer().connect();

    expect(await other.nextMessage()).toEqual({ event: "noActiveGame" });
  });
});

describe("the Host Leaving the Lobby", () => {
  it("cancels the Game, and sends every tab of the Host the cancelled Game, with no Game code", async () => {
    const player = server.createPlayer();
    const { host } = await server.hostInLobby("Luna Lovegood", player);
    const otherTab = await player.connect();
    await otherTab.nextMessage();

    const reply = await host.leaveGame();

    expect(reply).toEqual({ ok: true });
    const cancelled = {
      event: "game",
      game: { state: "cancelled", gameCode: null, isHost: true, players: [{ playerName: "Luna Lovegood" }] },
    };
    expect(await host.nextMessage()).toEqual(cancelled);
    expect(await otherTab.nextMessage()).toEqual(cancelled);
  });

  it("leaves the Host with no active Game, free to create another", async () => {
    const player = server.createPlayer();
    const { host } = await server.hostInLobby("Luna Lovegood", player);
    await host.leaveGame();
    await host.close();

    const secondVisit = await player.connect();

    expect(await secondVisit.nextMessage()).toEqual({ event: "noActiveGame" });
    expect(await secondVisit.createGame("Luna Lovegood")).toMatchObject({ ok: true, game: { state: "lobby" } });
  });

  it("retires the Game code, so a new Game in the Lobby can be given it", async () => {
    await server.close();
    const numbers = [42, 42];
    server = await startServer({ randomInt: () => numbers.shift() ?? 0 });
    const { host, gameCode } = await server.hostInLobby("Luna Lovegood");
    await host.leaveGame();

    const next = await server.hostInLobby("Ginny Weasley");

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
    const { host } = await server.hostInLobby("Luna Lovegood", player);

    host.sendUnchecked("leaveGame");
    await host.close();

    expect(await (await player.connect()).nextMessage()).toMatchObject({ event: "game", game: { state: "lobby" } });
  });
});
