// A Player's settings: kept in the browser for a Guest, and with the Account for a Player who's signed in, so they
// follow it to any browser it signs in on.

/** The themes, in the order Change theme goes through them. The first, Christmas, is the default. */
export const themes = ["christmas", "heritage"] as const;

export type Theme = (typeof themes)[number];

export interface Settings {
  /** Whether the die is on the left of the Turn status on phones, rather than the right. */
  diceOnLeft: boolean;
  theme: Theme;
  /** Whether the viewer's Token Moves by itself when there's no choice to make, as every legal Move is alike. */
  autoplay: boolean;
}

/** Whether the value is one of the themes. */
export const isTheme = (value: unknown): value is Theme => themes.some((theme) => theme === value);

/**
 * The settings in a change sent to the server, which may be only some of them, or undefined if it isn't an object or any
 * setting in it has a value it can't have. Anything else in it, such as a setting from a newer web app, is left out.
 */
export const settingsChangeIn = (value: unknown): Partial<Settings> | undefined => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const { diceOnLeft, theme, autoplay } = value as Record<string, unknown>;
  if (diceOnLeft !== undefined && typeof diceOnLeft !== "boolean") return undefined;
  if (theme !== undefined && !isTheme(theme)) return undefined;
  if (autoplay !== undefined && typeof autoplay !== "boolean") return undefined;
  return {
    ...(diceOnLeft === undefined ? {} : { diceOnLeft }),
    ...(theme === undefined ? {} : { theme }),
    ...(autoplay === undefined ? {} : { autoplay }),
  };
};
