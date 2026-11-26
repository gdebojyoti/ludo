import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startServer, type Connection, type Player, type TestServer } from "./testing.js";

let server: TestServer;

beforeEach(async () => {
  server = await startServer();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await server.close();
});

/** A new browser, signed in to a new Account with this Google name, and the Account's ID. */
const signedIn = (name: string): { player: Player; accountId: string } => {
  const player = server.createPlayer();
  return { player, accountId: player.signIn({ name }) };
};

/**
 * A 3-Player Game in play, with everything sent so far already read: the Host, Luna, signed in, in Seat 0; Neville, a
 * Guest, in Seat 2; and Ginny, signed in, in Seat 1.
 */
const gameWithTwoAccountsAndAGuest = async () => {
  const luna = signedIn("Luna Lovegood");
  const ginny = signedIn("Ginny Weasley");
  const neville = server.createPlayer();
  const { host, gameCode } = await server.hostInLobby({ player: luna.player });
  const guest = await server.playerInLobby(gameCode, { playerName: "Neville Longbottom", player: neville });
  const joiner = await server.playerInLobby(gameCode, { player: ginny.player });
  await host.startGame();
  // Neville joining, Ginny joining, then the Game starting.
  for (const tab of [host, host, host, guest, guest, joiner]) await tab.nextMessage();
  return { host, guest, joiner, neville, lunaId: luna.accountId, ginnyId: ginny.accountId };
};

/** Whether anything the server sent these tabs has any of these Account IDs in it. */
const anySent = (tabs: Connection[], accountIds: string[]) => {
  return tabs.some((tab) => tab.received().some((json) => accountIds.some((accountId) => json.includes(accountId))));
};

describe("a browser signed in through accounts", () => {
  it("is sent its Account as it connects: its Player name, from Google, and its settings", async () => {
    const player = server.createPlayer();
    player.signIn({ name: "Luna Lovegood" });

    const tab = await player.connect();

    expect(await tab.nextAccount()).toEqual({ playerName: "Luna Lovegood", settings: {} });
    expect(await tab.nextMessage()).toEqual({ event: "noActiveGame" });
  });

  it("plays by its Google name, whatever Player name the web app sends", async () => {
    const player = server.createPlayer();
    player.signIn({ name: "Luna Lovegood" });
    const host = await server.playerWithNoGame(player);

    const reply = await host.createGame("Neville Longbottom");

    expect(reply).toMatchObject({ ok: true, game: { players: [{ playerName: "Luna Lovegood", isHost: true }] } });
  });

  it("joins by its Google name too", async () => {
    const { gameCode } = await server.hostInLobby({ playerName: "Neville Longbottom" });
    const player = server.createPlayer();
    player.signIn({ name: "Luna Lovegood" });
    const joiner = await server.playerWithNoGame(player);

    const reply = await joiner.joinGame(gameCode, "Ginny Weasley");

    expect(reply).toMatchObject({
      ok: true,
      game: { players: [{ playerName: "Neville Longbottom" }, { playerName: "Luna Lovegood" }] },
    });
  });

  it("is known by its Account the first time it comes to Ludo, signed in on another TableHop game", async () => {
    // A new browser, with no player ID yet, carrying a Session from another game.
    const player = server.createPlayer();
    const accountId = player.signIn({ name: "Luna Lovegood" });

    const tab = await player.connect();

    expect(await tab.nextAccount()).toMatchObject({ playerName: "Luna Lovegood" });
    expect(server.seenAccounts()).toEqual([accountId]);
  });

  it("is seen once, however often it comes back, from however many browsers", async () => {
    const luna = server.createPlayer();
    const lunaId = luna.signIn({ name: "Luna Lovegood" });
    const ginny = server.createPlayer();
    const ginnyId = ginny.signIn({ name: "Ginny Weasley" });
    const lunaElsewhere = server.createPlayer();
    lunaElsewhere.signIn({ accountId: lunaId, name: "Luna Lovegood" });

    await (await luna.connect()).close();
    await ginny.connect();
    await luna.connect();
    await lunaElsewhere.connect();

    expect(server.seenAccounts()).toEqual([lunaId, ginnyId]);
  });
});

