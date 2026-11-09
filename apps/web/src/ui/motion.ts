// How the die and the Board's Tokens play out a Roll or Move in this app. How long each takes, the same on every
// screen, is in @ludo/shared, as the server paces AI Players by it.
import type { CSSProperties } from "react";
import type { Cell } from "./seatView";

// The die tumbles for at least `tumbleFor`, and for the viewer's own Roll, on until the server replies with it. Its
// faces flick past in a fixed order: the server makes every random choice in a Game, and this one isn't even a choice.
export const tumbleForReducedMotion = 300;
export const faceEvery = 90;
export const tumbleFaces = [3, 6, 2, 5, 1, 4];

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Sets a Token drawn above the Board where it's going, for ludo.css to slide it in from where it was. */
export const slideStyle = (from: Cell, to: Cell) => ({
  "--row": to[0],
  "--column": to[1],
  "--from-row": from[0],
  "--from-column": from[1],
}) as CSSProperties;
