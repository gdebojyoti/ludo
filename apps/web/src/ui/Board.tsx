import type { CSSProperties } from "react";
import { classicRules, seatsClockwise, type Seat, type SnapshotBoard } from "@ludo/shared";
import { boardMessages } from "./messages";
import { seatView, type Cell } from "./seatView";

interface Props {
  board: SnapshotBoard;
}

/**
 * How many Cells across the standard Board is: a Yard in each corner, the cross-shaped Track between them, and Home
 * in the middle.
 */
const size = 15;

/** How many Cells across each Yard is. */
const yardSize = 6;

// The viewer's own Seat sits bottom-left, with its Home column up the bottom arm and its Start cell beside it. Each
// Seat clockwise from theirs has these turned a quarter turn further clockwise about the centre.
const ownHomeColumn: Cell[] = [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]];
const ownStartCell: Cell = [13, 6];

const turnClockwise = ([row, column]: Cell, quarterTurns: number): Cell => {
  if (quarterTurns === 0) return [row, column];
  return turnClockwise([column, size - 1 - row], quarterTurns - 1);
};

/** Whether a row or column runs through an arm of the cross, between the Yards. */
const isOnArm = (index: number) => index >= yardSize && index < size - yardSize;

/** Every Cell of the Track and the Home columns: the cross, without Home in its middle. */
const crossCells = Array.from({ length: size * size }, (_, index): Cell => [Math.floor(index / size), index % size])
  .filter(([row, column]) => isOnArm(row) !== isOnArm(column));

/** The Home columns and Start cells, each in its Seat's colour. */
const colouredCells = Array.from({ length: classicRules.seats }, (_, quarterTurns) => {
  const { colour } = seatView(quarterTurns);
  return [...ownHomeColumn, ownStartCell].map((cell) => ({ cell: turnClockwise(cell, quarterTurns), colour }));
}).flat();

const cellColour = ([row, column]: Cell) => {
  return colouredCells.find(({ cell }) => cell[0] === row && cell[1] === column)?.colour ?? "white";
};

// Home's four quarters, clockwise from the top, each in the colour of the Seat whose Home column leads into it. The
// viewer's own comes in from the bottom, two quarters on from the top, and each Seat clockwise from theirs one more.
const homeColours = Array.from({ length: 4 }, (_, quarter) => seatView((quarter + 2) % 4).colour);
const homeBackground = `conic-gradient(from -45deg, ${
  homeColours.map((colour, index) => `${colour} ${index * 25}% ${(index + 1) * 25}%`).join(", ")
})`;

/** Where a square of Cells goes in the grid, from its top-left Cell. */
const gridArea = ([row, column]: Cell, span = 1): CSSProperties => ({
  gridRow: `${row + 1} / span ${span}`,
  gridColumn: `${column + 1} / span ${span}`,
});

/** What a Seat's Yard is labelled with: its Player name, marked if it's the viewer's own, or that it's empty. */
const seatLabel = (playerName: string | null, isOwn: boolean) => {
  if (playerName === null) return boardMessages.emptySeat;
  return isOwn ? `${playerName} (${boardMessages.you})` : playerName;
};

export default function Board({ board }: Props) {
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
      <div
        className="border border-black/30"
        style={{ ...gridArea([yardSize, yardSize], size - 2 * yardSize), background: homeBackground }}
      />
      {board.seats.map(({ playerName, tokens }, seat: Seat) => {
        const { colour, yardCorner } = seatView(seatsClockwise(board.seat, seat));
        return (
          <div key={seat} className="flex p-[8%]" style={{ ...gridArea(yardCorner, yardSize), backgroundColor: colour }}>
            {/* The Seat whose Turn it is is outlined. */}
            <div
              className={`flex flex-1 flex-col items-center justify-center gap-2 bg-white p-1 ${
                board.turn === seat ? "outline-4 outline-black" : ""
              }`}
            >
              <p className="m-0 text-center text-xs leading-tight wrap-anywhere">
                {seatLabel(playerName, seat === board.seat)}
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
