import { classicRules, playerNameMaxLength, type GameMode, type RejectionReason } from "@ludo/shared";
import type { LeaveText } from "./LeaveButton";
import type { Tab } from "./NavBar";
import type { ConnectionStatus, Notice } from "./useGameServer";

// Every piece of text the web app shows, in one place. It's in sentence case: the glossary's terms are capitalised in
// code and docs, where they mean something to developers, but not here, as Players don't know the glossary.

/** A Player name's first word, as Players are named in longer sentences. */
const firstName = (playerName: string) => playerName.trim().split(/\s+/)[0] ?? playerName;

/** Things as a list in a sentence: "A", "A and B", or "A, B and C". */
const list = (items: string[]) => {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
};

/** Player names as a list in a sentence, by their first names. */
const nameList = (playerNames: string[]) => list(playerNames.map(firstName));

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** A place, up to 10th, as text: "1st", "2nd", "3rd", "4th". */
const ordinal = (place: number) => `${place}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[place] ?? "th"}`;

/** A Player as text names them, and whether they're the one reading it. */
interface NamedPlayer {
  playerName: string;
  isOwn: boolean;
}

/** "your token", or "Ginny's token". */
const tokenOf = (owner: NamedPlayer) => owner.isOwn ? "your token" : `${firstName(owner.playerName)}'s token`;

/** A Game code in two groups of three digits, as it's easier to read out. */
export const spacedGameCode = (gameCode: string) => `${gameCode.slice(0, 3)} ${gameCode.slice(3)}`;

export const connectionMessages: Record<ConnectionStatus, string> = {
  connecting: "Connecting to server…",
  connected: "Connected to server",
  disconnected: "Not connected to server · retrying",
};

export const rejectionMessages: Record<RejectionReason, string> = {
  alreadyInActiveGame: "You're already in a game. You can only be in one game at a time.",
  alreadyRolled: "You've already rolled. Pick a token to move.",
  gameCodeNotFound: "No game found with that code. Check it with your friend. " +
    "Games that have started or are full can't be joined.",
  gameNotInLobby: "The game has already started.",
  gameNotInPlay: "The game isn't being played right now.",
  illegalMove: "That token can't move by your roll.",
  invalidGameMode: "That game mode can't be played. Choose another.",
  invalidPlayerName: `Your player name can't be used. It must be 1 to ${playerNameMaxLength} characters long.`,
  invalidSettings: "Those settings can't be saved.",
  noActiveGame: "You're not in a game.",
  notEnoughPlayers: `The game needs at least ${classicRules.minPlayers} players to start.`,
  notHost: "Only the host can start the game.",
  notRolled: "Roll first, then pick a token to move.",
  notSignedIn: "Sign in to save your settings to your account.",
  notYourTurn: "It's not your turn.",
  serverError: "Something went wrong on the server. Try again.",
};

export const noticeMessages: Record<Notice, string> = {
  alreadyInGame: "You're already in a game, so the join link wasn't used. Here's your game.",
};

export const commonMessages = {
  wordmark: "Ludo",
  you: "You",
  away: "Away",
};

export const tabMessages = {
  label: "Main",
  tabs: {
    play: "Play",
    store: "Store",
    leaderboard: "Leaderboard",
    settings: "Settings",
    profile: "Profile",
  } satisfies Record<Tab, string>,
  comingSoon: "More details coming soon.",
  back: "Back",
};

/** "1 win" or "2 wins", and the like. */
const count = (n: number, one: string, many: string) => `${n.toLocaleString("en")} ${n === 1 ? one : many}`;

export const profileMessages = {
  coins: (coins: number) => count(coins, "coin", "coins"),
  supporter: "Supporter",
  guest: "Guest",
  signInTitle: "Sign in to get a profile",
  perks: {
    coins: "Earn coins and XP from every game",
    devices: "Keep your progress on any device",
    leaderboard: "Climb the weekly leaderboard",
    rivals: "See your record against your rivals",
    locker: "Collect cosmetics in your locker",
  },
  noPassword: "No password to make or forget.",
  level: (level: number) => `Lv ${level}`,
  xp: (xp: number, xpForNextLevel: number, level: number) =>
    `${xp} / ${xpForNextLevel} XP · ${xpForNextLevel - xp} to level ${level + 1}`,
  xpLabel: (xp: number, xpForNextLevel: number, level: number) =>
    `${xp} of ${xpForNextLevel} XP towards level ${level + 1}`,
  statsHeading: "Stats",
  statsModes: "Game mode",
  // Named as the Game modes are, so not in sentence case.
  houseRules: "House Rules",
  played: "Games played",
  won: "Games won",
  captures: "Captures",
  tokensHome: "Tokens home",
  achievementsHeading: (earned: number, total: number) => `Achievements · ${earned} of ${total}`,
  notEarned: "Not earned yet",
  rivalsHeading: "Rivals",
  record: (wins: number, losses: number) => `${count(wins, "win", "wins")} · ${count(losses, "loss", "losses")}`,
  locker: "Locker",
  lockerDetail: (cosmetics: number) => `${count(cosmetics, "cosmetic", "cosmetics")} · choose what you wear`,
  signOut: "Sign out",
  signOutFailed: "Signing out isn't working right now. Try again in a moment.",
};

