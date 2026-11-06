import { isValidPlayerName, randomPlayerName } from "@ludo/shared";

// Every game on the site shares one origin, so the key is namespaced.
const storageKey = "ludo-player-name";

/**
 * The Player name this browser goes by: the one kept from an earlier visit, or on a first visit a new one, which is
 * then kept. If the browser won't keep it, as in some private windows, the name lasts until the page is closed. A kept
 * name the server would refuse, as one edited by hand might be, is replaced.
 */
export const loadPlayerName = (): string => {
  try {
    const kept = localStorage.getItem(storageKey);
    if (kept && isValidPlayerName(kept)) return kept;
  } catch {
    // Storage is blocked, so there's nothing kept to read.
  }
  return newPlayerName();
};

/**
 * A new Player name, made from a random first and last name, kept in place of the old one. Making it is the only
 * random choice the web app makes.
 */
export const newPlayerName = (): string => {
  const playerName = randomPlayerName((max) => Math.floor(Math.random() * max));
  try {
    localStorage.setItem(storageKey, playerName);
  } catch {
    // Storage is blocked or full, so the name isn't kept for the next visit.
  }
  return playerName;
};
