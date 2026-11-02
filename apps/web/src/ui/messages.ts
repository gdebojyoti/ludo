import type { ConnectionStatus } from "./useGameServer";

// Every piece of text the web app shows, in one place.

export const connectionMessages: Record<ConnectionStatus, string> = {
  connecting: "Connecting to server…",
  connected: "Connected to server",
  disconnected: "Not connected to server · retrying",
};

export const commonMessages = {
  wordmark: "Ludo",
};
