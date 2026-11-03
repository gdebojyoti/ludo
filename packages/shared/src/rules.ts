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
};

/** A place at the Board, numbered clockwise from 0. A Seat is never a colour (ADR-0006). */
export type Seat = number;

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
