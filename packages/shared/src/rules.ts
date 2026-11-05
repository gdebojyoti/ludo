// The rules of the game, as constants and pure functions with no I/O. The server uses them to decide what's allowed,
// and is the only authority on them; the web app holds no game logic.

/**
 * The rules of Classic, the one Game mode in v1, that docs/game-modes/classic.md marks as ones later Game modes may
 * change. They're kept in one value so a Game mode can replace them together.
 */
export const classicRules = {
  /** The fewest Players a Game can start with. */
  minPlayers: 2,
  /** The most Players a Game can have, so the most a Lobby holds. A Game starts by itself when it has this many. */
  maxPlayers: 4,
  /** How many Seats the Board has, numbered clockwise from 0. */
  seats: 4,
  /** How many Tokens each Seat has, all in its Yard when the Game starts. */
  tokensPerSeat: 4,
  /** How many Cells the Track has. The Seats' Start cells are spaced evenly round it. */
  trackCells: 52,
  /** How many Cells each Home column has, leading from the Track to Home. */
  homeColumnCells: 5,
  /** The only Roll that brings a Token out of its Yard. */
  rollToLeaveYard: 6,
  /** How many Cells on from each Start cell, along the Track, its Star cell is. */
  starCellOffset: 8,
  /** The Roll whose Move earns the Player another Roll in the same Turn, however many times in a row. */
  rollToRollAgain: 6,
};

/** The Game modes a Game can follow, each a named set of rules. */
export const gameModes = ["classic", "oneKillWin"] as const;

export type GameMode = (typeof gameModes)[number];

/** Whether a value, such as one a Player sent, is a Game mode. */
export const isGameMode = (value: unknown): value is GameMode => gameModes.includes(value as GameMode);

/**
 * How each Game mode changes Classic's rules, as docs/game-modes describes. Every rule not here is Classic's, in
 * `classicRules`.
 */
const modeRules: Record<GameMode, {
  /** How many of each Seat's Tokens start the Game on its Start cell, rather than in its Yard. */
  tokensOnStartCell: number;
  /**
   * Whether Tokens turn into their Home column and go on to Home. Without one, they go round the Track again and
   * again, and never reach Home.
   */
  hasHomeColumn: boolean;
  /** What wins the Game: bringing all of a Seat's Tokens Home, or the first Capture. */
  wonBy: "allHome" | "capture";
}> = {
  classic: { tokensOnStartCell: 0, hasHomeColumn: true, wonBy: "allHome" },
  oneKillWin: { tokensOnStartCell: 2, hasHomeColumn: false, wonBy: "capture" },
};

/** How many faces the die has: a Roll is a whole number from 1 up to this. */
export const dieFaces = 6;

/** A place at the Board, numbered clockwise from 0. A Seat is never a colour (ADR-0006). */
export type Seat = number;

/**
 * Where a Token is. Cells are numbered by Seat, never by colour (ADR-0006): the Track's clockwise from Seat 0's Start
 * cell, and each Home column's from the Track towards Home.
 */
export type TokenPosition =
  | { area: "yard" }
  | { area: "track"; cell: number }
  | { area: "homeColumn"; cell: number }
  | { area: "home" };

/** How many Cells of the Track each Seat has, from its Start cell up to the next Seat's. */
const trackStretch = classicRules.trackCells / classicRules.seats;

/** The Seat's Start cell, on the Track. */
export const startCell = (seat: Seat): number => seat * trackStretch;

/** Whether the Track's Cell is a Safe cell, where no Token is Captured: a Start cell, or a Star cell. */
const isSafeCell = (cell: number): boolean => {
  const fromStart = cell % trackStretch;
  return fromStart === 0 || fromStart === classicRules.starCellOffset;
};

// A Token's journey, counted in Cells from its Start cell: round the Track to the tip of its own arm, just short of
// the Cell before its Start cell, then up its Home column, then Home.
const lastTrackDistance = classicRules.trackCells - 2;
const homeDistance = lastTrackDistance + classicRules.homeColumnCells + 1;

/** How far along its Seat's journey a Token out of the Yard is, in Cells from its Start cell. */
const distanceOf = (seat: Seat, position: Exclude<TokenPosition, { area: "yard" }>): number => {
  if (position.area === "track") {
    return (position.cell - startCell(seat) + classicRules.trackCells) % classicRules.trackCells;
  }
  if (position.area === "homeColumn") return lastTrackDistance + 1 + position.cell;
  return homeDistance;
};

