import { describe, expect, it } from "vitest";

import { captureReturnFor, movePlaysOutFor, restFor, stepEvery } from "./playout.js";

describe("movePlaysOutFor", () => {
  it("is a step for each Cell, then the rest, for a Move that Captures nothing", () => {
    expect(movePlaysOutFor({ area: "track", cell: 10 }, 5, false)).toBe(5 * stepEvery + restFor);
  });

  it("is one step for a Token leaving its Yard", () => {
    expect(movePlaysOutFor({ area: "yard" }, 6, false)).toBe(stepEvery + restFor);
  });

  it("waits for Captured Tokens to return to their Yards", () => {
    expect(movePlaysOutFor({ area: "track", cell: 10 }, 5, true)).toBe(5 * stepEvery + captureReturnFor + restFor);
  });
});
