// Test helper: the local Postgres database the storage tests run against, never production (ADR-0013).
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

/** Drops everything of Ludo's from the test database, then runs every migration, as on a new deploy. */
export const resetTestDatabase = async (): Promise<void> => {
  const client = new pg.Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS ludo CASCADE");
  } finally {
    await client.end();
  }
  await migrate(testDatabaseUrl());
};

/** A pool on the test database, in the `ludo` schema, as the server connects. */
export const createTestPool = (): pg.Pool => createPool(testDatabaseUrl());
