import { useEffect, useState } from "react";
import { indexAfter, restFor, tumbleFor, type Seat, type SnapshotBoard } from "@ludo/shared";
import { prefersReducedMotion } from "./motion";

/** A Token Moving by a Roll, as the Board draws it sliding. */
export interface TokenMoving {
  seat: Seat;
  /** Which of the Seat's Tokens, by its place in the Seat's list of Tokens. */
  token: number;
  /** The number it Moves by. */
  number: number;
}

/**
 * A Roll or Move playing out on the Board, before the Board shows what came after it. Every tab plays out each Roll
 * and Move, except a Roll the viewer tapped in it, which BoardScreen plays out as it starts before the server Rolls.
 */
interface Playback {
  /** The Seat whose Roll or Move it is. */
  seat: Seat;
  /** The Board as it was before, shown while it plays out. */
  board: SnapshotBoard;
  /** A Roll: the die tumbles, then lands on the number. */
  roll?: { number: number; landed: boolean };
  /**
   * A Token sliding, a Cell at a time. The viewer's own Token, once it's arrived, waits there for the server's
   * snapshot of its Move.
   */
  move?: TokenMoving & { arrived: boolean };
}

interface State {
  /** The latest snapshot, once what it brings has started playing out. */
  seen: SnapshotBoard;
  playback: Playback | undefined;
  /** The indexes the viewer's own Roll and Move, tapped in this tab, will get, until their snapshots arrive. */
  ownRoll?: number;
  ownMove?: number;
}

/**
 * What plays out once the next snapshot arrives. The same Player's Roll and Move play out together, so a Move never
 * waits for its Roll's die to land. Another Player's Roll or Move makes whatever is still playing jump to its end, so
 * the Board is never behind by more than one Player.
 */
const nextState = (state: State, after: SnapshotBoard): State => {
  const { seen: before, playback } = state;
  const rollIsNew = after.lastRoll?.index !== before.lastRoll?.index;
  const moveIsNew = after.lastMove?.index !== before.lastMove?.index;
  if (!rollIsNew && !moveIsNew) return { ...state, seen: after };
  // The server sends a snapshot after each Roll and each Move, so one that brings more, as when the connection comes
  // back, can't be played out in order, and is shown at once.
  const roll = rollIsNew && !moveIsNew && after.lastRoll?.index === indexAfter(before.lastRoll)
    ? after.lastRoll
    : null;
  const move = moveIsNew && !rollIsNew && after.lastMove?.index === indexAfter(before.lastMove)
    ? after.lastMove
    : null;
  if (roll && roll.index === state.ownRoll) return { ...state, seen: after, ownRoll: undefined };
  if (move && move.index === state.ownMove) {
    // The viewer's own Token, if it's arrived, has waited for this.
    const arrived = playback?.move?.arrived ? { ...playback, move: undefined } : playback;
    return { ...state, seen: after, playback: arrived, ownMove: undefined };
  }
  // A tab out of sight, or a Player who'd rather not see motion, sees each change at once.
  if (document.hidden || prefersReducedMotion() || !(roll ?? move) || !after.lastRoll) {
    return { seen: after, playback: undefined };
  }
  const seat = (move ?? roll)?.seat as Seat;
  const samePlayers = playback?.seat === seat ? playback : undefined;
  return {
    seen: after,
    playback: {
      seat,
      // A Token slides from where the Board last had it, so one of the same Player's still sliding jumps to its end.
      board: move ? before : samePlayers?.board ?? before,
      roll: roll ? { number: roll.number, landed: false } : samePlayers?.roll,
      // A Move is by the latest Roll, which a snapshot bringing only the Move hasn't changed.
      move: move ? { seat, token: move.token, number: after.lastRoll.number, arrived: false } : samePlayers?.move,
    },
  };
};

