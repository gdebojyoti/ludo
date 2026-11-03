import { playerNameMaxLength, type RejectionReason } from "@ludo/shared";
import type { ConnectionStatus, Notice } from "./useGameServer";

// Every piece of text the web app shows, in one place.

export const connectionMessages: Record<ConnectionStatus, string> = {
  connecting: "Connecting to server…",
  connected: "Connected to server",
  disconnected: "Not connected to server · retrying",
};

export const rejectionMessages: Record<RejectionReason, string> = {
  alreadyInActiveGame: "You're already in a game.",
  gameCodeNotFound: "No game found with that game code.",
  invalidPlayerName: `Your player name can't be used. It must be 1 to ${playerNameMaxLength} characters long.`,
  noActiveGame: "You're not in a game.",
};

export const noticeMessages: Record<Notice, string> = {
  hostCancelled: "The host cancelled the game.",
  alreadyInGame: "You're already in a game, so here's yours.",
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
  leave: "Leave",
  confirmLeave: "Leave the game?",
  confirmLeaveAsHost: "Leave the game? As the host, leaving cancels it for everyone.",
  confirmLeaveYes: "Yes, leave",
  confirmLeaveNo: "Stay",
};
