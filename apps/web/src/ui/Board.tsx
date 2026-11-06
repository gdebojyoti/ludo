import type { CSSProperties } from "react";
import {
  classicRules,
  positionsAlong,
  seatsClockwise,
  tokensHome,
  tokensReachHome,
  type GameMode,
  type Seat,
  type SeatToken,
  type SnapshotBoard,
  type TokenPosition,
} from "@ludo/shared";
import { homeCountAt, playerNameAt, seatAt, seatViewOf } from "./boardView";
import MovingToken from "./MovingToken";
import { boardMessages } from "./messages";
import { emptySeatColour, seatView, type Cell } from "./seatView";
import type { TokenMoving } from "./useBoardPlayback";

interface Props {
  mode: GameMode;
  board: SnapshotBoard;
  disabled: boolean;
  /** Called with one of the viewer's Tokens that can Move, when they pick it. */
  onMove: (token: number) => void;
  /**
   * A Token Moving by its Roll, the viewer's or another Player's: it's drawn sliding there from where the Board has it,
   * and nothing on the Board can be picked until it's arrived.
   */
  moving: TokenMoving | undefined;
  /** Called once the Token that's Moving has arrived. */
  onArrived: () => void;
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
const ownStarCell = ownTrackStretch[classicRules.starCellOffset] as Cell;

const turnClockwise = ([row, column]: Cell, quarterTurns: number): Cell => {
  if (quarterTurns === 0) return [row, column];
  return turnClockwise([column, size - 1 - row], quarterTurns - 1);
};

/**
 * The Cell where the viewer's Tokens turn into their Home column: the last but one of the Seat's before theirs, at the
 * foot of the bottom arm. In a Game mode with no Home column, the Track carries on to its left from here.
 */
const ownTurnInCell = turnClockwise(ownTrackStretch.at(-2) as Cell, classicRules.seats - 1);

/**
 * Pointing on along the Track from where a Seat's Tokens would turn into its Home column, for the Seat this many Seats
 * clockwise from the viewer's.
 */
const carryOnArrow = (turns: number) => (
  <svg className="ludo-carry-on" style={{ rotate: `${turns * 90}deg` }} viewBox="0 0 24 24" aria-hidden>
    <path d="M19 12H6M11 6.5L5.5 12l5.5 5.5" />
  </svg>
);

/** Whether a row or column runs through an arm of the cross, between the Yards. */
const isOnArm = (index: number) => index >= yardSize && index < size - yardSize;

/** Every Cell of the Track and the Home columns: the cross, without Home in its middle. */
const crossCells = Array.from({ length: size * size }, (_, index): Cell => [Math.floor(index / size), index % size])
  .filter(([row, column]) => isOnArm(row) !== isOnArm(column));

const cellKey = ([row, column]: Cell) => `${row},${column}`;

const quarterTurns = Array.from({ length: classicRules.seats }, (_, turns) => turns);

const yardSlots = Array.from({ length: classicRules.tokensPerSeat }, (_, slot) => slot);

/** The Home columns and Start cells, each in the colour of the Seat this many Seats clockwise from the viewer's. */
const colouredCells = new Map(quarterTurns.flatMap((turns) =>
  [...ownHomeColumn, ownStartCell].map((cell) => [cellKey(turnClockwise(cell, turns)), turns] as const),
));

/** The Home columns' Cells. */
const homeColumnCells = new Set(quarterTurns.flatMap((turns) =>
  ownHomeColumn.map((cell) => cellKey(turnClockwise(cell, turns))),
));

/**
 * The Cells where each Seat's Tokens turn into their Home column, by how many Seats clockwise from the viewer's that
 * Seat is.
 */
const turnInCells = new Map(quarterTurns.map((turns) => [cellKey(turnClockwise(ownTurnInCell, turns)), turns]));

/** The Cells drawn with a star: the Start cells, and the Star cells. */
const starredCells = new Set(quarterTurns.flatMap((turns) =>
  [ownStartCell, ownStarCell].map((cell) => cellKey(turnClockwise(cell, turns))),
));

/** The Star cells, drawn in parchment rather than ivory. The Start cells have their Seats' colours instead. */
const starCells = new Set(quarterTurns.map((turns) => cellKey(turnClockwise(ownStarCell, turns))));

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

/** The middle of a spot in a quarter of Home, in Cells of the grid. Home is 3 Cells across, from the 7th. */
const homeSpotCentre = (turns: number, count: number, spot: number): Cell => {
  const [across, inFromEdge] = homeSpots[count]?.[spot] as [number, number];
  const [x, y] = (homeSpotTurns[turns] as (typeof homeSpotTurns)[number])(across, inFromEdge);
  return [5.5 + (y / 70) * 3, 5.5 + (x / 70) * 3];
};

// How far the middle of each slot in a Yard is from the Yard's middle, across and down, in Cells: half a slot and
// half the gap between slots, 15 design pixels, on the design's 360px Board.
const yardSlotOffset = 15 / ((360 - 14) / 15 + 1);

/** The middle of a slot in a Yard, from the Yard's top-left Cell, in Cells of the grid. Slots go across, then down. */
const yardSlotCentre = ([row, column]: Cell, slot: number): Cell => [
  row + (yardSize - 1) / 2 + (slot < 2 ? -1 : 1) * yardSlotOffset,
  column + (yardSize - 1) / 2 + (slot % 2 ? 1 : -1) * yardSlotOffset,
];

const starIcon = (onColour: boolean) => (
  <svg className={`ludo-star ${onColour ? "ludo-star-on-colour" : ""}`} viewBox="0 0 24 24" aria-hidden>
    <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />
  </svg>
);

export default function Board({ mode, board, disabled, onMove, moving, onArrived }: Props) {
  const viewer = board.seat;
  // A Game mode whose Tokens never reach Home greys out the Home columns and Home, which it doesn't use.
  const usesHome = tokensReachHome(mode);
  const fromViewer = (seat: Seat) => seatsClockwise(viewer, seat);
  const colourOf = (seat: Seat) => seatViewOf(board, seat).colour;
  const isMoving = ({ seat, token }: SeatToken) => seat === moving?.seat && token === moving.token;
  // Nothing can be picked while a Token is Moving.
  const isMovable = ({ seat, token }: SeatToken) =>
    moving === undefined && seat === viewer && board.moves.includes(token);
  const isEmptySeat = (seat: Seat) => {
    const snapshotSeat = board.seats[seat];
    return !snapshotSeat || snapshotSeat.playerName === null || snapshotSeat.left;
  };

  // The Tokens on each Cell of the cross, in Seat order clockwise from the viewer's.
  const tokensOnCells = new Map<string, SeatToken[]>();
  board.seats.forEach(({ tokens }, seat) => tokens.forEach((position, token) => {
    const cell = gridCell(position, seat, viewer);
    if (!cell || isMoving({ seat, token })) return;
    const key = cellKey(cell);
    tokensOnCells.set(key, [...(tokensOnCells.get(key) ?? []), { seat, token }]);
  }));
  tokensOnCells.forEach((placed) => placed.sort((a, b) => fromViewer(a.seat) - fromViewer(b.seat)));

  // Players tap a Cell, not a Token, so it's the Cell that's described.
  const describe = (placed: SeatToken[]) => {
    const seats = [...new Set(placed.map(({ seat }) => seat))];
    return boardMessages.tokensHere(seats.map((seat) => ({
      playerName: playerNameAt(board, seat),
      isOwn: seat === viewer,
      count: placed.filter((token) => token.seat === seat).length,
    })));
  };

  const tokenSpan = (placed: SeatToken, index: number) => (
    <span
      key={index}
      className={`ludo-token ${isMovable(placed) ? "ludo-token-movable" : ""}`}
      style={{ backgroundColor: colourOf(placed.seat) }}
    />
  );

  // 1 Token full size; 2 to 4 smaller, together; 5 or more as a count, ringed in each Seat's share.
  const tokensDrawing = (placed: SeatToken[], movable: boolean) => {
    if (placed.length === 1) return tokenSpan(placed[0] as SeatToken, 0);
    if (placed.length <= 4) {
      return <div className={`ludo-stack ludo-stack-${placed.length}`}>{placed.map(tokenSpan)}</div>;
    }
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
        <span
          className={`ludo-chip-count ${movable ? "ludo-chip-count-movable" : ""}`}
          style={movable ? { backgroundColor: colourOf(viewer) } : undefined}
        >
          {placed.length}
        </span>
      </div>
    );
  };

