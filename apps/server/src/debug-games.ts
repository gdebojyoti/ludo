// The debug list (ADR-0007): serves `/debug/games`, the newest Games as JSON, so the state of the server can be checked
// by opening a URL in a browser. It's public, so it never shows a player ID or a whole Game code.
import type { Express } from "express";
import type { GameMode, GameState, Move, Roll, Seat, TokenPosition } from "@ludo/shared";

import type { GameService } from "./game-service.js";
import type { Game, GameBoard } from "./game-store.js";
import type { IsAway } from "./snapshot.js";

/** How many Games the list shows at most. */
const maxGamesListed = 100;

export const handleDebugGames = (app: Express, gameService: GameService, isAway: IsAway) => {
  app.get("/debug/games", async (_req, res) => {
    const games = await gameService.findNewestGames(maxGamesListed);
    res.json(games.map((game) => toDebugGame(game, isAway)));
  });
};

interface DebugPlayer {
  /** The start of the player ID: enough to tell Players apart, but not to act as one. */
  label: string;
  playerName: string;
  isHost: boolean;
  away: boolean;
}

interface DebugSeat {
  /** The label of the Player in this Seat, as in the Game's list of Players; null if it's empty. */
  label: string | null;
  /** The Player name of the Player in this Seat, or of the Player who Left it; null if nobody has sat in it. */
  playerName: string | null;
  left: boolean;
  tokens: TokenPosition[];
}

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
    players: game.players.map(({ playerId, playerName }) => ({
      label: labelOf(playerId),
      playerName,
      isHost: playerId === game.hostId,
      away: isAway(playerId),
    })),
    // Last, as it's the longest, and the rest is easier to read above it.
    board: game.board && toDebugBoard(game, game.board),
  };
};

const toDebugBoard = (game: Game, board: GameBoard): DebugBoard => {
  const playerName = (id: string) => game.players.find((player) => player.playerId === id)?.playerName ?? null;
  return {
    turn: board.turn,
    rolled: board.rolled,
    lastRoll: board.lastRoll,
    lastMove: board.lastMove,
    winner: board.winner,
    seats: board.seats.map((seat) => ({
      label: seat.playerId === null ? null : labelOf(seat.playerId),
      playerName: seat.playerId === null ? seat.leaverName : playerName(seat.playerId),
      left: seat.leaverName !== null,
      tokens: seat.tokens,
    })),
  };
};

// A player ID is a random UUID, the only proof of who a Player is (ADR-0003). Its first 6 characters reveal 24 of its
// 122 random bits, which leaves the rest unguessable, and the same Player has the same label in every Game.
const labelOf = (playerId: string) => playerId.slice(0, 6);

// Enough to recognise a Game code you were given, but not to join a Game you weren't.
const maskGameCode = (gameCode: string) => gameCode.slice(0, 2) + "*".repeat(gameCode.length - 2);