export const playerSheetMessages = {
  open: (playerName: string, isOwn: boolean) => isOwn ? "Your profile" : `${playerName}'s profile`,
  guest: "Guest",
  guestNoProfile: "Guests don't have a profile, so there are no stats or achievements to show.",
  // In two parts, the first in bold.
  askToSignIn: "Ask them to sign in",
  askToSignInWhy: " so you can start seeing your record against each other.",
  ownGuest: "You're playing as a guest, so you don't have a profile, with stats and achievements, yet.",
  ownGuestSignIn: "Sign in from the start screen to get one.",
  achievements: (earned: number, total: number) => `${earned} of ${total} achievements`,
  recordHeading: "Your record against them",
};

export const startMessages = {
  tagline: "Play with friends.",
  signIn: "Sign in with Google",
  signInPitch: "Sign in to use your own name, keep your progress and earn coins.",
  signInFailed: "Sign-in isn't working right now. Try again in a moment.",
  profile: "Profile",
  playingAs: "You'll play as",
  newName: "Pick a different random name",
  createGame: "Create a game",
  gameCodeLabel: "Join with a game code",
  gameCodePlaceholder: "6-digit code",
  joinGame: "Join",
  invalidJoinLink: "That join link isn't valid. Check it with your friend.",
  joinLinkNoReply: "The connection dropped before you could join. Try joining again.",
};

export const modeMessages = {
  title: "Choose a mode",
  subtitle: "Everyone in this game plays the same mode.",
  legend: "Game mode",
  soon: "Coming soon",
  soonNote: "Coming soon, not available yet",
  createGame: "Create game",
  // Named as the Game modes are, so not in sentence case.
  modes: {
    classic: { name: "Classic", description: "Get all four tokens home to win." },
    quick: { name: "Quick Game", description: "First token home wins." },
    oneKillWin: { name: "One Kill Win", description: "One capture and it's over." },
  },
};

/** A Game mode's name, as Players see it. */
const modeName = (mode: GameMode) => modeMessages.modes[mode].name;

export const lobbyMessages = {
  heading: "Invite friends",
  shareHint: "They join with this code.",
  mode: (mode: GameMode) => `Mode: ${modeName(mode)}`,
  gameCodeLabel: (gameCode: string) => `Game code ${gameCode.split("").join(" ")}`,
  shareJoinLink: "Share join link",
  shareTitle: "Join my game of Ludo",
  copyCode: "Copy code",
  copied: "Copied",
  playersHeading: "Players",
  playerCount: (count: number) => `${count} of ${classicRules.maxPlayers}`,
  host: "Host",
  youAreHost: "You are the host",
  hostAway: "The host is away",
  openPlace: "Waiting for a player…",
  start: (count: number) => `Start with ${count} players`,
  waitingForPlayers: "You can start the game once someone joins.",
  waitingForHost: (hostName: string) => `Waiting for ${hostName} to start`,
  orStartsByItself: `Or it starts by itself when a ${classicRules.maxPlayers}th player joins.`,
};

export const settingsMessages = {
  label: "Settings",
  button: "Settings",
  title: "Settings",
  diceOnLeft: "Dice on the left",
  diceOnLeftDetail: "Handy if you play with your left thumb.",
  autoplay: "Automatic move",
  autoplayDetail: "Moves a token for you when there's only one real option.",
  theme: "Theme",
  themeDetail: "Try a different look.",
  changeTheme: "Change",
  done: "Done",
  followsAccount: "Your settings follow your account to any device you sign in on.",
  keptInBrowser: "Your settings are kept on this device. Sign in and they'll follow you to any device.",
};

