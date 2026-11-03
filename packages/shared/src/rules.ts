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

/** The Seat's Start cell, on the Track. */
export const startCell = (seat: Seat): number => seat * (classicRules.trackCells / classicRules.seats);

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
const positionAt = (seat: Seat, distance: number): TokenPosition => {
  if (distance <= lastTrackDistance) {
    return { area: "track", cell: (startCell(seat) + distance) % classicRules.trackCells };
  }
  if (distance < homeDistance) return { area: "homeColumn", cell: distance - lastTrackDistance - 1 };
  return { area: "home" };
};

/**
 * Where a Token of the Seat ends up if it Moves by this Roll, or null if it can't: it's in the Yard and the Roll
 * isn't the one that brings it out, it's already Home, or the Roll would take it past Home.
 */
export const positionAfter = (seat: Seat, position: TokenPosition, roll: number): TokenPosition | null => {
  if (position.area === "yard") return roll === classicRules.rollToLeaveYard ? positionAt(seat, 0) : null;
  const distance = distanceOf(seat, position) + roll;
  if (position.area === "home" || distance > homeDistance) return null;
  return positionAt(seat, distance);
};

/** The Seat's Tokens that can Move by this Roll, by their place in its list of Tokens. */
export const legalMoves = (seat: Seat, tokens: TokenPosition[], roll: number): number[] => {
  return tokens.flatMap((position, token) => (positionAfter(seat, position, roll) ? [token] : []));
};

/** The Seat's Tokens after this one Moves by the Roll, which must be one of its legal Moves. */
export const moveToken = (seat: Seat, tokens: TokenPosition[], token: number, roll: number): TokenPosition[] => {
  return tokens.map((position, index) => {
    return index === token ? positionAfter(seat, position, roll) ?? position : position;
  });
};

/** Whether a Seat with these Tokens has won: it has Tokens, and every one is Home. An empty Seat never wins. */
export const hasWon = (tokens: TokenPosition[]): boolean => {
  return tokens.length > 0 && tokens.every((position) => position.area === "home");
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
