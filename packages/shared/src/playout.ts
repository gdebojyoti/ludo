// How long the Board takes to play out a Roll or Move, on every screen. The web app plays them out at this pace, and
// the server paces AI Players by it (ADR-0008), so each Roll and Move plays out in full before the next is made.
import type { TokenPosition } from "./rules.js";

/** How long, in milliseconds, the die tumbles before it lands. */
export const tumbleFor = 900;

/** How often, in milliseconds, a Moving Token takes a step: a slide onto the next place on its path, then a rest. */
export const stepEvery = 220;

/** How long, in milliseconds, a Captured Token takes to return to its Yard, once the Token that Captured it arrives. */
export const captureReturnFor = 900;

/**
 * How long, in milliseconds, the Board rests once a Roll or Move has played out, before it shows what came after,
 * such as the Turn passing, so everyone sees where things ended up before anyone can Roll again.
 */
export const restFor = 300;

/** How long, in milliseconds, a Roll takes to play out: the die tumbles and lands, then the Board rests. */
export const rollPlaysOutFor = tumbleFor + restFor;

/**
 * How long, in milliseconds, a Move takes to play out: the Token steps a Cell at a time, or once to leave its Yard,
 * any Tokens it Captured return to their Yards together, then the Board rests.
 */
export const movePlaysOutFor = (from: TokenPosition, roll: number, capturedAny: boolean): number => {
  const steps = from.area === "yard" ? 1 : roll;
  return steps * stepEvery + (capturedAny ? captureReturnFor : 0) + restFor;
};
