import { classicRules, playerNameMaxLength, type Move, type RejectionReason } from "@ludo/shared";
import type { ConnectionStatus, Notice } from "./useGameServer";

// Every piece of text the web app shows, in one place.

export const connectionMessages: Record<ConnectionStatus, string> = {
  connecting: "Connecting to server…",
  connected: "Connected to server",
  disconnected: "Not connected to server · retrying",
};

export const rejectionMessages: Record<RejectionReason, string> = {
  alreadyInActiveGame: "You're already in a game.",
  alreadyRolled: "You've already rolled. Pick a token to move.",
  gameCodeNotFound: "No game found with that game code.",
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
  hostCancelled: "The host cancelled the game.",
  alreadyInGame: "You're already in a game, so the join link wasn't used. Here's your game.",
};

export const commonMessages = {
  wordmark: "Ludo",
};

export const startMessages = {
  playingAs: "Playing as",
  createGame: "Create a game",
  gameCodeLabel: "Game code",
  gameCodePlaceholder: "000000",
  joinGame: "Join",
  invalidJoinLink: "That join link isn't valid. Check it with your friend.",
  joinLinkNoReply: "The connection dropped before you could join. Try joining again.",
};

export const lobbyMessages = {
  gameCodeHeading: "Game code",
  shareHint: "Send your friends the join link, or this code, so they can join.",
  copyJoinLink: "Copy join link",
  copyCode: "Copy game code",
  copied: "Copied",
  playersHeading: "Players",
  host: "Host",
  start: "Start the game",
  waitingForPlayers: "You can start the game once someone joins.",
  waitingForHost: "Waiting for the host to start the game.",
};

export const leaveMessages = {
  leave: "Leave",
  confirmInLobby: "Leave the game?",
  confirmAsHostInLobby: "Leave the game? As the host, leaving cancels it for everyone.",
  confirmInPlay: "Leave the game? You'll forfeit, your tokens come off the board, and you can't come back.",
  confirmYes: "Yes, leave",
  confirmNo: "Stay",
};

export const boardMessages = {
  yourTurn: (playerName: string) => `Your turn, ${playerName}`,
  turnOf: (playerName: string) => `${playerName}'s turn`,
  youWon: (playerName: string) => `You won, ${playerName}!`,
  won: (playerName: string) => `${playerName} won!`,
  backToStart: "Back to the start",
  you: "you",
  emptySeat: "Empty seat",
  left: "left",
  roll: "Roll",
  pickToken: "Pick one of your highlighted tokens to move.",
  rolled: (playerName: string, number: number) => `${playerName} rolled a ${number}.`,
  // The Move itself is marked on the Board.
  moved: (playerName: string, move: Move) => {
    if (move.from.area === "yard") return `${playerName} brought a token out.`;
    if (move.to.area === "home") return `${playerName} brought a token home.`;
    return `${playerName} moved a token.`;
  },
  tokens: (playerName: string, count: number) => `${playerName}: ${count} ${count === 1 ? "token" : "tokens"}`,
  moveToken: (count: number) => `Move ${count === 1 ? "this token" : "one of these tokens"}`,
};
