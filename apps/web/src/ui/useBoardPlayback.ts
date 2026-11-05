import { useEffect, useState } from "react";
import type { Seat, SnapshotBoard } from "@ludo/shared";

/**
 * A Roll or Move playing out on the Board before the Board shows what came after it. Every Player sees another
 * Player's Roll and Move play out, and their own Move, which starts when they pick the Token. Their own Roll plays
 * out in BoardScreen, as it starts before the server has Rolled.
 */
export interface Playback {
  /** The Seat whose Roll or Move it is. */
  seat: Seat;
  /** The Board as it was before, shown while it plays out. */
  board: SnapshotBoard;
  /** Another Player's Roll: the die tumbles, then lands on the number. */
  roll?: { number: number; landed: boolean };
  /** A Token Moving by its Roll, a Cell at a time, until it arrives. */
  move?: { token: number; number: number };
}

/** A Token Moving, as the Board draws it. */
export interface MovingToken {
  seat: Seat;
  /** Which of the Seat's Tokens, by its place in the Seat's list of Tokens. */
  token: number;
  /** The number it Moves by. */
  number: number;
}

// The die tumbles for at least this long.
export const tumbleFor = 900;

// Once a Roll or Move has played out, the Board rests this long before it shows what came after, such as the Turn
// passing, so every Player sees where things ended up before anyone can Roll again.
const restFor = 400;

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * What plays out for the change from one snapshot to the next, given what's playing now. The same Player's Roll and
 * Move play out together, so a Move never waits for its Roll's die to land. Another Player's Roll or Move makes
 * whatever is still playing jump to its end, so the Board is never behind by more than one Player.
 */
const playbackOf = (before: SnapshotBoard, after: SnapshotBoard, playing: Playback | undefined) => {
  const roll = after.lastRoll && after.lastRoll.index !== before.lastRoll?.index ? after.lastRoll : null;
  const move = after.lastMove && after.lastMove.index !== before.lastMove?.index ? after.lastMove : null;
  const seat = (move ?? roll)?.seat;
  // The viewer's own Roll and Move started playing out when they tapped.
  if (seat === undefined || seat === after.seat) return playing;
  // A tab out of sight, or a Player who'd rather not see motion, sees each change at once.
  if (document.hidden || prefersReducedMotion()) return undefined;
  const same = playing?.seat === seat ? playing : undefined;
  return {
    seat,
    // A Move slides from where the Board last had the Token. A Move of the same Player's still sliding jumps to its
    // end.
    board: move ? before : same?.board ?? before,
    roll: roll ? { number: roll.number, landed: false } : same?.roll,
    move: move && after.lastRoll ? { token: move.token, number: after.lastRoll.number } : same?.move,
  };
};

// Plays out each Roll and Move as the snapshots come in, and gives the Board to show meanwhile.
export const useBoardPlayback = (latestBoard: SnapshotBoard) => {
  const [seen, setSeen] = useState(latestBoard);
  const [playback, setPlayback] = useState<Playback>();

  // Worked out as each snapshot arrives, so the Board never shows it before its Roll or Move starts playing.
  if (latestBoard !== seen) {
    setSeen(latestBoard);
    setPlayback(playbackOf(seen, latestBoard, playback));
  }

  const roll = playback?.roll;
  useEffect(() => {
    if (!roll || roll.landed) return;
    const timeout = setTimeout(() => setPlayback((playing) => playing?.roll === roll
      ? { ...playing, roll: { ...roll, landed: true } }
      : playing), tumbleFor);
    return () => clearTimeout(timeout);
  }, [roll]);

  // Rests once the die has landed and the Token has arrived, then shows the latest Board.
  const resting = playback !== undefined && !playback.move && (!playback.roll || playback.roll.landed);
  useEffect(() => {
    if (!resting) return;
    const timeout = setTimeout(() => setPlayback(undefined), restFor);
    return () => clearTimeout(timeout);
  }, [resting, playback]);

  /** Starts the viewer's Token Moving by their Roll, as they pick it, unless motion is reduced. */
  const playOwnMove = (token: number) => {
    if (prefersReducedMotion() || !latestBoard.lastRoll) return;
    const move = { token, number: latestBoard.lastRoll.number };
    setPlayback({ seat: latestBoard.seat, board: latestBoard, move });
  };

  const tokenArrived = () => setPlayback((playing) => playing && { ...playing, move: undefined });

  // While a Token is Moving, the Board shows it where it started. Once it's arrived, it shows where every Token is
  // now. Nothing can be picked until the Board shows the latest snapshot.
  const board = playback
    ? {
        ...playback.board,
        seats: playback.move ? playback.board.seats : latestBoard.seats,
        lastMove: playback.move ? playback.board.lastMove : latestBoard.lastMove,
        moves: [],
      }
    : latestBoard;
  const moving: MovingToken | undefined = playback?.move && { seat: playback.seat, ...playback.move };

  return { board, playback, moving, playOwnMove, tokenArrived };
};