describe("a browser without a Session", () => {
  it("is a Guest, told so as it connects, and plays by the Player name the web app sends", async () => {
    const player = server.createPlayer();
    const tab = await player.connect();

    expect(await tab.nextAccount()).toBeNull();
    await tab.nextMessage();
    expect(await tab.createGame("Neville Longbottom")).toMatchObject({
      ok: true,
      game: { players: [{ playerName: "Neville Longbottom" }] },
    });
    expect(server.seenAccounts()).toEqual([]);
  });

  it("is a Guest when its Session has ended, by a Sign out on another device or by expiring", async () => {
    const player = server.createPlayer();
    player.signIn({ name: "Luna Lovegood" });
    player.endSession();

    const tab = await player.connect();

    expect(await tab.nextAccount()).toBeNull();
    expect(server.seenAccounts()).toEqual([]);
  });

  it("is a Guest when its session cookie holds a Session accounts never made", async () => {
    const player = server.createPlayer();
    player.setCookie("tablehop.session_token", "not-a-session.c2ln");

    const tab = await player.connect();

    expect(await tab.nextAccount()).toBeNull();
  });

  it("is a Guest when its session cookie isn't URL-encoded as accounts encodes it", async () => {
    const player = server.createPlayer();
    player.setCookie("tablehop.session_token", "%E0%A4%A");

    const tab = await player.connect();

    expect(await tab.nextAccount()).toBeNull();
  });
});

describe("a Guest in a Game who signs in", () => {
  it("stays in it, now shown to everyone in it by their Google name", async () => {
    const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood" });
    const guest = server.createPlayer();
    const firstTab = await server.playerInLobby(gameCode, { playerName: "Neville Longbottom", player: guest });
    await host.nextMessage();
    await host.startGame();
    await host.nextMessage();
    await firstTab.close();
    // Away, as the Guest goes to Google and back.
    await host.nextMessage();

    guest.signIn({ name: "Ginny Weasley" });
    const tab = await guest.connect();

    const seen = { seats: [{ playerName: "Luna Lovegood" }, {}, { playerName: "Ginny Weasley", away: false }, {}] };
    expect(await tab.nextMessage()).toMatchObject({ event: "game", game: { state: "playing", board: seen } });
    expect(await host.nextMessage()).toMatchObject({ event: "game", game: { board: seen } });
    expect(await tab.roll()).not.toEqual({ ok: false, reason: "noActiveGame" });
  });

  it("is known by their Account on the Game's result", async () => {
    const { host, gameCode } = await server.hostInLobby({ playerName: "Luna Lovegood" });
    const guest = server.createPlayer();
    await (await server.playerInLobby(gameCode, { player: guest })).close();
    await host.startGame();

    const accountId = guest.signIn({ name: "Ginny Weasley" });
    await guest.connect();
    await host.leaveGame();

    const [result] = await server.gameResults();
    expect(result?.players.map((player) => [player.seat, player.accountId])).toEqual([[0, null], [2, accountId]]);
  });

  it("stays as they were while their browser has no Session, until #66 decides what a Sign out does", async () => {
    const { player, accountId } = signedIn("Luna Lovegood");
    const { host, gameCode } = await server.hostInLobby({ player });
    await server.playerInLobby(gameCode, { playerName: "Neville Longbottom" });
    await host.startGame();
    await host.close();

    player.endSession();
    const tab = await player.connect();

    expect(await tab.nextAccount()).toBeNull();
    expect(await tab.nextMessage()).toMatchObject({ game: { players: [{ playerName: "Luna Lovegood" }, {}] } });
    await tab.leaveGame();
    expect((await server.gameResults())[0]?.players[0]).toMatchObject({ seat: 0, accountId });
  });
});

