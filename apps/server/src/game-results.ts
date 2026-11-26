// Where the result of each finished Game is kept, for Coins, XP, Profiles and the Leaderboard to be worked out from.
// Live Games stay in memory (ADR-0004), but their results outlive the server, in Postgres. Like the Game store, it's an
// interface, with an in-memory version for the server tests, so they don't need a database.
import { tokensHome, type GameMode, type Seat } from "@ludo/shared";

import type { Game, JoinedVia } from "./game-store.js";
import { standingsAt } from "./snapshot.js";

/** A finished Game, as it's kept once it has been won. */
export interface GameResult {
  /** The ID of the Game. */
  gameId: string;
  mode: GameMode;
  /** How many Turns were played, counting the one the Game ended in. */
  turnsPlayed: number;
  /** When the Game was won, as an ISO 8601 time. */
  endedAt: string;
  /** Each Player who was given a Seat, including those who Left, by Seat. */
  players: PlayerResult[];
}

export interface PlayerResult {
  seat: Seat;
  /** How they created or joined the Game. */
  joinedVia: JoinedVia;
  /**
   * The ID of the Account the server knew them by when the Game ended, or when they Left it; null for a Guest or an AI
   * Player.
   */
  accountId: string | null;
  /** Their Standing, counting from 1: Players who tie share one. */
  standing: number;
  /** How many opponents' Tokens they Captured. */
  captures: number;
  /** How many of their Tokens were Home at the end, or when they Left. */
  tokensHome: number;
  /** Whether they Left the Game during play. */
  left: boolean;
}

export interface GameResultStore {
  /** Keeps the result of a Game that has ended. A second result for the same Game is refused. */
  save: (result: GameResult) => Promise<void>;
  /** The result kept for the Game with this ID, if there is one. */
  findResult: (gameId: string) => Promise<GameResult | undefined>;
}

/** The in-memory store, which also lists every result it holds, so a test can check what was kept. */
export interface MemoryGameResultStore extends GameResultStore {
  /** Every result kept, in the order they were saved. */
  results: () => GameResult[];
}

export const createMemoryGameResultStore = (): MemoryGameResultStore => {
  const results = new Map<string, GameResult>();

  return {
    save: async (result) => {
      if (results.has(result.gameId)) throw new Error(`Game ${result.gameId} already has a result`);
      results.set(result.gameId, structuredClone(result));
    },
    findResult: async (gameId) => {
      const result = results.get(gameId);
      return result && structuredClone(result);
    },
    results: () => [...results.values()].map((result) => structuredClone(result)),
  };
};

/** The result of a Game that has been won, as of `endedAt`, or undefined if it hasn't been won. */
export const toGameResult = (game: Game, endedAt: string): GameResult | undefined => {
  const { board } = game;
  if (game.state !== "won" || !board) return undefined;
  const seatStandings = standingsAt(board);
  const players = board.seats.flatMap((seat, index): PlayerResult[] => {
    const standing = seatStandings[index];
    // A Seat no Player was given has no Standing.
    if (seat.joinedVia === null || standing === undefined || standing === null) return [];
    const left = seat.leaverName !== null;
    return [{
      seat: index,
      joinedVia: seat.joinedVia,
      accountId: seat.accountId,
      standing,
      captures: seat.captures,
      tokensHome: left ? seat.leaverTokensHome ?? 0 : tokensHome(seat.tokens),
      left,
    }];
  });
  return { gameId: game.id, mode: game.mode, turnsPlayed: board.turnsPlayed, endedAt, players };
};