  const crossCell = (cell: Cell) => {
    const key = cellKey(cell);
    const placed = tokensOnCells.get(key) ?? [];
    const colourTurns = colouredCells.get(key);
    const turnInTurns = turnInCells.get(key);
    // An empty Seat's Home column and Start cell are neutral, like its Yard, as is any unused Home column.
    const isUnusedHomeColumn = !usesHome && homeColumnCells.has(key);
    const seatColour = colourTurns === undefined
      ? undefined
      : isEmptySeat(seatAt(board, colourTurns)) || isUnusedHomeColumn ? emptySeatColour : seatView(colourTurns).colour;
    const style = { ...gridArea(cell), ...(seatColour ? { backgroundColor: seatColour } : {}) };
    const content = (
      <>
        {placed.length < 2 && starredCells.has(key) &&
          starIcon(seatColour !== undefined && seatColour !== emptySeatColour)}
        {!usesHome && placed.length < 2 && turnInTurns !== undefined && carryOnArrow(turnInTurns)}
        {placed.length > 0 && tokensDrawing(placed, placed.some(isMovable))}
      </>
    );
    const className = `ludo-cell ${isUnusedHomeColumn ? "ludo-cell-closed" : ""} ${
      starCells.has(key) ? "ludo-cell-star" : ""
    }`;
    // Any of the viewer's Tokens here that can Move would end up in the same place, so the Cell Moves the first.
    const movable = placed.find(isMovable);
    if (movable) {
      return (
        <button
          key={key}
          type="button"
          className={`${className} ludo-cell-movable`}
          style={style}
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
        className={className}
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
      position.area === "yard" && !isMoving({ seat, token }) ? [{ seat, token }] : [],
    );
    const empty = isEmptySeat(seat);
    const label = empty
      ? boardMessages.emptySeat
      : boardMessages.yardOf(playerNameAt(board, seat), seat === viewer, inYard.length);
    const slots = (
      <div className="ludo-yard-inner">
        {yardSlots.map((slot) => (
          <div key={slot} className="ludo-slot">{inYard[slot] && tokenSpan(inYard[slot], slot)}</div>
        ))}
      </div>
    );
    const className = `ludo-yard ${empty ? "ludo-yard-empty" : ""}`;
    const style = { ...gridArea(yardCorner, yardSize), backgroundColor: empty ? emptySeatColour : colour };
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
    const seat = seatAt(board, turns);
    return { seat, turns, count: homeCountAt(board, seat) };
  });
  const homeLabel = boardMessages.homeLabel(
    homeCounts
      .filter(({ seat }) => !isEmptySeat(seat))
      .map(({ seat, count }) => ({ playerName: playerNameAt(board, seat), isOwn: seat === viewer, count })),
  );