export const leaveMessages = {
  asHostInLobby: (otherNames: string[]): LeaveText => ({
    label: "Leave and cancel the game",
    button: "Leave lobby",
    title: "Cancel this game?",
    message: "You're the host, so leaving cancels the game for everyone." +
      (otherNames.length ? ` ${nameList(otherNames)} will be sent back to the start.` : ""),
    stay: "Keep the game open",
    leave: "Leave and cancel",
  }),
  inLobby: {
    label: "Leave the lobby",
    button: "Leave lobby",
    title: "Leave this lobby?",
    message: "Your place opens up for someone else. You can join again with the code while the game hasn't started.",
    stay: "Stay in the lobby",
    leave: "Leave lobby",
  } satisfies LeaveText,
  inPlay: (otherNames: string[]): LeaveText => ({
    label: "Leave the game",
    button: "Leave game",
    title: "Leave this game?",
    message: "You'll forfeit. Your tokens come off the board and your seat stays empty. " + (
      otherNames.length === 1 ? `${nameList(otherNames)} wins.` : `${nameList(otherNames)} keep playing.`
    ),
    stay: "Stay in the game",
    leave: "Leave and forfeit",
  }),
};

export const boardMessages = {
  subtitle: (mode: GameMode, playerCount: number) => `${modeName(mode)} · ${playerCount} players`,
  playersHeading: "Players",
  emptySeat: "Empty seat",
  left: "Left",
  home: (count: number) => `${count} home`,
  yourTurn: "Your turn",
  waitingForTurn: "Opponent's turn",
  isAway: (playerName: string) => `${firstName(playerName)} is away`,
  rollToStart: "Roll the die to start your turn",
  stillRolling: "Still rolling. Waiting for the result…",
  rollingDie: "Rolling the die",
  rollFailed: "Roll didn't go through. Tap the die to try again",
  retryRoll: "The roll didn't go through. Tap to try again",
  yourTurnShort: "your turn",
  rollAgain: "Roll again",
  rollAgainShort: "roll again",
  rollsAgainShort: "rolls again",
  rollingShort: "rolling…",
  pickToken: "pick a token",
  rolledShort: (number: number) => `Rolled a ${number}`,
  tapToMove: "Tap a highlighted token to move it",
  roll: "Roll",
  dieShowing: (number: number) => `Die showing ${number}`,
  dieRolledBy: (playerName: string, number: number) => `${playerName} rolled a ${number}`,
  // Said of a Cell or Yard, as Players tap those, not single Tokens.
  tokensHere: (groups: (NamedPlayer & { count: number })[]) => {
    const total = groups.reduce((sum, { count }) => sum + count, 0);
    const shares = groups.map(({ playerName, isOwn, count }) => `${count} ${isOwn ? "yours" : `${playerName}'s`}`);
    return `${plural(total, "token", "tokens")} here: ${shares.join(", ")}`;
  },
  moveFromHere: (description: string) => `Move a token from here. ${description}`,
  yardOf: (playerName: string, isOwn: boolean, count: number) =>
    `${isOwn ? "Your" : `${playerName}'s`} yard: ${plural(count, "token", "tokens")}`,
  homeLabel: (counts: (NamedPlayer & { count: number })[]) =>
    `Home: ${counts.map(({ playerName, isOwn, count }) => `${playerName}${isOwn ? " (you)" : ""} ${count}`).join(", ")}`,
};

export const resultMessages = {
  subtitle: (mode: GameMode) => modeName(mode),
  gameOver: "Game over",
  won: "The game is over",
  winner: (playerName: string, isOwn: boolean) => isOwn ? "You win" : `${playerName} wins`,
  allHome: `All ${classicRules.tokensPerSeat} tokens reached home first.`,
  othersLeft: "Everyone else left the game.",
  // Of the Capture that won a One Kill Win Game. `captured` names the owner of each Token it took: usually one, but
  // it can be two, of different Seats.
  capture: (winner: NamedPlayer, captured: NamedPlayer[]) =>
    `${winner.isOwn ? "You" : firstName(winner.playerName)} captured ${list(captured.map(tokenOf))}.`,
  tokensHomeHeading: "Tokens home at the end",
  tokensHome: (count: number) => `${count} of ${classicRules.tokensPerSeat} tokens home`,
  // A Player's Standing. Players who tied show the same one.
  standing: (standing: number) => ordinal(standing),
  backToStart: "Back to start",
  cancelledSubtitle: "Lobby",
  cancelledTitle: "Cancelled",
  cancelled: "Game cancelled",
  cancelledBy: (hostName: string) => `The host, ${hostName}, cancelled this game before it started.`,
};
