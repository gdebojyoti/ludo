import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { startServer, type TestServer } from "./testing.js";

let server: TestServer;

beforeEach(async () => {
  server = await startServer();
});

afterEach(async () => {
  await server.close();
});

describe("a command sent without a callback", () => {
  it("is dropped, and the Player's connection keeps working", async () => {
    const tab = await server.createPlayer().connect();

    tab.sendUnchecked("ping");

    expect(await tab.ping()).toBe("pong");
  });
});
