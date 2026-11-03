import type { CSSProperties } from "react";
import { classicRules, seatsClockwise, type Seat, type SnapshotBoard, type TokenPosition } from "@ludo/shared";
import { boardMessages } from "./messages";
import { seatView, type Cell } from "./seatView";

interface Props {
  board: SnapshotBoard;
  disabled: boolean;
  /** Called with one of the viewer's Tokens that can Move, when they pick it. */
  onMove: (token: number) => void;
}

/**
 * How many Cells across the standard Board is: a Yard in each corner, the cross-shaped Track between them, and Home
 * in the middle.
 */
const size = 15;

/** How many Cells across each Yard is. */
const yardSize = 6;

// The viewer's own Seat sits bottom-left, with its Home column up the bottom arm, and its stretch of the Track
// starting beside it: its Start cell, then each Cell clockwise up to the next Seat's Start cell. Each Seat clockwise
// from theirs has these turned a quarter turn further clockwise about the centre.
const ownHomeColumn: Cell[] = [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]];
const ownTrackStretch: Cell[] = [
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0],
];
const ownStartCell = ownTrackStretch[0] as Cell;

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

const sameCell = (cell: Cell | null, other: Cell) => cell?.[0] === other[0] && cell[1] === other[1];

const cellColour = (cell: Cell) => colouredCells.find((coloured) => sameCell(coloured.cell, cell))?.colour ?? "white";

// Home's four quarters, clockwise from the top, each in the colour of the Seat whose Home column leads into it. The
// viewer's own comes in from the bottom, two quarters on from the top, and each Seat clockwise from theirs one more.
const homeColours = Array.from({ length: 4 }, (_, quarter) => seatView((quarter + 2) % 4).colour);
const homeBackground = `conic-gradient(from -45deg, ${
  homeColours.map((colour, index) => `${colour} ${index * 25}% ${(index + 1) * 25}%`).join(", ")
})`;

/** Where a Token of the Seat is drawn, if it's on the Track or in its Home column, for a viewer in this Seat. */
const gridCell = (position: TokenPosition, seat: Seat, viewer: Seat): Cell | null => {
  if (position.area === "track") {
    // The Track's Cells are numbered clockwise from Seat 0's Start cell, a stretch for each Seat.
    const stretchSeat = Math.floor(position.cell / ownTrackStretch.length);
    const cell = ownTrackStretch[position.cell % ownTrackStretch.length] as Cell;
    return turnClockwise(cell, seatsClockwise(viewer, stretchSeat));
  }
  if (position.area === "homeColumn") {
    return turnClockwise(ownHomeColumn[position.cell] as Cell, seatsClockwise(viewer, seat));
  }
  return null;
};

/** One Seat's Tokens that share a place on the Board, by their place in the Seat's list of Tokens. */
interface TokenGroup {
  seat: Seat;
  tokens: number[];
}

/** The Tokens on each Cell of the cross, grouped by Seat. */
const tokensOnCross = (board: SnapshotBoard) => {
  const places: { cell: Cell; groups: TokenGroup[] }[] = [];
  board.seats.forEach(({ tokens }, seat) => {
    tokens.forEach((position, token) => {
      const cell = gridCell(position, seat, board.seat);
      if (!cell) return;
      let place = places.find((place) => sameCell(place.cell, cell));
      if (!place) places.push(place = { cell, groups: [] });
      const group = place.groups.find((group) => group.seat === seat);
      if (group) group.tokens.push(token);
      else place.groups.push({ seat, tokens: [token] });
    });
  });
  return places;
};

/** The Tokens Home, grouped by Seat. */
const tokensHome = (board: SnapshotBoard): TokenGroup[] => {
  return board.seats
    .map(({ tokens }, seat) => ({
      seat,
      tokens: tokens.flatMap((position, token) => (position.area === "home" ? [token] : [])),
    }))
    .filter((group) => group.tokens.length > 0);
};

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

/** Marks the Cell the last Move came from with a dotted outline, and the one it went to with a dashed one. */
const lastMoveOutline = (isFrom: boolean, isTo: boolean) => {
  if (isTo) return "outline-3 -outline-offset-3 outline-dashed outline-black";
  if (isFrom) return "outline-2 -outline-offset-2 outline-dotted outline-black";
  return "";
};

const tokenClassName = "flex aspect-square h-full max-h-6 items-center justify-center rounded-full border " +
  "border-black p-0 text-[10px] leading-none font-bold";

export default function Board({ board, disabled, onMove }: Props) {
  const { lastMove } = board;
  const lastMoveFrom = lastMove && gridCell(lastMove.from, lastMove.seat, board.seat);
  const lastMoveTo = lastMove && gridCell(lastMove.to, lastMove.seat, board.seat);

  // A Seat's Tokens in one place, shown as one Token with how many there are. The viewer's own are a button while
  // any of them can Move: they'd all end up in the same place, so it Moves the first.
  const tokenGroup = ({ seat, tokens }: TokenGroup) => {
    const { colour } = seatView(seatsClockwise(board.seat, seat));
    const count = tokens.length > 1 ? tokens.length : null;
    const movable = seat === board.seat ? tokens.find((token) => board.moves.includes(token)) : undefined;
    if (movable === undefined) {
      const playerName = board.seats[seat]?.playerName ?? "";
      return (
        <span
          key={seat}
          className={tokenClassName}
          style={{ backgroundColor: colour }}
          title={boardMessages.tokens(playerName, tokens.length)}
        >
          {count}
        </span>
      );
    }
    return (
      <button
        key={seat}
        type="button"
        // Unlike the black outlines that mark the last Move, so the two can't be mixed up.
        className={`${tokenClassName} cursor-pointer ring-3 ring-white ring-inset motion-safe:animate-bounce`}
        style={{ backgroundColor: colour }}
        aria-label={boardMessages.moveToken(tokens.length)}
        disabled={disabled}
        onClick={() => onMove(movable)}
      >
        {count}
      </button>
    );
  };

  return (
    <div
      className="grid aspect-square w-full max-w-lg border"
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }}
    >
      {crossCells.map((cell) => (
        <div
          key={cell.join()}
          className={`border border-black/30 ${
            lastMoveOutline(sameCell(lastMoveFrom, cell), sameCell(lastMoveTo, cell))
          }`}
          style={{ ...gridArea(cell), backgroundColor: cellColour(cell) }}
        />
      ))}
      {tokensOnCross(board).map(({ cell, groups }) => (
        <div key={cell.join()} className="flex items-center justify-center gap-px p-[10%]" style={gridArea(cell)}>
          {groups.map(tokenGroup)}
        </div>
      ))}
      <div
        className={`flex flex-wrap content-center items-center justify-center gap-1 border border-black/30 p-[10%] ${
          lastMoveOutline(false, lastMove?.to.area === "home")
        }`}
        style={{ ...gridArea([yardSize, yardSize], size - 2 * yardSize), background: homeBackground }}
      >
        {tokensHome(board).map((group) => <div key={group.seat} className="h-1/3">{tokenGroup(group)}</div>)}
      </div>
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
              {/* The Tokens still in the Yard, each on its own. */}
              <div className="grid grid-cols-2 gap-1">
                {tokens.map((position, token) => position.area === "yard" && (
                  <div key={token} className="size-4 sm:size-6">{tokenGroup({ seat, tokens: [token] })}</div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
