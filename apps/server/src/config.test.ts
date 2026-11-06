import { describe, expect, it } from "vitest";
import { readConfig } from "./config.js";

describe("readConfig", () => {
  it("uses local development defaults when nothing is set", () => {
    expect(readConfig({})).toEqual({
      port: 4003,
      webOrigins: ["http://localhost:8083"],
      webAppUrl: "http://localhost:8083/ludo",
    });
  });

  it("reads the port, web address and web app's address from the environment", () => {
    expect(readConfig({
      PORT: "10000",
      WEB_ORIGIN: "https://tablehop.games",
      WEB_APP_URL: "https://tablehop.games/ludo",
    })).toEqual({ port: 10000, webOrigins: ["https://tablehop.games"], webAppUrl: "https://tablehop.games/ludo" });
  });

  it("reads several web addresses separated by commas", () => {
    expect(readConfig({ WEB_ORIGIN: "https://tablehop.games, https://www.tablehop.games," }).webOrigins)
      .toEqual(["https://tablehop.games", "https://www.tablehop.games"]);
  });

  it("rejects a port that is not a whole number", () => {
    expect(() => readConfig({ PORT: "abc" })).toThrow('PORT must be a port number, got "abc"');
  });

  it("drops a trailing slash from the web app's address", () => {
    expect(readConfig({ WEB_APP_URL: "https://tablehop.games/ludo/" }).webAppUrl).toBe("https://tablehop.games/ludo");
  });

  it("refuses to start on Render without the web app's address, so Players are never sent to localhost", () => {
    expect(() => readConfig({ RENDER: "true" })).toThrow("WEB_APP_URL must be set on Render");
  });
});
