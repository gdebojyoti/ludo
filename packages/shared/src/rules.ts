// The rules of the game, as constants and pure functions with no I/O. The server uses them to decide what's allowed,
// and is the only authority on them; the web app holds no game logic.

/**
 * The rules of Classic, the one Game mode in v1, that docs/game-modes/classic.md marks as ones later Game modes may
 * change. They're kept in one value so a Game mode can replace them together.
 */
export const classicRules = {
  /** The most Players a Game can have, so the most a Lobby holds. */
  maxPlayers: 4,
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
