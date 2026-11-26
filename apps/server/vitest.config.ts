import { existsSync } from "node:fs";

import { defineConfig } from "vitest/config";

// Tests read TEST_DATABASE_URL from a local `.env`, as `npm run dev` reads the server's settings from it.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  test: {
    globalSetup: ["src/testing-global-setup.ts"],
  },
});
