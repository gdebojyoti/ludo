// The connection to Postgres, which every TableHop game shares (ADR-0013).
import pg from "pg";

// Every connection starts in the `ludo` schema, as if each one began with `SET search_path = ludo`, much as
// `mysqli_select_db()` picks the database later queries use. Postgres's `options` setting does that as the connection
// opens, so no query can run before it.
const ludoSchemaOptions = "-c search_path=ludo";

/**
 * A pool on the database: it keeps a few connections open and lends one to each query, rather than connecting per query
 * as a PHP script does. It closes a connection after 10 seconds unused, so Neon can stop once the server goes quiet,
 * well within its 5 minutes, and stays inside its free tier.
 */
export const createPool = (databaseUrl: string): pg.Pool => {
  const pool = new pg.Pool({ connectionString: databaseUrl, options: ludoSchemaOptions, idleTimeoutMillis: 10_000 });

  // An idle connection can be dropped from the far end, such as when Neon stops. Without a listener, that error would
  // crash the server. The pool opens a new connection on the next query.
  pool.on("error", (error) => {
    console.error("An idle database connection failed:", error.message);
  });

  return pool;
};
