// The storage contract: one suite, run against every version of the Account store, so the in-memory one the server
// tests use can't drift from Postgres.
import { randomUUID } from "node:crypto";

import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createMemoryAccountStore, type AccountStore } from "./account-store.js";
import { createPostgresAccountStore } from "./postgres-account-store.js";
import { createTestPool } from "./testing-database.js";

/** A version of the store to run the suite against, and how to let go of it once the suite is done. */
interface StoreUnderTest {
  store: AccountStore;
  close: () => Promise<void>;
}

const memoryStore = async (): Promise<StoreUnderTest> => {
  return { store: createMemoryAccountStore(), close: async () => {} };
};

const postgresStore = async (): Promise<StoreUnderTest> => {
  const pool: pg.Pool = createTestPool();
  return { store: createPostgresAccountStore(pool), close: () => pool.end() };
};

describe.each([
  ["in memory", memoryStore],
  ["in Postgres", postgresStore],
])("the Account store, %s", (_, open) => {
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

  describe("Accounts seen", () => {
    it("tells an Account seen for the first time from one seen before", async () => {
      const accountId = randomUUID();

      expect(await store().markSeen(accountId)).toBe(true);
      expect(await store().markSeen(accountId)).toBe(false);
      expect(await store().markSeen(accountId)).toBe(false);
    });

    it("sees each Account apart from the others", async () => {
      const [one, other] = [randomUUID(), randomUUID()];
      await store().markSeen(one);

      expect(await store().markSeen(other)).toBe(true);
    });

    it("counts only one of two first sightings at the same moment as the first", async () => {
      const accountId = randomUUID();

      const firsts = await Promise.all([store().markSeen(accountId), store().markSeen(accountId)]);

      expect(firsts.toSorted()).toEqual([false, true]);
    });
  });

  describe("settings", () => {
    it("has none kept for an Account that has changed none", async () => {
      expect(await store().findSettings(randomUUID())).toEqual({});
    });

    it("keeps a change, and returns the settings with it", async () => {
      const accountId = randomUUID();

      expect(await store().changeSettings(accountId, { theme: "heritage" })).toEqual({ theme: "heritage" });
      expect(await store().findSettings(accountId)).toEqual({ theme: "heritage" });
    });

    it("keeps the latest change to each setting, and the others as they were", async () => {
      const accountId = randomUUID();
      await store().changeSettings(accountId, { theme: "heritage", autoplay: true });
      await store().changeSettings(accountId, { diceOnLeft: true });

      const settings = await store().changeSettings(accountId, { theme: "christmas" });

      const expected = { theme: "christmas", autoplay: true, diceOnLeft: true };
      expect(settings).toEqual(expected);
      expect(await store().findSettings(accountId)).toEqual(expected);
    });

    it("keeps both of two changes to different settings at the same moment", async () => {
      const accountId = randomUUID();

      await Promise.all([
        store().changeSettings(accountId, { theme: "heritage" }),
        store().changeSettings(accountId, { autoplay: true }),
      ]);

      expect(await store().findSettings(accountId)).toEqual({ theme: "heritage", autoplay: true });
    });

    it("keeps each Account's settings apart from the others'", async () => {
      const [one, other] = [randomUUID(), randomUUID()];

      await store().changeSettings(one, { diceOnLeft: true });
      await store().changeSettings(other, { diceOnLeft: false });

      expect(await store().findSettings(one)).toEqual({ diceOnLeft: true });
      expect(await store().findSettings(other)).toEqual({ diceOnLeft: false });
    });
  });
});
