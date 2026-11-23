import {
  classicRules,
  isWonByCapture,
  seatsClockwise,
  tokensHome,
  wonByMove,
  type GameMode,
  type Seat,
  type SeatToken,
  type SnapshotBoard,
} from "@ludo/shared";
import { seatView } from "./seatView";

// How the viewer sees the Seats of a Board, from their own Seat clockwise.

/**
 * The Player name of a Seat's Player, or nothing for an empty Seat. Players are named by their Player name, never by
 * colour, as each sees the Seats in different colours.
 */
export const playerNameAt = (board: SnapshotBoard, seat: Seat) => board.seats[seat]?.playerName ?? "";

/** The Seat this many Seats clockwise from the viewer's. */
export const seatAt = (board: SnapshotBoard, seatsFromViewer: number): Seat =>
  (board.seat + seatsFromViewer) % classicRules.seats;

/** How the viewer sees a Seat: its colours, and the corner of the Board its Yard is in. */
export const seatViewOf = (board: SnapshotBoard, seat: Seat) => seatView(seatsClockwise(board.seat, seat));

/** How many of a Seat's Tokens are Home. */
export const homeCountAt = (board: SnapshotBoard, seat: Seat) => tokensHome(board.seats[seat]?.tokens ?? []);

/** How many Players the Game started with, counting any who have since Left. */
export const playerCountAt = (board: SnapshotBoard) => board.seats.filter((seat) => seat.playerName !== null).length;

/** The Seat whose Player won the Game, for the Board of a won Game. */
export const winnerAt = (board: SnapshotBoard): Seat => board.winner ?? board.turn;

/**
 * How a won Game was won: by the winner's last Move, as the Game mode's rules say, or, if not, by everyone else
 * Leaving. With the Tokens that Move Captured, if any.
 */
export const howWonAt = (
  mode: GameMode,
  board: SnapshotBoard,
): { how: "allHome" | "capture" | "othersLeft"; captured: SeatToken[] } => {
  const winner = winnerAt(board);
  const { lastMove } = board;
  const captured = lastMove?.seat === winner ? lastMove.captured : [];
  if (!wonByMove(mode, { tokens: board.seats[winner]?.tokens ?? [], captured })) return { how: "othersLeft", captured };
  return { how: isWonByCapture(mode) ? "capture" : "allHome", captured };
};
