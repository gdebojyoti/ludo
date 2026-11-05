import { classicRules, seatsClockwise, tokensHome, type Seat, type SnapshotBoard } from "@ludo/shared";
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
