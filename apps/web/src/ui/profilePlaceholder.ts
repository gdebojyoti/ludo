import { House, Swords, Trophy, type LucideIcon } from "lucide-react";
import type { profileMessages } from "./messages";

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

/**
 * One of the placeholder Achievements, named in `profileMessages.placeholderAchievements` until #65 settles the list:
 * an earned one with its icon, or one still locked.
 */
export type Achievement = { id: keyof typeof profileMessages.placeholderAchievements } & (
  | { earned: true; icon: LucideIcon }
  | { earned: false }
);

/** What both the Profile tab and a Player's sheet show of a signed-in Player. */
export interface PlayerProfile {
  supporter: boolean;
  level: number;
  stats: Record<StatsMode, ModeStats>;
  /** The first few Achievements, earned or not. */
  achievements: Achievement[];
  achievementsEarned: number;
  achievementsTotal: number;
  /** The viewer's record against them, on anyone's sheet but their own. */
  record?: { wins: number; losses: number };
}

const achievements: Achievement[] = [
  { id: "firstWin", earned: true, icon: Trophy },
  { id: "allFourHome", earned: true, icon: House },
  { id: "tenCaptures", earned: true, icon: Swords },
  { id: "threeInARow", earned: false },
];

/** Another signed-in Player's Profile, as their sheet shows it, with the viewer's record against them. */
export const placeholderOtherProfile: PlayerProfile = {
  supporter: true,
  level: 14,
  stats: {
    classic: { played: 63, won: 25, captures: 131, tokensHome: 170 },
    oneKillWin: { played: 30, won: 12, captures: 44, tokensHome: 0 },
    houseRules: { played: 9, won: 4, captures: 21, tokensHome: 26 },
  },
  achievements,
  achievementsEarned: 9,
  achievementsTotal: 30,
  record: { wins: 3, losses: 2 },
};

/** The viewer's own Profile, as the Profile tab and their own sheet show it. */
export const placeholderProfile = {
  coins: 1240,
  supporter: true,
  level: 12,
  xp: 460,
  xpForNextLevel: 500,
  stats: {
    classic: { played: 48, won: 17, captures: 96, tokensHome: 121 },
    oneKillWin: { played: 22, won: 9, captures: 31, tokensHome: 0 },
    houseRules: { played: 6, won: 2, captures: 14, tokensHome: 17 },
  },
  achievements,
  achievementsEarned: 7,
  achievementsTotal: 30,
  rivals: [
    { playerName: "Hermione Weasley", seat: 1, wins: 5, losses: 3 },
    { playerName: "Luna Diggory", seat: 3, wins: 4, losses: 4 },
    { playerName: "Cedric Malfoy", seat: 2, wins: 1, losses: 6 },
  ],
  cosmetics: 12,
} satisfies PlayerProfile & Record<string, unknown>;
