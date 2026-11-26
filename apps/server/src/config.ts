export interface Config {
  /** Port the server listens on. */
  port: number;
  /** Addresses of the web app: the only origins allowed to call the server. */
  webOrigins: string[];
  /** Where a Player plays Ludo in a browser, which an AI Player sends them to, with no trailing slash. */
  webAppUrl: string;
  /**
   * The connection string of the Postgres database where finished Games' results are kept. Null only off Render, where
   * they're then kept in memory, for as long as the server runs.
   */
  databaseUrl: string | null;
}

export const readConfig = (env: NodeJS.ProcessEnv): Config => {
  return {
    port: readPort(env.PORT ?? "4003"),
    webOrigins: readOrigins(env.WEB_ORIGIN ?? "http://localhost:8083"),
    webAppUrl: readWebAppUrl(env),
    databaseUrl: readDatabaseUrl(env),
  };
};

const readPort = (value: string): number => {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT must be a port number, got "${value}"`);
  }
  return port;
};

const readOrigins = (value: string): string[] => {
  return value.split(",").map((origin) => origin.trim()).filter(Boolean);
};

// Render sets RENDER on every service it runs. There, a missing WEB_APP_URL would quietly send Players to localhost,
// so the server refuses to start, and the deploy fails, instead.
const readWebAppUrl = (env: NodeJS.ProcessEnv): string => {
  const value = env.WEB_APP_URL?.trim().replace(/\/+$/, "");
  if (!value && env.RENDER !== undefined) {
    throw new Error("WEB_APP_URL must be set on Render, to the address of the web app Players play on");
  }
  return value || "http://localhost:8083/ludo";
};

// On Render, a missing DATABASE_URL would quietly keep every finished Game's result in memory, lost on the next restart,
// so the server refuses to start there too.
const readDatabaseUrl = (env: NodeJS.ProcessEnv): string | null => {
  const value = env.DATABASE_URL?.trim();
  if (!value && env.RENDER !== undefined) {
    throw new Error("DATABASE_URL must be set on Render, to the connection string of Ludo's role on Neon");
  }
  return value || null;
};
