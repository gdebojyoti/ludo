// How a Game looks to one of its Players.
import type { GameSnapshot, SnapshotBoard } from "@ludo/shared";

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
  return {
    seat: board.seats.findIndex((seat) => seat.playerId === playerId),
    seats: board.seats.map((seat) => ({
      playerName: seat.playerId === null ? null : playerName(seat.playerId),
      tokens: seat.tokens,
    })),
    turn: board.turn,
  };
};
