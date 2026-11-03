import { classicRules, playerNameMaxLength, type Move, type RejectionReason } from "@ludo/shared";
import type { LeaveText } from "./LeaveButton";
import type { ConnectionStatus, Notice } from "./useGameServer";

// Every piece of text the web app shows, in one place.

/** A Player name's first word, as Players are named in longer sentences. */
const firstName = (playerName: string) => playerName.trim().split(/\s+/)[0] ?? playerName;

/** Player names as a list in a sentence: "A", "A and B", or "A, B and C". */
const nameList = (playerNames: string[]) => {
  const names = playerNames.map(firstName);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

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
  invalidPlayerName: `Your player name can't be used. It must be 1 to ${playerNameMaxLength} characters long.`,
  noActiveGame: "You're not in a game.",
  notEnoughPlayers: `The game needs at least ${classicRules.minPlayers} players to start.`,
  notHost: "Only the host can start the game.",
  notRolled: "Roll first, then pick a token to move.",
  notYourTurn: "It's not your turn.",
};

export const noticeMessages: Record<Notice, string> = {
  alreadyInGame: "You're already in a game, so the join link wasn't used. Here's your game.",
};

export const commonMessages = {
  wordmark: "Ludo",
  you: "You",
};

export const startMessages = {
  tagline: "Classic Ludo, with friends",
  playingAs: "You'll play as",
  newName: "Pick a different random name",
  createGame: "Create a game",
  gameCodeLabel: "Join with a game code",
  gameCodePlaceholder: "6-digit code",
  joinGame: "Join",
  invalidJoinLink: "That join link isn't valid. Check it with your friend.",
  joinLinkNoReply: "The connection dropped before you could join. Try joining again.",
};

export const lobbyMessages = {
  subtitle: "Lobby · Classic",
  heading: "Gathering players",
  shareHint: (isHost: boolean) => isHost ? "Your friends join with this code." : "More friends can join with this code.",
  gameCodeHeading: "Game code",
  gameCodeLabel: (gameCode: string) => `Game code ${gameCode.split("").join(" ")}`,
  shareJoinLink: "Share join link",
  shareTitle: "Join my game of Ludo",
  copyCode: "Copy code",
  copied: "Copied",
  playersHeading: "Players",
  playerCount: (count: number) => `${count} of ${classicRules.maxPlayers} · in join order`,
  host: "Host",
  openPlace: "Waiting for a player…",
  start: (count: number) => `Start with ${count} players`,
  startsByItself: `Starts by itself if a ${classicRules.maxPlayers}th player joins first.`,
  waitingForPlayers: "You can start the game once someone joins.",
  waitingForHost: (hostName: string) => `Waiting for ${hostName} to start`,
  orStartsByItself: `Or it starts by itself when a ${classicRules.maxPlayers}th player joins.`,
};

export const leaveMessages = {
  asHostInLobby: (otherNames: string[]): LeaveText => ({
    label: "Leave and cancel the game",
    title: "Cancel this game?",
    message: "You're the Host, so leaving cancels the game for everyone." +
      (otherNames.length ? ` ${nameList(otherNames)} will be sent back to the start.` : ""),
    stay: "Keep the game open",
    leave: "Leave and cancel",
  }),
  inLobby: {
    label: "Leave the lobby",
    title: "Leave this lobby?",
    message: "Your place opens up for someone else. You can rejoin with the code while the game hasn't started.",
    stay: "Stay in the lobby",
    leave: "Leave lobby",
  } satisfies LeaveText,
  inPlay: (otherNames: string[]): LeaveText => ({
    label: "Leave the game",
    title: "Leave this game?",
    message: "You'll forfeit. Your tokens come off the board and your seat stays empty. " + (
      otherNames.length === 1 ? `${nameList(otherNames)} wins.` : `${nameList(otherNames)} keep playing.`
    ),
    stay: "Stay in the game",
    leave: "Leave and forfeit",
  }),
};

export const boardMessages = {
  subtitle: (playerCount: number) => `Classic · ${playerCount} players`,
  emptySeat: "Empty seat",
  left: "Left",
  home: (count: number) => `${count} Home`,
  yourTurn: "Your turn",
  rolling: "Rolling…",
  yourTurnShort: "your turn",
  rollingShort: "rolling…",
  pickToken: "pick a token",
  turnOf: (playerName: string) => `${playerName}'s turn`,
  youRolled: (number: number) => `You rolled a ${number}`,
  rolledShort: (number: number) => `Rolled a ${number}`,
  choosing: (number: number) => `Rolled a ${number} and is choosing a token to move.`,
  waitingToRoll: "Waiting for them to roll.",
  firstRoll: "Roll the die to start your turn.",
  tapToMove: "Tap a highlighted token to move it.",
  placesToMoveFrom: (count: number) => `${plural(count, "place", "places")} to move from`,
  lastRoll: (playerName: string, number: number) => `Last roll: ${playerName} rolled a ${number}`,
  lastMove: (playerName: string, move: Move) => {
    if (move.from.area === "yard") return `Last move: ${playerName} brought a token out.`;
    if (move.to.area === "home") return `Last move: ${playerName} moved a token into Home.`;
    return `Last move: ${playerName} moved a token.`;
  },
  roll: "Roll",
  dieShowing: (number: number) => `Die showing ${number}`,
  dieRolledBy: (playerName: string, number: number) => `${playerName} rolled a ${number}`,
  dieCaption: (playerName: string, isOwn: boolean) => isOwn ? commonMessages.you : firstName(playerName),
  // Said of a Cell or Yard, as Players tap those, not single Tokens.
  tokensHere: (groups: { playerName: string; isOwn: boolean; count: number }[]) => {
    const total = groups.reduce((sum, { count }) => sum + count, 0);
    const shares = groups.map(({ playerName, isOwn, count }) => `${count} ${isOwn ? "yours" : `${playerName}'s`}`);
    return `${plural(total, "token", "tokens")} here: ${shares.join(", ")}`;
  },
  moveFromHere: (description: string) => `Move a token from here. ${description}`,
  yardOf: (playerName: string, isOwn: boolean, count: number) =>
    `${isOwn ? "Your" : `${playerName}'s`} yard: ${plural(count, "token", "tokens")}`,
  homeLabel: (counts: { playerName: string; isOwn: boolean; count: number }[]) =>
    `Home: ${counts.map(({ playerName, isOwn, count }) => `${playerName}${isOwn ? " (you)" : ""} ${count}`).join(", ")}`,
};

export const resultMessages = {
  subtitle: "Game over",
  won: "The game is won",
  winner: (playerName: string, isOwn: boolean) => isOwn ? "You win" : `${playerName} wins`,
  allHome: `All ${classicRules.tokensPerSeat} tokens reached Home first.`,
  othersLeft: "Everyone else left the game.",
  tokensHomeHeading: "Tokens Home at the end",
  tokensHome: (count: number) => `${count} of ${classicRules.tokensPerSeat} tokens Home`,
  backToStart: "Back to start",
  cancelledSubtitle: "Lobby",
  cancelled: "Game cancelled",
  cancelledBy: (hostName: string) => `The Host, ${hostName}, cancelled this game before it started.`,
};
