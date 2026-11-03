import type { CSSProperties } from "react";
import {
  classicRules,
  seatsClockwise,
  type Seat,
  type SnapshotBoard,
  type TokenPosition,
} from "@ludo/shared";
import { boardMessages } from "./messages";
import { emptySeatColour, seatView, type Cell } from "./seatView";

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

/** How many Cells on from its Start cell each Star cell is, along the Track. */
const starCellOffset = 8;

// The viewer's own Seat sits bottom-left, with its Home column up the bottom arm, and its stretch of the Track
// starting beside it: its Start cell, then each Cell clockwise up to the next Seat's Start cell. Each Seat clockwise
// from theirs has these turned a quarter turn further clockwise about the centre.
const ownHomeColumn: Cell[] = [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]];
const ownTrackStretch: Cell[] = [
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0],
];
const ownStartCell = ownTrackStretch[0] as Cell;
const ownStarCell = ownTrackStretch[starCellOffset] as Cell;

const turnClockwise = ([row, column]: Cell, quarterTurns: number): Cell => {
  if (quarterTurns === 0) return [row, column];
  return turnClockwise([column, size - 1 - row], quarterTurns - 1);
};

/** Whether a row or column runs through an arm of the cross, between the Yards. */
const isOnArm = (index: number) => index >= yardSize && index < size - yardSize;

/** Every Cell of the Track and the Home columns: the cross, without Home in its middle. */
const crossCells = Array.from({ length: size * size }, (_, index): Cell => [Math.floor(index / size), index % size])
  .filter(([row, column]) => isOnArm(row) !== isOnArm(column));

const cellKey = ([row, column]: Cell) => `${row},${column}`;

const quarterTurns = Array.from({ length: classicRules.seats }, (_, turns) => turns);

/** The Home columns and Start cells, each in the colour of the Seat this many Seats clockwise from the viewer's. */
const colouredCells = new Map(quarterTurns.flatMap((turns) =>
  [...ownHomeColumn, ownStartCell].map((cell) => [cellKey(turnClockwise(cell, turns)), turns] as const),
));

/** The Cells drawn with a star: the Start cells, and the Star cells. */
const starredCells = new Set(quarterTurns.flatMap((turns) =>
  [ownStartCell, ownStarCell].map((cell) => cellKey(turnClockwise(cell, turns))),
));

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

/** One Token, by its Seat and its place in the Seat's list of Tokens. */
interface PlacedToken {
  seat: Seat;
  token: number;
}

/** Where a square of Cells goes in the grid, from its top-left Cell. */
const gridArea = ([row, column]: Cell, span = 1): CSSProperties => ({
  gridRow: `${row + 1} / span ${span}`,
  gridColumn: `${column + 1} / span ${span}`,
});

// Home's quarters, each a triangle pointing in from the side its Seat's Home column comes from, by how many Seats
// clockwise from the viewer's that Seat is: the viewer's own from the bottom, then left, top and right.
const homeTriangles = ["0,3 3,3 1.5,1.5", "0,0 1.5,1.5 0,3", "0,0 3,0 1.5,1.5", "3,0 3,3 1.5,1.5"];

// Where Tokens Home sit in their Seat's quarter, in a 70-unit square: across it, then in from its outer edge.
const homeSpots: [across: number, inFromEdge: number][][] = [
  [],
  [[35, 7]],
  [[29, 7], [41, 7]],
  [[23, 7], [35, 7], [47, 7]],
  [[23, 7], [35, 7], [47, 7], [35, 19]],
];
const homeSpotTurns: ((across: number, inFromEdge: number) => [x: number, y: number])[] = [
  (across, inFromEdge) => [across, 70 - inFromEdge],
  (across, inFromEdge) => [inFromEdge, across],
  (across, inFromEdge) => [across, inFromEdge],
  (across, inFromEdge) => [70 - inFromEdge, across],
];
const homePercent = (units: number) => `${(units / 70) * 100}%`;

const starIcon = (onColour: boolean) => (
  <svg className={`ludo-star ${onColour ? "ludo-star-on-colour" : ""}`} viewBox="0 0 24 24" aria-hidden>
    <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />
  </svg>
);

