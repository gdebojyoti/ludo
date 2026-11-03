import { playerNameMaxLength, type RejectionReason } from "@ludo/shared";
import type { ConnectionStatus } from "./useGameServer";

// Every piece of text the web app shows, in one place.

export const connectionMessages: Record<ConnectionStatus, string> = {
  connecting: "Connecting to server…",
  connected: "Connected to server",
  disconnected: "Not connected to server · retrying",
};

export const rejectionMessages: Record<RejectionReason, string> = {
  alreadyInActiveGame: "You're already in a game.",
  invalidPlayerName: `Your player name can't be used. It must be 1 to ${playerNameMaxLength} characters long.`,
  noActiveGame: "You're not in a game.",
};

export const commonMessages = {
  wordmark: "Ludo",
};

export const startMessages = {
  playingAs: "Playing as",
  createGame: "Create a game",
};

export const lobbyMessages = {
  gameCodeHeading: "Game code",
  shareHint: "Share this code with your friends so they can join.",
  host: "Host",
  leave: "Leave",
  confirmLeave: "Leave the game? As the host, leaving cancels it.",
  confirmLeaveYes: "Yes, leave",
  confirmLeaveNo: "Stay",
};
