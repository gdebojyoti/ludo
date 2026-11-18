// The only place a Seat is given a colour, and the corner of the Board its Yard is in (ADR-0006). Each Player sees
// their own Seat bottom-left, in red, and the other Seats clockwise from it in green, yellow and blue, so two Players
// can both see themselves as red. The shades are the theme's, set in ludo.css, so a Seat's colour is the variable
// that holds it: fine for CSS, and for SVG shapes filled through their style, but not their fill attribute.

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
const seatViews: SeatView[] = ([[9, 0], [0, 0], [0, 9], [9, 9]] as Cell[]).map((yardCorner, seatsFromViewer) => ({
  colour: `var(--ludo-seat-${seatsFromViewer})`,
  textColour: `var(--ludo-seat-text-${seatsFromViewer})`,
  yardCorner,
}));

/** The colour of an empty Seat's Yard, Start cell, Home column and quarter of Home. */
export const emptySeatColour = "var(--ludo-seat-empty)";

/** How the viewer sees the Seat this many Seats clockwise from their own: 0 to 3. */
export const seatView = (seatsFromViewer: number): SeatView => seatViews[seatsFromViewer] as SeatView;
