// The session check in Postgres, against a stand-in for `accounts`' two tables in the test database, with only what
// thg.accounts' docs/contract.md lets a game read, and an email it mustn't.
import { randomUUID } from "node:crypto";

import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createPostgresSessionCheck, type CheckSession } from "./sessions.js";
import { createTestPool, endTestSession, startTestSession } from "./testing-database.js";

let pool: pg.Pool;
let checkSession: CheckSession;

beforeAll(() => {
  pool = createTestPool();
  checkSession = createPostgresSessionCheck(pool);
});

afterAll(async () => {
  await pool.end();
});

const inAnHour = () => new Date(Date.now() + 60 * 60_000);

describe("checking a Session in Postgres", () => {
  it("finds the Session's Account: its ID and Google name, and nothing more", async () => {
    const accountId = randomUUID();
    const token = await startTestSession({ accountId, name: "Luna Lovegood", expiresAt: inAnHour() });

    expect(await checkSession(token)).toEqual({ accountId, name: "Luna Lovegood" });
  });

  it("finds nothing for an unknown Session", async () => {
    expect(await checkSession(randomUUID())).toBeUndefined();
  });

  it("finds nothing for a Session that has expired", async () => {
    const token = await startTestSession({ name: "Luna Lovegood", expiresAt: new Date(Date.now() - 1000) });

    expect(await checkSession(token)).toBeUndefined();
  });

  it("finds nothing for a Session ended by a Sign out", async () => {
    const token = await startTestSession({ name: "Luna Lovegood", expiresAt: inAnHour() });
    await endTestSession(token);

    expect(await checkSession(token)).toBeUndefined();
  });

  it("tells the Accounts of two Sessions apart", async () => {
    const [luna, ginny] = [randomUUID(), randomUUID()];
    const lunaToken = await startTestSession({ accountId: luna, name: "Luna Lovegood", expiresAt: inAnHour() });
    const ginnyToken = await startTestSession({ accountId: ginny, name: "Ginny Weasley", expiresAt: inAnHour() });

    expect(await checkSession(ginnyToken)).toEqual({ accountId: ginny, name: "Ginny Weasley" });
    expect(await checkSession(lunaToken)).toEqual({ accountId: luna, name: "Luna Lovegood" });
  });
});
