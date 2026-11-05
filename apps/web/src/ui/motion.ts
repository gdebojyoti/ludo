// How long the die and the Board's Tokens take to play out a Roll or Move, on every Player's screen.

// The die tumbles for at least this long, and for the viewer's own Roll, on until the server replies with it. Its
// faces flick past in a fixed order: the server makes every random choice in a Game, and this one isn't even a choice.
export const tumbleFor = 900;
export const tumbleForReducedMotion = 300;
export const faceEvery = 90;
export const tumbleFaces = [3, 6, 2, 5, 1, 4];

// Once a Roll or Move has played out, the Board rests this long before it shows what came after, such as the Turn
// passing, so every Player sees where things ended up before anyone can Roll again.
export const restFor = 300;

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
