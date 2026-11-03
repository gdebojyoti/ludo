// The only place a Seat is given a colour, and the corner of the Board its Yard is in (ADR-0006). Each Player sees
// their own Seat bottom-left, in red, and the other Seats clockwise from it in green, yellow and blue, so two Players
// can both see themselves as red.

/** A Cell of the Board's grid, counting rows down from the top, and columns right from the left. */
export type Cell = [row: number, column: number];

/** How the viewer sees one Seat. */
interface SeatView {
  colour: string;
  /** The colour of text, such as an initial, on the Seat's colour. */
  textColour: string;
  /** The top-left Cell of the Seat's Yard. */
  yardCorner: Cell;
}

/** How the viewer sees each Seat, from their own, clockwise. */
const seatViews: SeatView[] = [
  { colour: "#d2462e", textColour: "#fff8e8", yardCorner: [9, 0] },
  { colour: "#1f7a4d", textColour: "#fff8e8", yardCorner: [0, 0] },
  { colour: "#e3a21a", textColour: "#3b1218", yardCorner: [0, 9] },
  { colour: "#2f4a9e", textColour: "#fff8e8", yardCorner: [9, 9] },
];

/** The colour of an empty Seat's Yard and its quarter of Home. */
export const emptySeatColour = "#e3d3ae";

/** How the viewer sees the Seat this many Seats clockwise from their own: 0 to 3. */
export const seatView = (seatsFromViewer: number): SeatView => seatViews[seatsFromViewer] as SeatView;
