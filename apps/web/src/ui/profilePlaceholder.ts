// PLACEHOLDER: what a signed-in Player's Profile shows, made up, until the server sends the real thing (#57). Only the
// Player name is real. Everything here goes once Coins, XP, stats, Achievements, Rivals and the Locker exist.

/**
 * Whether a signed-in Player's Profile shows the made-up data below, its Coins included, to see how it looks. Set by
 * hand: false shows that the Profile is coming soon, as Players should see it until it's real.
 */
export const showPlaceholderProfile = false;

/** The Game modes the stats are kept for, House Rules being Games with any Modifier (ADR-0009). */
export type StatsMode = "classic" | "oneKillWin" | "houseRules";

export interface ModeStats {
  played: number;
  won: number;
  captures: number;
  tokensHome: number;
}

export const placeholderProfile = {
  coins: 1240,
  supporter: true,
  title: "Weekly champion",
  level: 12,
  xp: 460,
  xpForNextLevel: 500,
  stats: {
    classic: { played: 48, won: 17, captures: 96, tokensHome: 121 },
    oneKillWin: { played: 22, won: 9, captures: 31, tokensHome: 0 },
    houseRules: { played: 6, won: 2, captures: 14, tokensHome: 17 },
  } satisfies Record<StatsMode, ModeStats>,
  achievementsEarned: 7,
  achievementsTotal: 30,
  // The first few Achievements, earned or not. Their names are placeholders too, until #65 settles the list.
  achievements: [
    { id: "firstWin", name: "First win", earned: true },
    { id: "allFourHome", name: "All four home", earned: true },
    { id: "tenCaptures", name: "10 captures", earned: true },
    { id: "threeInARow", name: "Win 3 in a row", earned: false },
  ],
  rivals: [
    { playerName: "Hermione Weasley", seat: 1, wins: 5, losses: 3 },
    { playerName: "Luna Diggory", seat: 3, wins: 4, losses: 4 },
    { playerName: "Cedric Malfoy", seat: 2, wins: 1, losses: 6 },
  ],
  cosmetics: 12,
};