  // Where the Token that's Moving starts, then each place it stands on: its slot in the Yard, or its Cell, then each
  // Cell along its Move, and its spot in Home if it ends there.
  const movingPath = ({ seat, token, number }: TokenMoving): Cell[] => {
    const tokens = board.seats[seat]?.tokens ?? [];
    const from = tokens[token];
    if (!from) return [];
    const turns = fromViewer(seat);
    const homeCount = tokensHome(tokens);
    const yardSlot = tokens.slice(0, token).filter((position) => position.area === "yard").length;
    const placeOf = (position: TokenPosition): Cell => {
      if (position.area === "yard") return yardSlotCentre(seatView(turns).yardCorner, yardSlot);
      if (position.area === "home") return homeSpotCentre(turns, homeCount + 1, homeCount);
      return gridCell(position, seat, viewer) as Cell;
    };
    return [from, ...positionsAlong(mode, seat, from, number)].map(placeOf);
  };
  const path = moving ? movingPath(moving) : [];
  const movingFrom = path[0];

  return (
    <div className="ludo-board">
      {quarterTurns.map((turns) => yard(seatAt(board, turns)))}
      <div className="ludo-home" {...(usesHome ? { role: "img", "aria-label": homeLabel } : { "aria-hidden": true })}>
        <svg viewBox="0 0 3 3" width="100%" height="100%" preserveAspectRatio="none" aria-hidden>
          {homeTriangles.map((points, turns) => (
            <polygon
              key={points}
              points={points}
              fill={!usesHome || isEmptySeat(seatAt(board, turns)) ? emptySeatColour : seatView(turns).colour}
            />
          ))}
          <circle cx="1.5" cy="1.5" r="0.32" className="fill-ludo-ivory stroke-ludo-gold" strokeWidth="0.08" />
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
      {moving && movingFrom && (
        <MovingToken
          // Where it starts, too, so a Token that Moves again before it's arrived starts its new path afresh.
          key={`${moving.seat}-${moving.token}-${movingFrom.join()}`}
          path={path}
          colour={colourOf(moving.seat)}
          onArrived={onArrived}
        />
      )}
    </div>
  );
}
