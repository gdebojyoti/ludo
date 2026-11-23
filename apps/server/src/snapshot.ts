// How a Game looks to one of its Players.
import {
  legalMoves,
  standings,
  type GameSnapshot,
  type SnapshotBoard,
  type SnapshotPlayer,
  type SnapshotSeat,
} from "@ludo/shared";

import type { Game, GameBoard, GamePlayer, GameSeat } from "./game-store.js";

/** Whether the Player with this player ID is Away, with no tab connected. */
export type IsAway = (playerId: string) => boolean;

/**
 * The Game as this Player sees it, with whoever is Away right now. Never includes a player ID: the ID is the only
 * proof of who a Player is.
 */
export const toSnapshot = (game: Game, playerId: string, isAway: IsAway): GameSnapshot => {
  return {
    mode: game.mode,
    state: game.state,
    gameCode: game.state === "lobby" ? game.gameCode : null,
    isHost: game.hostId === playerId,
    players: game.players.map((player) => toSnapshotPlayer(game, player, isAway)),
    board: game.board && toSnapshotBoard(game, game.board, playerId, isAway),
  };
};

/** One of the Game's Players, as every Player sees them. */
export const toSnapshotPlayer = (game: Game, player: GamePlayer, isAway: IsAway): SnapshotPlayer => {
  return { playerName: player.playerName, isHost: player.playerId === game.hostId, away: isAway(player.playerId) };
};

/** One of the Seats at the Game's Board, with its Standing, as every Player sees it. */
const toSnapshotSeat = (game: Game, seat: GameSeat, standing: number | null, isAway: IsAway): SnapshotSeat => {
  const playerName = (id: string) => game.players.find((player) => player.playerId === id)?.playerName ?? null;
  return {
    playerName: seat.playerId === null ? seat.leaverName : playerName(seat.playerId),
    left: seat.leaverName !== null,
    away: seat.playerId !== null && isAway(seat.playerId),
    tokens: seat.tokens,
    standing,
  };
};

/** Every Seat at the Game's Board, by number, as every Player sees it. */
export const toSnapshotSeats = (game: Game, board: GameBoard, isAway: IsAway): SnapshotSeat[] => {
  const seatStandings = standingsAt(board);
  return board.seats.map((seat, index) => toSnapshotSeat(game, seat, seatStandings[index] ?? null, isAway));
};

/** Each Seat's Standing at the Game's Board, by Seat, once the Game is won; until then, all null. */
const standingsAt = (board: GameBoard): (number | null)[] => {
  if (board.winner === null) return board.seats.map(() => null);
  const finalSeats = board.seats.map((seat) => {
    const taken = seat.playerId !== null || seat.leaverName !== null;
    return taken ? { left: seat.leaverName !== null, tokens: seat.tokens } : null;
  });
  return standings(finalSeats, board.winner);
};

const toSnapshotBoard = (game: Game, board: GameBoard, playerId: string, isAway: IsAway): SnapshotBoard => {
  const seat = board.seats.findIndex((seat) => seat.playerId === playerId);
  const ownTokens = board.seats[seat]?.tokens ?? [];
  // Only the Player whose Turn it is has a Roll to Move by, once they've Rolled.
  const rollToMove = board.rolled && board.turn === seat ? board.lastRoll : null;
  return {
    seat,
    seats: toSnapshotSeats(game, board, isAway),
    turn: board.turn,
    rolled: board.rolled,
    lastRoll: board.lastRoll,
    lastMove: board.lastMove,
    moves: rollToMove ? legalMoves(game.mode, seat, ownTokens, rollToMove.number) : [],
    // A Roll that leaves no Move passes the Turn, and a Move that earns no Roll does too, so the only way the latest
    // Roll is still the Seat's whose Turn it is, with no Move left to make, is a Move that earned another Roll.
    extraRoll: game.state === "playing" && !board.rolled && board.lastRoll?.seat === board.turn,
    winner: board.winner,
  };
};