// Plays out each Roll and Move as the snapshots come in, and gives the Board to show meanwhile.
export const useBoardPlayback = (latestBoard: SnapshotBoard) => {
  const [state, setState] = useState<State>({ seen: latestBoard, playback: undefined });
  const { playback } = state;

  // Worked out as each snapshot arrives, so the Board never shows it before its Roll or Move starts playing out.
  if (latestBoard !== state.seen) setState(nextState(state, latestBoard));

  const roll = playback?.roll;
  useEffect(() => {
    if (!roll || roll.landed) return;
    const land = () => setState((current) => current.playback?.roll === roll
      ? { ...current, playback: { ...current.playback, roll: { ...roll, landed: true } } }
      : current);
    const timeout = setTimeout(land, tumbleFor);
    return () => clearTimeout(timeout);
  }, [roll]);

  // Rests once the die has landed and the Token has arrived, then shows the latest Board.
  const resting = playback !== undefined && !playback.move && (!playback.roll || playback.roll.landed);
  useEffect(() => {
    if (!resting) return;
    const timeout = setTimeout(() => setState((current) => ({ ...current, playback: undefined })), restFor);
    return () => clearTimeout(timeout);
  }, [resting, playback]);

  /** Notes that the viewer tapped the die, so the snapshot of their Roll doesn't play it out again. */
  const startOwnRoll = () => setState((current) => ({ ...current, ownRoll: indexAfter(current.seen.lastRoll) }));

  /**
   * Once the viewer's own die has landed, rests on it if no Token could Move by it, before the Board shows the Turn
   * passed. The Board as it was before the Roll is shown meanwhile, as BoardScreen held it.
   */
  const ownRollLanded = (before: SnapshotBoard, ok: boolean) => setState((current) => {
    const { seen } = current;
    // Without the snapshot of the Roll, there's nothing to rest on.
    if (!ok || current.ownRoll !== undefined) return { ...current, ownRoll: undefined };
    if (!seen.lastRoll || seen.lastRoll.seat !== seen.seat) return current;
    if ((seen.rolled && seen.turn === seen.seat) || prefersReducedMotion()) return current;
    const roll = { number: seen.lastRoll.number, landed: true };
    return { ...current, playback: { seat: seen.seat, board: before, roll } };
  });

  /** Starts the viewer's Token Moving by their Roll, as they pick it, unless motion is reduced. */
  const startOwnMove = (token: number) => setState((current) => {
    const { seen } = current;
    const ownMove = indexAfter(seen.lastMove);
    if (prefersReducedMotion() || !seen.lastRoll) return { ...current, ownMove };
    const move = { seat: seen.seat, token, number: seen.lastRoll.number, arrived: false };
    return { ...current, ownMove, playback: { seat: seen.seat, board: seen, move } };
  });

  /**
   * The server answered the viewer's Move, after sending its snapshot if it went through: their Token stops waiting
   * for it. One the server refused goes back to where it was.
   */
  const ownMoveAnswered = (ok: boolean) => setState((current) => {
    const { playback } = current;
    if (playback?.seat !== current.seen.seat) return { ...current, ownMove: undefined };
    if (!ok) return { ...current, ownMove: undefined, playback: undefined };
    const move = playback.move?.arrived ? undefined : playback.move;
    return { ...current, ownMove: undefined, playback: { ...playback, move } };
  });

  const tokenArrived = () => setState((current) => {
    const { playback } = current;
    if (!playback?.move) return current;
    // The viewer's own Token can arrive before the server's snapshot of its Move, and waits there for it.
    const move = current.ownMove !== undefined && playback.seat === current.seen.seat
      ? { ...playback.move, arrived: true }
      : undefined;
    return { ...current, playback: { ...playback, move } };
  });

  // While a Token is sliding, the Board shows it where it started. Once it's arrived, it shows where every Token is
  // now. Nothing can be picked until the Board shows the latest snapshot.
  const board = playback
    ? {
        ...playback.board,
        seats: playback.move ? playback.board.seats : latestBoard.seats,
        lastMove: playback.move ? playback.board.lastMove : latestBoard.lastMove,
        moves: [],
      }
    : latestBoard;
  return {
    board,
    /** The Roll playing out, if one is, and whose it is. */
    playedRoll: playback?.roll && { seat: playback.seat, ...playback.roll },
    /** The Token sliding, or waiting where it arrived, if one is. */
    moving: playback?.move,
    // Whether the Board has nothing left to play out, and shows the latest snapshot.
    playedOut: !playback,
    startOwnRoll,
    ownRollLanded,
    startOwnMove,
    ownMoveAnswered,
    tokenArrived,
  };
};