/** Where a Token of the Seat is, this many Cells along its journey. */
const positionAt = (mode: GameMode, seat: Seat, distance: number): TokenPosition => {
  if (!modeRules[mode].hasHomeColumn || distance <= lastTrackDistance) {
    return { area: "track", cell: (startCell(seat) + distance) % classicRules.trackCells };
  }
  if (distance < homeDistance) return { area: "homeColumn", cell: distance - lastTrackDistance - 1 };
  return { area: "home" };
};

/**
 * Where a Token of the Seat ends up if it Moves by this Roll, or null if it can't: it's in the Yard and the Roll
 * isn't the one that brings it out, it's already Home, or the Roll would take it past Home. In a Game mode with no
 * Home column, a Token on the Track goes on round it, so it can always Move.
 */
export const positionAfter = (
  mode: GameMode,
  seat: Seat,
  position: TokenPosition,
  roll: number,
): TokenPosition | null => {
  if (position.area === "yard") return roll === classicRules.rollToLeaveYard ? positionAt(mode, seat, 0) : null;
  const distance = distanceOf(seat, position) + roll;
  if (position.area === "home" || (modeRules[mode].hasHomeColumn && distance > homeDistance)) return null;
  return positionAt(mode, seat, distance);
};

/**
 * Each place a Token of the Seat stands on as it Moves by this Roll, a Cell at a time, ending where it ends up: just
 * its Start cell if it leaves the Yard. Empty if it can't Move by the Roll.
 */
export const positionsAlong = (mode: GameMode, seat: Seat, position: TokenPosition, roll: number): TokenPosition[] => {
  if (!positionAfter(mode, seat, position, roll)) return [];
  if (position.area === "yard") return [positionAt(mode, seat, 0)];
  const from = distanceOf(seat, position);
  return Array.from({ length: roll }, (_, step) => positionAt(mode, seat, from + step + 1));
};

/** The Seat's Tokens that can Move by this Roll, by their place in its list of Tokens. */
export const legalMoves = (mode: GameMode, seat: Seat, tokens: TokenPosition[], roll: number): number[] => {
  return tokens.flatMap((position, token) => (positionAfter(mode, seat, position, roll) ? [token] : []));
};

/** The Seat's Tokens after this one Moves by the Roll, which must be one of its legal Moves. */
export const moveToken = (
  mode: GameMode,
  seat: Seat,
  tokens: TokenPosition[],
  token: number,
  roll: number,
): TokenPosition[] => {
  return tokens.map((position, index) => {
    return index === token ? positionAfter(mode, seat, position, roll) ?? position : position;
  });
};

/** One of a Seat's Tokens, by its place in the Seat's list of Tokens. */
export interface SeatToken {
  seat: Seat;
  token: number;
}

/**
 * Every Seat's Tokens, by Seat, after one of this Seat's Moves by the Roll, which must be one of its legal Moves, and
 * the opponents' Tokens it Captured, each now back in its Yard.
 */
export const applyMove = (
  mode: GameMode,
  seats: TokenPosition[][],
  seat: Seat,
  token: number,
  roll: number,
): { seats: TokenPosition[][]; captured: SeatToken[] } => {
  const moved = moveToken(mode, seat, seats[seat] ?? [], token, roll);
  const to = moved[token];
  const captured = seats.flatMap((tokens, owner) => {
    if (owner === seat || to?.area !== "track" || isSafeCell(to.cell)) return [];
    const onCell = tokens.flatMap((position, ownToken) => {
      return position.area === "track" && position.cell === to.cell ? [{ seat: owner, token: ownToken }] : [];
    });
    // Two or more of a Seat's Tokens on one Cell protect each other.
    return onCell.length === 1 ? onCell : [];
  });
  const isCaptured = (owner: Seat, ownToken: number) => {
    return captured.some((capture) => capture.seat === owner && capture.token === ownToken);
  };
  const seatsAfter = seats.map((tokens, owner) => {
    if (owner === seat) return moved;
    return tokens.map((position, ownToken) => (isCaptured(owner, ownToken) ? { area: "yard" as const } : position));
  });
  return { seats: seatsAfter, captured };
};

