// How the die and the Board's Tokens play out a Roll or Move in this app. How long each takes, the same on every
// screen, is in @ludo/shared, as the server paces AI Players by it.

// The die tumbles for at least `tumbleFor`, and for the viewer's own Roll, on until the server replies with it. Its
// faces flick past in a fixed order: the server makes every random choice in a Game, and this one isn't even a choice.
export const tumbleForReducedMotion = 300;
export const faceEvery = 90;
export const tumbleFaces = [3, 6, 2, 5, 1, 4];

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
