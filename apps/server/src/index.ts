import { readConfig } from "./config.js";
import { createPool } from "./database.js";
import type { GameResultStore } from "./game-results.js";
import { migrate } from "./migrate.js";
import { createPostgresGameResultStore } from "./postgres-game-results.js";
import { createGameServer } from "./server.js";

const config = readConfig(process.env);

/**
 * The store for finished Games' results, in Postgres if there's a database, once the migrations that haven't run yet
 * have run, so no request meets an old table. Without one, the server keeps them in memory.
 */
const openGameResults = async (databaseUrl: string | null): Promise<GameResultStore | undefined> => {
  if (!databaseUrl) {
    console.log("No DATABASE_URL set, so finished Games' results are kept in memory only");
    return undefined;
  }
  const ran = await migrate(databaseUrl);
  if (ran.length) console.log(`Ran the migrations ${ran.join(", ")}`);
  return createPostgresGameResultStore(createPool(databaseUrl));
};

const { httpServer } = createGameServer(config, { gameResults: await openGameResults(config.databaseUrl) });

httpServer.listen(config.port, () => {
  console.log(`Ludo server listening on port ${config.port}, accepting ${config.webOrigins.join(", ")}`);
});