/**
 * Whether a Move by this Roll, ending where it did and Capturing these Tokens, earns the Player another Roll in the
 * same Turn: it used a 6, made a Capture, or brought a Token Home. It earns one, however many of these it did.
 */
export const earnsExtraRoll = (roll: number, move: { to: TokenPosition; captured: SeatToken[] }): boolean => {
  return roll === classicRules.rollToRollAgain || move.captured.length > 0 || move.to.area === "home";
};

/** Whether a Game in this Game mode is won by its first Capture, as in One Kill Win, rather than as in Classic. */
export const isWonByCapture = (mode: GameMode): boolean => modeRules[mode].wonBy === "capture";

/** Whether Tokens in this Game mode turn into their Home column and go on to Home, as in Classic. */
export const tokensReachHome = (mode: GameMode): boolean => modeRules[mode].hasHomeColumn;

/**
 * Where a Seat's Tokens are when the Game starts: any the Game mode puts on its Start cell, then the rest in its
 * Yard.
 */
export const startingTokens = (mode: GameMode, seat: Seat): TokenPosition[] => {
  return Array.from({ length: classicRules.tokensPerSeat }, (_, token) => {
    return token < modeRules[mode].tokensOnStartCell ? positionAt(mode, seat, 0) : { area: "yard" };
  });
};

/**
 * Whether a Move wins the Game for its Seat, with the Seat's Tokens after it and the Tokens it Captured: in Classic,
 * when it brings the Seat's last Token Home, and in One Kill Win, when it makes a Capture.
 */
export const wonByMove = (mode: GameMode, move: { tokens: TokenPosition[]; captured: SeatToken[] }): boolean => {
  return isWonByCapture(mode) ? move.captured.length > 0 : hasWon(move.tokens);
};

/** How many of these Tokens of a Seat are Home. */
export const tokensHome = (tokens: TokenPosition[]): number => {
  return tokens.filter((position) => position.area === "home").length;
};

/** Whether a Seat with these Tokens has won: it has Tokens, and every one is Home. An empty Seat never wins. */
export const hasWon = (tokens: TokenPosition[]): boolean => {
  return tokens.length > 0 && tokensHome(tokens) === tokens.length;
};

/**
 * The Seats given out when a Game starts, to its Players in the order they joined: the 1st gets Seat 0, the 2nd the
 * Seat opposite, so 2 Players always sit opposite each other, and the rest the Seats left, clockwise from Seat 0.
 */
export const giveOutSeats = (playerCount: number): Seat[] => {
  const opposite = classicRules.seats / 2;
  const allSeats = Array.from({ length: classicRules.seats }, (_, seat) => seat);
  const rest = allSeats.filter((seat) => seat !== 0 && seat !== opposite);
  return [0, opposite, ...rest].slice(0, playerCount);
};

/** How many Seats clockwise from one Seat another is: 0 for the same Seat. */
export const seatsClockwise = (from: Seat, to: Seat): number => {
  return (to - from + classicRules.seats) % classicRules.seats;
};

/**
 * The first of the taken Seats clockwise after this one, which needn't be taken itself. There must be at least one
 * taken Seat; if this is the only one, it's the next.
 */
export const nextTakenSeat = (seat: Seat, takenSeats: Seat[]): Seat => {
  // This Seat itself comes last, a whole way round.
  const distance = (taken: Seat) => seatsClockwise(seat, taken) || classicRules.seats;
  return takenSeats.reduce((next, taken) => (distance(taken) < distance(next) ? taken : next));
};

/** How many digits a Game code has. Leading zeros count, so it's kept as text. */
export const gameCodeLength = 6;

/**
 * The most characters a Player name can have, once trimmed, so a tampered client can't break the screens of others.
 * Characters are counted as code points, so one outside the Basic Multilingual Plane, such as an emoji, counts once.
 */
export const playerNameMaxLength = 30;

/** Whether a Player name can be shown: once trimmed, it isn't empty, and has at most `playerNameMaxLength` characters. */
export const isValidPlayerName = (playerName: string): boolean => {
  const length = [...playerName.trim()].length;
  return length > 0 && length <= playerNameMaxLength;
};