describe("a finished Game's result", () => {
  it("records the Account of each Player who had one, Leavers included, and nothing for a Guest", async () => {
    const { guest, joiner, lunaId, ginnyId } = await gameWithTwoAccountsAndAGuest();

    await guest.leaveGame();
    await joiner.leaveGame();

    const [result] = await server.gameResults();
    expect(result?.players.map((player) => [player.seat, player.accountId])).toEqual([
      [0, lunaId],
      [1, ginnyId],
      [2, null],
    ]);
  });

  it("records nothing for an AI Player", async () => {
    const { player, accountId } = signedIn("Luna Lovegood");
    const { host, gameCode } = await server.hostInLobby({ player });
    const ai = await server.connectAi();
    await ai.joinGame(gameCode);
    await host.startGame();

    await ai.leaveGame();

    const [result] = await server.gameResults();
    expect(result?.players.map((player) => [player.joinedVia, player.accountId])).toEqual([
      ["webApp", accountId],
      ["mcp", null],
    ]);
  });
});

describe("an Account ID", () => {
  it("is never sent to any Player, in any snapshot or reply, the Account's own included", async () => {
    const { host, guest, joiner, lunaId, ginnyId } = await gameWithTwoAccountsAndAGuest();
    const replies = [await host.roll(), await guest.leaveGame(), await joiner.changeSettings({ autoplay: true })];

    await joiner.leaveGame();

    expect(anySent([host, guest, joiner], [lunaId, ginnyId])).toBe(false);
    expect(JSON.stringify(replies)).not.toMatch(new RegExp(`${lunaId}|${ginnyId}`));
  });

  it("is never in the debug list, in the Lobby, in play or once the Game has ended", async () => {
    const { player, accountId } = signedIn("Luna Lovegood");
    const { host, gameCode } = await server.hostInLobby({ player });
    const inLobby = await server.debugGames();
    const joiner = await server.playerInLobby(gameCode);
    await host.startGame();
    const inPlay = await server.debugGames();

    await joiner.leaveGame();

    for (const { body } of [inLobby, inPlay, await server.debugGames()]) expect(body).not.toContain(accountId);
  });
});

/** The Accounts the server sent a tab, as the JSON they were sent as. */
const accountsSent = (tab: Connection) => tab.received().filter((json) => json.startsWith("[\"account\""));

