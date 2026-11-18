// Every game on the site shares one origin, so the key is namespaced.
const storageKey = "ludo-settings";

/** The themes, in the order Change theme goes through them. Only the Heritage design so far. */
export const themes = ["heritage"] as const;

export type Theme = (typeof themes)[number];

export interface Settings {
  diceOnRight: boolean;
  theme: Theme;
}

const defaultSettings: Settings = { diceOnRight: false, theme: themes[0] };

/**
 * The settings this browser keeps, all in one entry. Any that weren't kept, or that the browser won't give, or that
 * aren't valid, as one edited by hand might not be, are the defaults.
 */
export const loadSettings = (): Settings => {
  try {
    const kept: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    if (typeof kept !== "object" || kept === null) return defaultSettings;
    const { diceOnRight, theme } = kept as Record<string, unknown>;
    return {
      diceOnRight: typeof diceOnRight === "boolean" ? diceOnRight : defaultSettings.diceOnRight,
      theme: themes.find((known) => known === theme) ?? defaultSettings.theme,
    };
  } catch {
    // Storage is blocked, or what's kept isn't JSON, so there's nothing kept to read.
    return defaultSettings;
  }
};

export const saveSettings = (settings: Settings) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    // Storage is blocked or full, so the settings last only until the page is closed.
  }
};

/** The theme after this one, going back to the first after the last. */
export const nextTheme = (theme: Theme): Theme => themes[(themes.indexOf(theme) + 1) % themes.length] ?? themes[0];
