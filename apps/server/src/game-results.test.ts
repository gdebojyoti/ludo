// The storage contract: one suite, run against every version of the result store, so the in-memory one the server
// tests use can't drift from Postgres.
import { randomUUID } from "node:crypto";

import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createMemoryGameResultStore, type GameResult, type GameResultStore } from "./game-results.js";
import { createPostgresGameResultStore } from "./postgres-game-results.js";
import { createTestPool } from "./testing-database.js";

/** A version of the store to run the suite against, and how to let go of it once the suite is done. */
interface StoreUnderTest {
  store: GameResultStore;
  close: () => Promise<void>;
}

const memoryStore = async (): Promise<StoreUnderTest> => {
  return { store: createMemoryGameResultStore(), close: async () => {} };
};

const postgresStore = async (): Promise<StoreUnderTest> => {
  const pool: pg.Pool = createTestPool();
  return { store: createPostgresGameResultStore(pool), close: () => pool.end() };
};

/** The result of a 3-Player One Kill Win Game, with the ID of a Game of its own. */
const aResult = (): GameResult => ({
  gameId: randomUUID(),
  mode: "oneKillWin",
  turnsPlayed: 27,
  endedAt: "2026-11-26T10:15:30.125Z",
  players: [
    { seat: 0, joinedVia: "webApp", standing: 2, captures: 0, tokensHome: 0, left: false },
    { seat: 1, joinedVia: "mcp", standing: 3, captures: 0, tokensHome: 0, left: true },
    { seat: 2, joinedVia: "webApp", standing: 1, captures: 1, tokensHome: 0, left: false },
  ],
});

describe.each([
  ["in memory", memoryStore],
  ["in Postgres", postgresStore],
])("the result store, %s", (_, open) => {
  let underTest: StoreUnderTest | undefined;
  let openError: unknown;
  // A store that couldn't open, such as with no test database set, fails every test with the reason, rather than
  // having them reported as skipped.
  const store = () => {
    if (!underTest) throw openError;
    return underTest.store;
  };

  beforeAll(async () => {
    try {
      underTest = await open();
    } catch (error) {
      openError = error;
    }
  });

  afterAll(async () => {
    await underTest?.close();
  });

  it("finds a result it kept by its Game's ID, as it was kept", async () => {
    const result = aResult();

    await store().save(result);

    expect(await store().findResult(result.gameId)).toEqual(result);
  });

  it("keeps a Classic result, with Tokens Home and a Player who Left with some Home", async () => {
    const result: GameResult = {
      gameId: randomUUID(),
      mode: "classic",
      turnsPlayed: 1,
      endedAt: "2026-11-26T23:59:59.999Z",
      players: [
        { seat: 0, joinedVia: "webApp", standing: 1, captures: 3, tokensHome: 4, left: false },
        { seat: 2, joinedVia: "mcp", standing: 2, captures: 2, tokensHome: 2, left: true },
      ],
    };

    await store().save(result);

    expect(await store().findResult(result.gameId)).toEqual(result);
  });

  it("finds nothing for a Game it kept no result for", async () => {
    expect(await store().findResult(randomUUID())).toBeUndefined();
  });

  it("refuses a second result for the same Game, keeping the first", async () => {
    const first = aResult();
    await store().save(first);

    await expect(store().save({ ...first, turnsPlayed: 99 })).rejects.toThrow();

    expect(await store().findResult(first.gameId)).toEqual(first);
  });

  it("keeps each Game's result apart from the others'", async () => {
    const one = aResult();
    const other = { ...aResult(), mode: "classic" as const };

    await store().save(one);
    await store().save(other);

    expect(await store().findResult(one.gameId)).toEqual(one);
    expect(await store().findResult(other.gameId)).toEqual(other);
  });
});
