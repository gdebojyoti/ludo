// How a Game looks to one of its Players.
import { legalMoves, type GameSnapshot, type SnapshotBoard } from "@ludo/shared";

import type { Game, GameBoard } from "./game-store.js";

/**
 * The Game as this Player sees it. Never includes a player ID: the ID is the only proof of who a Player is.
 */
export const toSnapshot = (game: Game, playerId: string): GameSnapshot => {
  return {
    state: game.state,
    gameCode: game.state === "lobby" ? game.gameCode : null,
    isHost: game.hostId === playerId,
    players: game.players.map((player) => ({ playerName: player.playerName, isHost: player.playerId === game.hostId })),
    board: game.board && toSnapshotBoard(game, game.board, playerId),
  };
};

const toSnapshotBoard = (game: Game, board: GameBoard, playerId: string): SnapshotBoard => {
  const playerName = (id: string) => game.players.find((player) => player.playerId === id)?.playerName ?? null;
  const seat = board.seats.findIndex((seat) => seat.playerId === playerId);
  const ownTokens = board.seats[seat]?.tokens ?? [];
  // Only the Player whose Turn it is has a Roll to Move by, once they've Rolled.
  const rollToMove = board.rolled && board.turn === seat ? board.lastRoll : null;
  return {
    seat,
    seats: board.seats.map((seat) => ({
      playerName: seat.playerId === null ? null : playerName(seat.playerId),
      tokens: seat.tokens,
    })),
    turn: board.turn,
    rolled: board.rolled,
    lastRoll: board.lastRoll,
    lastMove: board.lastMove,
    moves: rollToMove ? legalMoves(seat, ownTokens, rollToMove.number) : [],
    winner: board.winner,
  };
};
