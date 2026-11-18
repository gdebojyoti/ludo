import { useSyncExternalStore } from "react";

// Every game on the site shares one origin, so the key is namespaced.
const storageKey = "ludo-settings";

/** The themes, in the order Change theme goes through them. The first, Heritage, is the default. */
export const themes = ["heritage", "christmas"] as const;

export type Theme = (typeof themes)[number];

export interface Settings {
  /** Whether the die is on the left of the Turn status on phones, rather than the right. */
  diceOnLeft: boolean;
  theme: Theme;
}

const defaultSettings: Settings = { diceOnLeft: false, theme: themes[0] };

/**
 * The settings this browser keeps, all in one entry. Any that weren't kept, or that the browser won't give, or that
 * aren't valid, as one edited by hand might not be, are the defaults.
 */
const loadSettings = (): Settings => {
  try {
    const kept: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    if (typeof kept !== "object" || kept === null) return defaultSettings;
    const { diceOnLeft, theme } = kept as Record<string, unknown>;
    return {
      diceOnLeft: typeof diceOnLeft === "boolean" ? diceOnLeft : defaultSettings.diceOnLeft,
      theme: themes.find((known) => known === theme) ?? defaultSettings.theme,
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

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Changes some of the settings, and keeps them all for the next visit. */
export const changeSettings = (changed: Partial<Settings>) => {
  current = { ...current, ...changed };
  try {
    localStorage.setItem(storageKey, JSON.stringify(current));
  } catch {
    // Storage is blocked or full, so the settings last only until the page is closed.
  }
  listeners.forEach((listener) => listener());
};

/** The settings, which re-render the component when they change. */
export const useSettings = (): Settings => useSyncExternalStore(subscribe, () => current);

/** The theme after this one, going back to the first after the last. */
export const nextTheme = (theme: Theme): Theme => themes[(themes.indexOf(theme) + 1) % themes.length] ?? themes[0];
