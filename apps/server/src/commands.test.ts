import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ClientToServerEvents } from "@ludo/shared";

import { startServer, type Connection, type TestServer } from "./testing.js";

let server: TestServer;

beforeEach(async () => {
  server = await startServer();
});

afterEach(async () => {
  await server.close();
});

/** Sends a command with these arguments, unchecked, and waits for its reply. */
const sendForReply = (tab: Connection, event: keyof ClientToServerEvents, ...args: unknown[]) => {
  return new Promise((resolve) => tab.sendUnchecked(event, ...args, resolve));
};

describe("a command sent without a callback", () => {
  it("is dropped, and the Player's connection keeps working", async () => {
    const tab = await server.createPlayer().connect();

    tab.sendUnchecked("ping");

    expect(await tab.ping()).toBe("pong");
  });
});

describe("a command sent with an extra argument before its callback", () => {
  it.each([
    { event: "ping", args: [], reply: "pong" },
    { event: "startGame", args: [], reply: { ok: false, reason: "noActiveGame" } },
    { event: "leaveGame", args: [], reply: { ok: false, reason: "noActiveGame" } },
    { event: "roll", args: [], reply: { ok: false, reason: "noActiveGame" } },
    { event: "move", args: [0], reply: { ok: false, reason: "noActiveGame" } },
  ] as const)("is answered for $event, and the server keeps running", async ({ event, args, reply }) => {
    const tab = await server.playerWithNoGame();

    expect(await sendForReply(tab, event, ...args, "oops")).toEqual(reply);

    expect(await tab.ping()).toBe("pong");
    expect(await (await server.createPlayer().connect()).ping()).toBe("pong");
  });

  it("creates the Game for createGame, ignoring the extra argument", async () => {
    const tab = await server.playerWithNoGame();

    const reply = await sendForReply(tab, "createGame", "Luna Lovegood", "oneKillWin", "oops");

    expect(reply).toMatchObject({ ok: true, game: { mode: "oneKillWin" } });
  });

  it("joins the Game for joinGame, ignoring the extra argument", async () => {
    const { gameCode } = await server.hostInLobby();
    const tab = await server.playerWithNoGame();

    const reply = await sendForReply(tab, "joinGame", gameCode, "Ginny Weasley", "oops");

    expect(reply).toMatchObject({ ok: true, game: { gameCode } });
  });
});

describe("a command that fails on the server", () => {
  it("is answered as a server error, and the server keeps running", async () => {
    // Creating a Game draws its Game code, so this server's createGame always fails.
    const failing = await startServer({
      randomInt: () => {
        throw new Error("No random numbers left");
      },
    });
    const tab = await failing.playerWithNoGame();

    try {
      expect(await tab.createGame("Luna Lovegood")).toEqual({ ok: false, reason: "serverError" });
      expect(await tab.ping()).toBe("pong");
    } finally {
      await failing.close();
    }
  });
});
