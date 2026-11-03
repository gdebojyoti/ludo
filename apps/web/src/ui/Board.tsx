import type { CSSProperties } from "react";
import { seatsClockwise, type GameSnapshot, type Seat } from "@ludo/shared";
import { boardMessages } from "./messages";
import { coloursFromViewer, yardCorners, type Cell } from "./seatView";

interface Props {
  /** A Game that has started. */
  game: GameSnapshot;
  /** The viewer's own Seat, drawn bottom-left. */
  viewerSeat: Seat;
}

// The standard Board as a grid of 15 × 15 Cells: a Yard in each corner, the cross-shaped Track between them, and Home
// in the middle.
const size = 15;

// The viewer's own Seat sits bottom-left, with its Home column up the bottom arm and its Start cell beside it. Each
// Seat clockwise from theirs has these turned a quarter turn further clockwise about the centre.
const ownHomeColumn: Cell[] = [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]];
const ownStartCell: Cell = [13, 6];

/** How many Cells across each Yard is. */
const yardSize = 6;

const turnClockwise = ([row, column]: Cell, quarterTurns: number): Cell => {
  if (quarterTurns === 0) return [row, column];
  return turnClockwise([column, size - 1 - row], quarterTurns - 1);
};

const isOnArm = (index: number) => index >= 6 && index <= 8;

/** Every Cell of the Track and the Home columns: the cross, without Home in its middle. */
const crossCells = Array.from({ length: size * size }, (_, index): Cell => [Math.floor(index / size), index % size])
  .filter(([row, column]) => isOnArm(row) !== isOnArm(column));

/** The Home columns and Start cells, each in its Seat's colour. */
const colouredCells = coloursFromViewer.flatMap((colour, quarterTurns) => {
  return [...ownHomeColumn, ownStartCell].map((cell) => ({ cell: turnClockwise(cell, quarterTurns), colour }));
});

const cellColour = ([row, column]: Cell) => {
  return colouredCells.find(({ cell }) => cell[0] === row && cell[1] === column)?.colour ?? "white";
};

// Home's four quarters, each in the colour of the Seat whose Home column leads into it, clockwise from the top.
const homeColours = [2, 3, 0, 1].map((quarterTurns) => coloursFromViewer[quarterTurns]);
const homeBackground = `conic-gradient(from -45deg, ${
  homeColours.map((colour, index) => `${colour} ${index * 25}% ${(index + 1) * 25}%`).join(", ")
})`;

/** Where a square of Cells goes in the grid, from its top-left Cell. */
const gridArea = ([row, column]: Cell, span = 1): CSSProperties => ({
  gridRow: `${row + 1} / span ${span}`,
  gridColumn: `${column + 1} / span ${span}`,
});

export default function Board({ game, viewerSeat }: Props) {
  return (
    <div
      className="grid aspect-square w-full max-w-lg border"
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }}
    >
      {crossCells.map((cell) => (
        <div
          key={cell.join()}
          className="border border-black/30"
          style={{ ...gridArea(cell), backgroundColor: cellColour(cell) }}
        />
      ))}
      <div className="border border-black/30" style={{ ...gridArea([6, 6], 3), background: homeBackground }} />
      {game.seats.map(({ playerName, tokens }, seat) => {
        const quarterTurns = seatsClockwise(viewerSeat, seat);
        const colour = coloursFromViewer[quarterTurns];
        const isTurn = game.turn === seat;
        return (
          <div
            key={seat}
            className="flex p-[8%]"
            style={{ ...gridArea(yardCorners[quarterTurns] ?? [0, 0], yardSize), backgroundColor: colour }}
          >
            {/* The Seat whose Turn it is is outlined. */}
            <div
              className={`flex flex-1 flex-col items-center justify-center gap-2 bg-white p-1 ${
                isTurn ? "outline-4 outline-black" : ""
              }`}
            >
              <p className="m-0 text-center text-xs leading-tight wrap-anywhere">
                {playerName === null && boardMessages.emptySeat}
                {playerName !== null && seat === viewerSeat && `${playerName} (${boardMessages.you})`}
                {playerName !== null && seat !== viewerSeat && playerName}
              </p>
              {/* Every Token is in its Yard when the Game starts. */}
              <div className="grid grid-cols-2 gap-1">
                {tokens.map((_, index) => (
                  <span
                    key={index}
                    className="block size-4 rounded-full border border-black sm:size-6"
                    style={{ backgroundColor: colour }}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
