// Test helper: the local Postgres database the storage tests run against, never production (ADR-0013).
import { randomUUID } from "node:crypto";

import pg from "pg";

import { createPool } from "./database.js";
import { migrate } from "./migrate.js";

const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * The local database tests run against, from TEST_DATABASE_URL. Tests empty it, so anything other than a database on
 * this machine is refused.
 */
export const testDatabaseUrl = (): string => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL must be set to a local Postgres database for the storage tests: see docs/local-database.md",
    );
  }
  if (!localHosts.has(new URL(url).hostname)) {
    throw new Error("TEST_DATABASE_URL must point at a database on this machine, never production");
  }
  return url;
};

/** Runs `use` with a connection to the test database as its owner, outside the `ludo` schema, then closes it. */
const asOwner = async <Result>(use: (client: pg.Client) => Promise<Result>): Promise<Result> => {
  const client = new pg.Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  try {
    return await use(client);
  } finally {
    await client.end();
  }
};

/**
 * Drops everything of Ludo's from the test database, then runs every migration, as on a new deploy. Beside it, it makes
 * a stand-in for the two tables of `accounts` that the session check reads, with the columns thg.accounts'
 * docs/contract.md names, and an email a game mustn't read, as accounts' own migrations would make them.
 */
export const resetTestDatabase = async (): Promise<void> => {
  await asOwner(async (client) => {
    await client.query("DROP SCHEMA IF EXISTS ludo CASCADE");
    await client.query("DROP SCHEMA IF EXISTS accounts CASCADE");
    await client.query(`
      CREATE SCHEMA accounts;
      CREATE TABLE accounts."user" (id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL);
      CREATE TABLE accounts.session (
        id text PRIMARY KEY,
        token text NOT NULL UNIQUE,
        "userId" uuid NOT NULL REFERENCES accounts."user" (id) ON DELETE CASCADE,
        "expiresAt" timestamptz NOT NULL
      );
    `);
  });
  await migrate(testDatabaseUrl());
};

/**
 * Signs in to the stand-in for `accounts`, as `accounts` does after Google: a new Session, expiring at `expiresAt`, for
 * the Account with this ID and Google name, made if it's new. Returns the Session's token.
 */
export const startTestSession = async (
  { accountId = randomUUID(), name, expiresAt }: { accountId?: string; name: string; expiresAt: Date },
): Promise<string> => {
  const token = randomUUID();
  await asOwner(async (client) => {
    await client.query(
      "INSERT INTO accounts.\"user\" (id, name, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
      [accountId, name, `${accountId}@example.com`],
    );
    await client.query(
      "INSERT INTO accounts.session (id, token, \"userId\", \"expiresAt\") VALUES ($1, $2, $3, $4)",
      [randomUUID(), token, accountId, expiresAt],
    );
  });
  return token;
};

/** Ends the Session with this token, as a Sign out does in `accounts`. */
export const endTestSession = async (token: string): Promise<void> => {
  await asOwner((client) => client.query("DELETE FROM accounts.session WHERE token = $1", [token]));
};

/** A pool on the test database, in the `ludo` schema, as the server connects. */
export const createTestPool = (): pg.Pool => createPool(testDatabaseUrl());
