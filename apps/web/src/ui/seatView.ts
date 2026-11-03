// The only place a Seat is given a colour and a corner (ADR-0006). Each Player sees their own Seat bottom-left, in
// red, and the other Seats clockwise from it in green, yellow and blue, so two Players can both see themselves as red.
// Both lists are in that order: from the viewer's own Seat, clockwise.

/** A Cell of the Board's grid, counting rows down from the top, and columns right from the left. */
export type Cell = [row: number, column: number];

export const coloursFromViewer = ["#e53935", "#43a047", "#fdd835", "#1e88e5"];

/** The top-left Cell of each Seat's Yard. */
export const yardCorners: Cell[] = [[9, 0], [0, 0], [0, 9], [9, 9]];