describe("an Account's settings", () => {
  it("arrive on its other tabs and browsers, the latest change to each winning", async () => {
    const { player, accountId } = signedIn("Luna Lovegood");
    const elsewhere = server.createPlayer();
    elsewhere.signIn({ accountId, name: "Luna Lovegood" });
    const tab = await player.connect();
    const otherTab = await player.connect();
    const otherBrowser = await elsewhere.connect();
    for (const connection of [tab, otherTab, otherBrowser]) await connection.nextAccount();

    expect(await tab.changeSettings({ theme: "heritage", autoplay: true })).toEqual({ ok: true });
    expect(await otherBrowser.changeSettings({ autoplay: false })).toEqual({ ok: true });

    const latest = { playerName: "Luna Lovegood", settings: { theme: "heritage", autoplay: false } };
    for (const connection of [tab, otherTab, otherBrowser]) {
      expect(await connection.nextAccount()).toEqual({ ...latest, settings: { theme: "heritage", autoplay: true } });
      expect(await connection.nextAccount()).toEqual(latest);
    }
  });

  it("arrive on a browser that signs in to the Account later, as it connects", async () => {
    const { player, accountId } = signedIn("Luna Lovegood");
    const tab = await player.connect();
    await tab.changeSettings({ diceOnLeft: true });
    const later = server.createPlayer();
    later.signIn({ accountId, name: "Luna Lovegood" });

    const laterTab = await later.connect();

    expect(await laterTab.nextAccount()).toEqual({ playerName: "Luna Lovegood", settings: { diceOnLeft: true } });
  });

  it("aren't sent to anyone signed in to another Account, or to a Guest", async () => {
    const luna = signedIn("Luna Lovegood");
    const ginny = signedIn("Ginny Weasley");
    const lunaTab = await luna.player.connect();
    const ginnyTab = await ginny.player.connect();
    const guestTab = await server.createPlayer().connect();

    await lunaTab.changeSettings({ theme: "heritage" });
    await ginnyTab.changeSettings({ diceOnLeft: true });

    expect(accountsSent(ginnyTab)).toEqual([
      JSON.stringify(["account", { playerName: "Ginny Weasley", settings: {} }]),
      JSON.stringify(["account", { playerName: "Ginny Weasley", settings: { diceOnLeft: true } }]),
    ]);
    expect(accountsSent(guestTab)).toEqual([JSON.stringify(["account", null])]);
  });

  it("can't be changed by a Guest, whose settings stay in their browser", async () => {
    const tab = await server.createPlayer().connect();

    expect(await tab.changeSettings({ theme: "heritage" })).toEqual({ ok: false, reason: "notSignedIn" });
  });

  it("refuse a change that isn't one, or gives a setting a value it can't have, changing nothing", async () => {
    const { player } = signedIn("Luna Lovegood");
    const tab = await player.connect();
    await tab.nextAccount();

    for (const changed of [null, "heritage", ["heritage"], { theme: "neon" }, { autoplay: "yes", theme: "heritage" }]) {
      expect(await tab.changeSettings(changed as never)).toEqual({ ok: false, reason: "invalidSettings" });
    }
    await tab.changeSettings({ diceOnLeft: true, colour: "red" } as never);
    expect(await tab.nextAccount()).toEqual({ playerName: "Luna Lovegood", settings: { diceOnLeft: true } });
  });
});

describe("the session cookie", () => {
  it("is read under its production name when the server is given it, as on Render", async () => {
    await server.close();
    server = await startServer({}, "__Secure-tablehop.session_token");
    const { player } = signedIn("Luna Lovegood");
    const local = server.createPlayer();
    local.setCookie("tablehop.session_token", "anything");

    expect(await (await player.connect()).nextAccount()).toMatchObject({ playerName: "Luna Lovegood" });
    expect(await (await local.connect()).nextAccount()).toBeNull();
  });

  it("is never logged, and a Session that can't be checked counts as none, so play goes on as a Guest", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await server.close();
    server = await startServer({ checkSession: () => Promise.reject(new Error("Connection terminated unexpectedly")) });
    const player = server.createPlayer();
    player.setCookie("tablehop.session_token", "the-session-token.c2ln");

    const tab = await player.connect();

    expect(await tab.nextAccount()).toBeNull();
    expect(await tab.nextMessage()).toEqual({ event: "noActiveGame" });
    expect(logged).toHaveBeenCalledWith(
      "A Session couldn't be checked, so the Player plays as a Guest:",
      "Connection terminated unexpectedly",
    );
    expect(JSON.stringify(logged.mock.calls)).not.toContain("the-session-token");
  });
});

describe("an Account's Player name", () => {
  it("is its Google name cut to the longest a Player name can be", async () => {
    const { player } = signedIn("  Xenophilius Bartemius Lovegood-Weasley the Third  ");

    const tab = await player.connect();

    expect(await tab.nextAccount()).toMatchObject({ playerName: "Xenophilius Bartemius Lovegood" });
  });

  it("is none when its Google name is only spaces, when the Player plays by the one the web app sends", async () => {
    const { player } = signedIn("   ");
    const tab = await player.connect();

    expect(await tab.nextAccount()).toEqual({ playerName: null, settings: {} });
    await tab.nextMessage();
    expect(await tab.createGame("Neville Longbottom")).toMatchObject({
      game: { players: [{ playerName: "Neville Longbottom" }] },
    });
  });
});
