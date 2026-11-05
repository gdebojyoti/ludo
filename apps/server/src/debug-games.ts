// The debug list (ADR-0007): serves `/debug/games`, the newest Games as JSON, so the state of the server can be checked
// by opening a URL in a browser. It's public, so it never shows a player ID or a whole Game code.
import type { Express } from "express";
import type { GameMode, GameState, Move, Roll, Seat, SnapshotPlayer, SnapshotSeat } from "@ludo/shared";

import type { GameService } from "./game-service.js";
import type { Game, GameBoard } from "./game-store.js";
import { toSnapshotPlayer, toSnapshotSeat, type IsAway } from "./snapshot.js";

/** How many Games the list shows at most. */
const maxGamesListed = 100;

export const handleDebugGames = (app: Express, gameService: GameService, isAway: IsAway) => {
  app.get("/debug/games", async (_req, res) => {
    const { total, games } = await gameService.findNewestGames(maxGamesListed);
    const list: DebugGames = { total, games: games.map((game) => toDebugGame(game, isAway)) };
    res.json(list);
  });
};

export interface DebugGames {
  /** How many Games the server holds, which is more than are listed once there are over `maxGamesListed`. */
  total: number;
  /** The newest Games, newest first. */
  games: DebugGame[];
}

/** A Player as every Player sees them, with a label to tell them apart. */
type DebugPlayer = { label: string } & SnapshotPlayer;

/** A Seat as every Player sees it, with the label of the Player in it; null if it's empty. */
type DebugSeat = { label: string | null } & SnapshotSeat;

interface DebugBoard {
  turn: Seat;
  rolled: boolean;
  lastRoll: Roll | null;
  lastMove: Move | null;
  winner: Seat | null;
  seats: DebugSeat[];
}

export interface DebugGame {
  id: string;
  mode: GameMode;
  state: GameState;
  /** The Game code with all but its first digits masked, while the Game is in the Lobby; otherwise null. */
  gameCode: string | null;
  createdAt: string;
  updatedAt: string;
  /** The Players still in the Game, in the order they joined. */
  players: DebugPlayer[];
  /** The Board, once the Game has started; null in the Lobby. */
  board: DebugBoard | null;
}

const toDebugGame = (game: Game, isAway: IsAway): DebugGame => {
  return {
    id: game.id,
    mode: game.mode,
    state: game.state,
    gameCode: game.state === "lobby" ? maskGameCode(game.gameCode) : null,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    players: game.players.map((player) => ({
      label: labelOf(player.playerId),
      ...toSnapshotPlayer(game, player, isAway),
    })),
    // Last, as it's the longest, and the rest is easier to read above it.
    board: game.board && toDebugBoard(game, game.board, isAway),
  };
};

const toDebugBoard = (game: Game, board: GameBoard, isAway: IsAway): DebugBoard => {
  return {
    turn: board.turn,
    rolled: board.rolled,
    lastRoll: board.lastRoll,
    lastMove: board.lastMove,
    winner: board.winner,
    seats: board.seats.map((seat) => ({
      label: seat.playerId === null ? null : labelOf(seat.playerId),
      ...toSnapshotSeat(game, seat, isAway),
    })),
  };
};

// A player ID is a random UUID, the only proof of who a Player is (ADR-0003). Its first 6 characters reveal 24 of its
// 122 random bits, which leaves the rest unguessable, and the same Player has the same label in every Game.
const labelOf = (playerId: string) => playerId.slice(0, 6);

// Enough to recognise a Game code you were given, but not to join a Game you weren't.
const maskGameCode = (gameCode: string) => gameCode.slice(0, 2) + "*".repeat(gameCode.length - 2);
