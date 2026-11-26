// Runs once before the server tests: every run starts from an empty test database with every migration run. Without
// TEST_DATABASE_URL it does nothing, and each storage test fails, saying what to set, while the rest still run.
import { resetTestDatabase } from "./testing-database.js";

export const setup = async (): Promise<void> => {
  if (process.env.TEST_DATABASE_URL) await resetTestDatabase();
};
