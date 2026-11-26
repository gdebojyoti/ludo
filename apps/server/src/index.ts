import { readConfig } from "./config.js";
import { createPool } from "./database.js";
import { migrate } from "./migrate.js";
import { createPostgresAccountStore } from "./postgres-account-store.js";
import { createPostgresGameResultStore } from "./postgres-game-results.js";
import { createGameServer, type GameServerOptions } from "./server.js";
import { createPostgresSessionCheck } from "./sessions.js";

const config = readConfig(process.env);

/**
 * What the server keeps in Postgres, if there's a database, once the migrations that haven't run yet have run, so no
 * request meets an old table: finished Games' results and the Accounts Ludo has seen, and where it checks Sessions.
 * Without one, the server keeps them in memory, and every Player is a Guest.
 */
const openDatabase = async (databaseUrl: string | null): Promise<GameServerOptions> => {
  if (!databaseUrl) {
    console.log("No DATABASE_URL set, so finished Games' results are kept in memory only, and every Player is a Guest");
    return {};
  }
  const ran = await migrate(databaseUrl);
  if (ran.length) console.log(`Ran the migrations ${ran.join(", ")}`);
  const pool = createPool(databaseUrl);
  return {
    gameResults: createPostgresGameResultStore(pool),
    accounts: createPostgresAccountStore(pool),
    checkSession: createPostgresSessionCheck(pool),
  };
};

const { httpServer } = createGameServer(config, await openDatabase(config.databaseUrl));

httpServer.listen(config.port, () => {
  console.log(`Ludo server listening on port ${config.port}, accepting ${config.webOrigins.join(", ")}`);
});
