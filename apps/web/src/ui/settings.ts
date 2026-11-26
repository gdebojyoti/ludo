import { useSyncExternalStore } from "react";
import { isTheme, themes, type Settings, type Theme } from "@ludo/shared";

// Every game on the site shares one origin, so the key is namespaced.
const storageKey = "ludo-settings";

const defaultSettings: Settings = { diceOnLeft: false, theme: themes[0], autoplay: false };

/**
 * The settings this browser keeps, all in one entry. Any that weren't kept, or that the browser won't give, or that
 * aren't valid, as one edited by hand might not be, are the defaults.
 */
const loadSettings = (): Settings => {
  try {
    const kept: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    if (typeof kept !== "object" || kept === null) return defaultSettings;
    const { diceOnLeft, theme, autoplay } = kept as Record<string, unknown>;
    return {
      diceOnLeft: typeof diceOnLeft === "boolean" ? diceOnLeft : defaultSettings.diceOnLeft,
      theme: isTheme(theme) ? theme : defaultSettings.theme,
      autoplay: typeof autoplay === "boolean" ? autoplay : defaultSettings.autoplay,
    };
  } catch {
    // Storage is blocked, or what's kept isn't JSON, so there's nothing kept to read.
    return defaultSettings;
  }
};

// Read once and then kept here, so every screen sees a change as soon as it's made, such as the Game screen when its
// own Settings button switches the die.
let current = loadSettings();
const listeners = new Set<() => void>();
// Sends a change to the Account the browser is signed in to, while it is.
let sendToAccount: ((changed: Partial<Settings>) => void) | null = null;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Changes some of the settings, and keeps them all in the browser, as the ones it shows on its next visit. */
const keep = (changed: Partial<Settings>) => {
  current = { ...current, ...changed };
  try {
    localStorage.setItem(storageKey, JSON.stringify(current));
  } catch {
    // Storage is blocked or full, so the settings last only until the page is closed.
  }
  listeners.forEach((listener) => listener());
};

/**
 * Changes some of the settings, and keeps them all for the next visit: in the browser for a Guest, and with the Account
 * too while the browser is signed in, so they follow it to its other browsers.
 */
export const changeSettings = (changed: Partial<Settings>) => {
  keep(changed);
  sendToAccount?.(changed);
};

/**
 * Follows the Account the browser is signed in to, as the server sends it: shows the settings it has changed, keeping
 * the browser's own for the rest, and sends it every change from now on. `send` is null for a Guest, whose settings stay
 * in the browser only.
 */
export const followAccount = (settings: Partial<Settings>, send: ((changed: Partial<Settings>) => void) | null) => {
  sendToAccount = send;
  keep(settings);
};

/** The settings, which re-render the component when they change. */
export const useSettings = (): Settings => useSyncExternalStore(subscribe, () => current);

/** The theme after this one, going back to the first after the last. */
export const nextTheme = (theme: Theme): Theme => themes[(themes.indexOf(theme) + 1) % themes.length] ?? themes[0];
