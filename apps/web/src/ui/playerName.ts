import { isValidPlayerName } from "@ludo/shared";
import playerNames from "./player-names.json";

// Every game on the site shares one origin, so the key is namespaced.
const storageKey = "ludo-player-name";

/**
 * The Player name this browser goes by: the one kept from an earlier visit, or on a first visit a new one made from a
 * random first and last name, which is then kept. This is the only random choice the web app makes. If the browser
 * won't keep it, as in some private windows, the name lasts until the page is closed. A kept name the server would
 * refuse, as one edited by hand might be, is replaced, since there's no other way to change it.
 */
export const loadPlayerName = (): string => {
  try {
    const kept = localStorage.getItem(storageKey);
    if (kept && isValidPlayerName(kept)) return kept;
  } catch {
    // Storage is blocked, so there's nothing kept to read.
  }
  const playerName = `${pick(playerNames.firstNames)} ${pick(playerNames.lastNames)}`;
  try {
    localStorage.setItem(storageKey, playerName);
  } catch {
    // Storage is blocked or full, so the name isn't kept for the next visit.
  }
  return playerName;
};

const pick = (names: string[]): string => names[Math.floor(Math.random() * names.length)] ?? "";
