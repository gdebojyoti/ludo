// The Account store in Postgres, in the `ludo` schema's `seen_accounts` and `account_settings` tables.
import type { Settings } from "@ludo/shared";
import type pg from "pg";

import type { AccountStore } from "./account-store.js";

export const createPostgresAccountStore = (pool: pg.Pool): AccountStore => {
  return {
    markSeen: async (accountId) => {
      // The Account ID is the primary key, so of two inserts at the same moment, only one adds a row, and only it
      // returns one.
      const { rowCount } = await pool.query(
        "INSERT INTO seen_accounts (account_id) VALUES ($1) ON CONFLICT (account_id) DO NOTHING RETURNING account_id",
        [accountId],
      );
      return rowCount === 1;
    },
    findSettings: async (accountId) => {
      const { rows: [row] } = await pool.query<{ settings: Partial<Settings> }>(
        "SELECT settings FROM account_settings WHERE account_id = $1",
        [accountId],
      );
      return row?.settings ?? {};
    },
    changeSettings: async (accountId, changed) => {
      // `||` merges two JSON objects, the right one's keys winning, as PHP's array_merge() does. It's done in the one
      // statement, so two changes at the same moment are each merged into what the other left.
      const { rows: [row] } = await pool.query<{ settings: Partial<Settings> }>(
        `INSERT INTO account_settings (account_id, settings) VALUES ($1, $2)
         ON CONFLICT (account_id) DO UPDATE SET settings = account_settings.settings || EXCLUDED.settings
         RETURNING settings`,
        [accountId, changed],
      );
      return row?.settings ?? {};
    },
  };
};
