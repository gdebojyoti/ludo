import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { handshake, startServer, type TestServer } from "./testing.js";

let server: TestServer;

beforeEach(async () => {
  server = await startServer();
});

afterEach(async () => {
  await server.close();
});

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("the player ID cookie", () => {
  it("is issued to a browser connecting for the first time", async () => {
    const response = await handshake(server.url);

    const [setCookie, ...others] = response.headers.getSetCookie();
    expect(others).toEqual([]);
    const [pair = "", ...attributes] = setCookie?.split("; ") ?? [];
    const [name, value = ""] = pair.split("=");
    expect(name).toBe("ludo-player-id");
    expect(value).toMatch(uuid);
    expect(attributes).toEqual(expect.arrayContaining(["Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=31536000"]));
    // Host-only, so it's never shared with the other games on the parent domain; and not Secure over plain HTTP.
    expect(attributes.some((attribute) => /^(Domain|Secure)\b/i.test(attribute))).toBe(false);
  });

  it("is Secure when the browser connects over HTTPS through a proxy, as in production", async () => {
    const response = await handshake(server.url, { "x-forwarded-proto": "https" });

    expect(response.headers.getSetCookie()[0]?.split("; ")).toContain("Secure");
  });

  it("gives each new browser a different ID", async () => {
    const first = await handshake(server.url);
    const second = await handshake(server.url);

    expect(first.headers.getSetCookie()[0]).not.toBe(second.headers.getSetCookie()[0]);
  });

  it("isn't issued again to a browser that already has one", async () => {
    const response = await handshake(server.url, { cookie: "ludo-player-id=0b5d4c0e-7a51-4f7e-9a3e-2f6c1d8b9e10" });

    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("is replaced if it isn't a valid player ID", async () => {
    const response = await handshake(server.url, { cookie: "ludo-player-id=not-an-id" });

    expect(response.headers.getSetCookie()[0]).toMatch(/^ludo-player-id=[0-9a-f-]{36};/);
  });

  it("identifies a Player by the same ID when they come back, as when they Rejoin after a refresh", async () => {
    const player = server.createPlayer();
    const firstTab = await player.connect();
    const playerId = player.playerId();
    expect(playerId).toMatch(uuid);
    expect(await server.connectedPlayerIds()).toEqual([playerId]);
    await firstTab.close();

    await player.connect();

    expect(player.playerId()).toBe(playerId);
    expect(await server.connectedPlayerIds()).toEqual([playerId]);
  });
});
