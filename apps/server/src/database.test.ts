import pg from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";

import { migrate } from "./migrate.js";
import { createTestPool, testDatabaseUrl } from "./testing-database.js";

let pool: pg.Pool | undefined;

afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  await pool?.end();
  pool = undefined;
});

/** The test database's tables in this schema, by name. */
const tablesIn = async (schema: string) => {
  pool ??= createTestPool();
  const { rows } = await pool.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name",
    [schema],
  );
  return rows.map((row) => row.table_name);
};

// Every test run starts by emptying the test database and running every migration (testing-global-setup.ts), as the
// server does when it starts on a new database.
describe("migrating", () => {
  it("puts every Ludo table in the ludo schema, with what has run, and nothing in public", async () => {
    expect(await tablesIn("ludo")).toEqual(["game_result_players", "game_results", "pgmigrations"]);
    expect(await tablesIn("public")).toEqual([]);
  });

  it("does nothing when every migration has run", async () => {
    expect(await migrate(testDatabaseUrl())).toEqual([]);
  });
});

// Ends a connection from Postgres's side, as when Neon stops after 5 minutes without queries.
const terminateConnection = async (pid: number) => {
  const client = new pg.Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  try {
    await client.query("SELECT pg_terminate_backend($1)", [pid]);
  } finally {
    await client.end();
  }
};

describe("the connection pool", () => {
  it("closes a connection left idle, well within Neon's 5 minutes", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    pool = createTestPool();
    await pool.query("SELECT 1");
    expect(pool.totalCount).toBe(1);

    vi.advanceTimersByTime(60_000);

    expect(pool.totalCount).toBe(0);
  });

  it("logs an error on an idle connection rather than crashing, and connects again on the next query", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    pool = createTestPool();
    const { rows: [backend] } = await pool.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");

    await terminateConnection(backend?.pid ?? 0);

    await vi.waitFor(() => {
      expect(logged).toHaveBeenCalledWith("An idle database connection failed:", expect.any(String));
    });
    expect((await pool.query<{ one: number }>("SELECT 1 AS one")).rows).toEqual([{ one: 1 }]);
  });

  it("starts each connection in the ludo schema", async () => {
    pool = createTestPool();

    const { rows } = await pool.query<{ search_path: string }>("SHOW search_path");

    expect(rows).toEqual([{ search_path: "ludo" }]);
  });
});
