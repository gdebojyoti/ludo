// Runs Ludo's migrations: the numbered `.sql` files in `migrations/`, each of which changes the database's tables once,
// in order, as accounts' are run (ADR-0013). Migrations only go forward: a mistake in one that has run anywhere is fixed
// by the next file, never by editing it.
import { fileURLToPath } from "node:url";

import { runner } from "node-pg-migrate";

// The migrations sit beside `src/` and `dist/`, so they're found the same way from either.
const migrationsDir = fileURLToPath(new URL("../migrations", import.meta.url));

/**
 * Runs every migration that hasn't run yet against the database, in order, and returns the names of those it ran.
 * node-pg-migrate records each one in `ludo.pgmigrations`, so a second run finds nothing to do, and takes a lock, so two
 * servers starting at once can't both run one.
 */
export const migrate = async (databaseUrl: string): Promise<string[]> => {
  const ran = await runner({
    databaseUrl,
    dir: migrationsDir,
    direction: "up",
    // `pgmigrations` lives in the `ludo` schema, which therefore has to exist before the first migration runs.
    migrationsSchema: "ludo",
    createMigrationsSchema: true,
    migrationsTable: "pgmigrations",
    schema: "ludo",
    checkOrder: true,
    log: () => {},
  });
  return ran.map((migration) => migration.name);
};

if (import.meta.main) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL must be set to run the migrations: see docs/local-database.md");
  const ran = await migrate(databaseUrl);
  console.log(ran.length ? `Ran ${ran.join(", ")}` : "No migrations to run");
}
