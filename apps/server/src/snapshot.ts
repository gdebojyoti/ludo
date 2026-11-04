// How a Game looks to one of its Players.
import { legalMoves, type GameSnapshot, type SnapshotBoard } from "@ludo/shared";

import type { Game, GameBoard } from "./game-store.js";

/** Whether the Player with this player ID is Away, with no tab connected. */
export type IsAway = (playerId: string) => boolean;

/**
 * The Game as this Player sees it, with whoever is Away right now. Never includes a player ID: the ID is the only
 * proof of who a Player is.
 */
export const toSnapshot = (game: Game, playerId: string, isAway: IsAway): GameSnapshot => {
  return {
    state: game.state,
    gameCode: game.state === "lobby" ? game.gameCode : null,
    isHost: game.hostId === playerId,
    players: game.players.map((player) => ({
      playerName: player.playerName,
      isHost: player.playerId === game.hostId,
      away: isAway(player.playerId),
    })),
    board: game.board && toSnapshotBoard(game, game.board, playerId, isAway),
  };
};

const toSnapshotBoard = (game: Game, board: GameBoard, playerId: string, isAway: IsAway): SnapshotBoard => {
  const playerName = (id: string) => game.players.find((player) => player.playerId === id)?.playerName ?? null;
  const seat = board.seats.findIndex((seat) => seat.playerId === playerId);
  const ownTokens = board.seats[seat]?.tokens ?? [];
  // Only the Player whose Turn it is has a Roll to Move by, once they've Rolled.
  const rollToMove = board.rolled && board.turn === seat ? board.lastRoll : null;
  return {
    seat,
    seats: board.seats.map((seat) => ({
      playerName: seat.playerId === null ? seat.leaverName : playerName(seat.playerId),
      left: seat.leaverName !== null,
      away: seat.playerId !== null && isAway(seat.playerId),
      tokens: seat.tokens,
    })),
    turn: board.turn,
    rolled: board.rolled,
    lastRoll: board.lastRoll,
    lastMove: board.lastMove,
    moves: rollToMove ? legalMoves(seat, ownTokens, rollToMove.number) : [],
    // A Roll that leaves no Move passes the Turn, and a Move that earns no Roll does too, so the only way the latest
    // Roll is still the Seat's whose Turn it is, with no Move left to make, is a Move that earned another Roll.
    extraRoll: game.state === "playing" && !board.rolled && board.lastRoll?.seat === board.turn,
    winner: board.winner,
  };
};