export default function Board({ board, disabled, onMove }: Props) {
  const viewer = board.seat;
  const fromViewer = (seat: Seat) => seatsClockwise(viewer, seat);
  const colourOf = (seat: Seat) => seatView(fromViewer(seat)).colour;
  const playerName = (seat: Seat) => board.seats[seat]?.playerName ?? "";
  const isMovable = ({ seat, token }: PlacedToken) => seat === viewer && board.moves.includes(token);
  // The Seat this many Seats clockwise from the viewer's.
  const seatAt = (seatsFromViewer: number) => (viewer + seatsFromViewer) % classicRules.seats;
  const isEmptySeat = (seat: Seat) => {
    const snapshotSeat = board.seats[seat];
    return !snapshotSeat || snapshotSeat.playerName === null || snapshotSeat.left;
  };

  // The Tokens on each Cell of the cross, in Seat order clockwise from the viewer's.
  const tokensOnCells = new Map<string, PlacedToken[]>();
  board.seats.forEach(({ tokens }, seat) => tokens.forEach((position, token) => {
    const cell = gridCell(position, seat, viewer);
    if (!cell) return;
    const key = cellKey(cell);
    tokensOnCells.set(key, [...(tokensOnCells.get(key) ?? []), { seat, token }]);
  }));
  tokensOnCells.forEach((placed) => placed.sort((a, b) => fromViewer(a.seat) - fromViewer(b.seat)));

  // Players tap a Cell, not a Token, so it's the Cell that's described.
  const describe = (placed: PlacedToken[]) => {
    const seats = [...new Set(placed.map(({ seat }) => seat))];
    return boardMessages.tokensHere(seats.map((seat) => ({
      playerName: playerName(seat),
      isOwn: seat === viewer,
      count: placed.filter((token) => token.seat === seat).length,
    })));
  };

  const tokenSpan = (placed: PlacedToken, index: number) => (
    <span
      key={index}
      className={`ludo-token ${isMovable(placed) ? "ludo-token-movable" : ""}`}
      style={{ backgroundColor: colourOf(placed.seat) }}
    />
  );

  // 1 Token full size; 2 to 4 smaller, together; 5 or more as a count, ringed in each Seat's share.
  const tokensDrawing = (placed: PlacedToken[], movable: boolean) => {
    if (placed.length === 1) return tokenSpan(placed[0] as PlacedToken, 0);
    if (placed.length <= 4) return <div className={`ludo-stack ludo-stack-${placed.length}`}>{placed.map(tokenSpan)}</div>;
    let from = 0;
    const shares = placed.reduce<{ seat: Seat; count: number }[]>((shares, { seat }) => {
      const last = shares.at(-1);
      if (last?.seat === seat) last.count++;
      else shares.push({ seat, count: 1 });
      return shares;
    }, []);
    const ring = shares.map(({ seat, count }) => {
      const to = from + (count / placed.length) * 100;
      const stop = `${colourOf(seat)} ${from}% ${to}%`;
      from = to;
      return stop;
    });
    return (
      <div className="ludo-chip" style={{ background: `conic-gradient(${ring.join(", ")})` }}>
        <span className={`ludo-chip-count ${movable ? "ludo-chip-count-movable" : ""}`}>{placed.length}</span>
      </div>
    );
  };

  const crossCell = (cell: Cell) => {
    const key = cellKey(cell);
    const placed = tokensOnCells.get(key) ?? [];
    const colourTurns = colouredCells.get(key);
    // An empty Seat's Home column and Start cell are neutral, like its Yard.
    const seatColour = colourTurns === undefined
      ? undefined
      : isEmptySeat(seatAt(colourTurns)) ? emptySeatColour : seatView(colourTurns).colour;
    const style = { ...gridArea(cell), ...(seatColour ? { backgroundColor: seatColour } : {}) };
    const content = (
      <>
        {placed.length < 2 && starredCells.has(key) && starIcon(seatColour !== undefined && seatColour !== emptySeatColour)}
        {placed.length > 0 && tokensDrawing(placed, placed.some(isMovable))}
      </>
    );
    // Any of the viewer's Tokens here that can Move would end up in the same place, so the Cell Moves the first.
    const movable = placed.find(isMovable);
    if (movable) {
      return (
        <button
          key={key}
          type="button"
          // Its own colour gives way to gold, which marks a place the viewer can Move from.
          className="ludo-cell ludo-cell-movable"
          style={{ ...style, backgroundColor: undefined }}
          aria-label={boardMessages.moveFromHere(describe(placed))}
          disabled={disabled}
          onClick={() => onMove(movable.token)}
        >
          {content}
        </button>
      );
    }
    return (
      <div
        key={key}
        className="ludo-cell"
        style={style}
        role={placed.length ? "img" : undefined}
        aria-label={placed.length ? describe(placed) : undefined}
      >
        {content}
      </div>
    );
  };

  const yard = (seat: Seat) => {
    const { colour, yardCorner } = seatView(fromViewer(seat));
    const inYard = (board.seats[seat]?.tokens ?? []).flatMap((position, token) =>
      position.area === "yard" ? [{ seat, token }] : [],
    );
    const empty = isEmptySeat(seat);
    const label = empty
      ? boardMessages.emptySeat
      : boardMessages.yardOf(playerName(seat), seat === viewer, inYard.length);
    const slots = (
      <div className="ludo-yard-inner">
        {quarterTurns.map((slot) => (
          <div key={slot} className="ludo-slot">{inYard[slot] && tokenSpan(inYard[slot], slot)}</div>
        ))}
      </div>
    );
    const className = `ludo-yard ${empty ? "ludo-yard-empty" : ""}`;
    const style = { ...gridArea(yardCorner, yardSize), ...(empty ? {} : { backgroundColor: colour }) };
    const movable = inYard.find(isMovable);
    if (movable) {
      return (
        <button
          key={`yard-${seat}`}
          type="button"
          className={`${className} ludo-yard-movable`}
          style={style}
          aria-label={boardMessages.moveFromHere(label)}
          disabled={disabled}
          onClick={() => onMove(movable.token)}
        >
          {slots}
        </button>
      );
    }
    return <div key={`yard-${seat}`} className={className} style={style} role="img" aria-label={label}>{slots}</div>;
  };

  const homeCounts = quarterTurns.map((turns) => {
    const seat = seatAt(turns);
    return {
      seat,
      turns,
      count: (board.seats[seat]?.tokens ?? []).filter((position) => position.area === "home").length,
    };
  });
  const homeLabel = boardMessages.homeLabel(
    homeCounts
      .filter(({ seat }) => !isEmptySeat(seat))
      .map(({ seat, count }) => ({ playerName: playerName(seat), isOwn: seat === viewer, count })),
  );

  return (
    <div className="ludo-board">
      {quarterTurns.map((turns) => yard(seatAt(turns)))}
      <div className="ludo-home" role="img" aria-label={homeLabel}>
        <svg viewBox="0 0 3 3" width="100%" height="100%" preserveAspectRatio="none" aria-hidden>
          {homeTriangles.map((points, turns) => (
            <polygon
              key={points}
              points={points}
              fill={isEmptySeat(seatAt(turns)) ? emptySeatColour : seatView(turns).colour}
            />
          ))}
          <circle cx="1.5" cy="1.5" r="0.32" fill="#f7f0df" stroke="#e8b54a" strokeWidth="0.08" />
        </svg>
        {homeCounts.flatMap(({ seat, turns, count }) =>
          (homeSpots[count] ?? []).map(([across, inFromEdge], index) => {
            const [x, y] = (homeSpotTurns[turns] as (typeof homeSpotTurns)[number])(across, inFromEdge);
            return (
              <span
                key={`${seat}-${index}`}
                className="ludo-token"
                style={{ left: homePercent(x), top: homePercent(y), backgroundColor: colourOf(seat) }}
              />
            );
          }),
        )}
      </div>
      {crossCells.map(crossCell)}
    </div>
  );
}
