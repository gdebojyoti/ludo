// The result store in Postgres, in the `ludo` schema's `game_results` and `game_result_players` tables.
import type { GameMode, Seat } from "@ludo/shared";
import type pg from "pg";

import type { GameResult, GameResultStore, PlayerResult } from "./game-results.js";
import type { JoinedVia } from "./game-store.js";

interface ResultRow {
  game_id: string;
  mode: GameMode;
  turns_played: number;
  ended_at: Date;
}

interface PlayerRow {
  seat: Seat;
  joined_via: JoinedVia;
  account_id: string | null;
  standing: number;
  captures: number;
  tokens_home: number;
  has_left: boolean;
}

export const createPostgresGameResultStore = (pool: pg.Pool): GameResultStore => {
  return {
    save: async (result) => {
      // A transaction, so a result is kept with all its Players or not at all. The Game's ID is the table's primary
      // key, so a second result for it is refused.
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "INSERT INTO game_results (game_id, mode, turns_played, ended_at) VALUES ($1, $2, $3, $4)",
          [result.gameId, result.mode, result.turnsPlayed, result.endedAt],
        );
        for (const player of result.players) {
          await client.query(
            `INSERT INTO game_result_players
               (game_id, seat, joined_via, account_id, standing, captures, tokens_home, has_left)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              result.gameId,
              player.seat,
              player.joinedVia,
              player.accountId,
              player.standing,
              player.captures,
              player.tokensHome,
              player.left,
            ],
          );
        }
        await client.query("COMMIT");
        client.release();
      } catch (error) {
        // A connection that broke can't roll back, and that failure would hide why the result wasn't kept. Releasing
        // it with the error closes it, rather than lending it to the next query.
        await client.query("ROLLBACK").catch(() => {});
        client.release(error instanceof Error ? error : true);
        throw error;
      }
    },
    findResult: async (gameId) => {
      const { rows: [row] } = await pool.query<ResultRow>(
        "SELECT game_id, mode, turns_played, ended_at FROM game_results WHERE game_id = $1",
        [gameId],
      );
      if (!row) return undefined;
      const { rows } = await pool.query<PlayerRow>(
        `SELECT seat, joined_via, account_id, standing, captures, tokens_home, has_left
         FROM game_result_players WHERE game_id = $1 ORDER BY seat`,
        [gameId],
      );
      return fromRows(row, rows);
    },
  };
};

/** The result kept in these rows, of the Game and of each of its Players. */
const fromRows = (row: ResultRow, players: PlayerRow[]): GameResult => {
  return {
    gameId: row.game_id,
    mode: row.mode,
    turnsPlayed: row.turns_played,
    endedAt: row.ended_at.toISOString(),
    players: players.map(fromPlayerRow),
  };
};

const fromPlayerRow = (row: PlayerRow): PlayerResult => {
  return {
    seat: row.seat,
    joinedVia: row.joined_via,
    accountId: row.account_id,
    standing: row.standing,
    captures: row.captures,
    tokensHome: row.tokens_home,
    left: row.has_left,
  };
};
