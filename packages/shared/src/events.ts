// The Socket.IO event contract between the web app and the server.
// Both sides type their sockets with these, so a change here is checked on both.

/**
 * Stages a Game goes through: in the Lobby, or cancelled by its Host Leaving it there. A Game in the Lobby is active;
 * a cancelled one has ended.
 */
export type GameState = "lobby" | "cancelled";

/** A Game as one Player sees it. The server sends a fresh one after every change, and it replaces the last. */
export interface GameSnapshot {
  state: GameState;
  /** The six-digit Game code the Host shares, while the Game is in the Lobby; otherwise null. */
  gameCode: string | null;
  /** Whether the Player viewing this snapshot is the Host. */
  isHost: boolean;
  /** The Game's Players, in the order they joined, so the Host is first. */
  players: SnapshotPlayer[];
}

/** One of a Game's Players, as every Player sees them. Never their player ID: that's the only proof of who they are. */
export interface SnapshotPlayer {
  playerName: string;
}

/** Why the server refused a command. Each reason is added with the first command that can give it. */
export type RejectionReason = "alreadyInActiveGame" | "invalidPlayerName" | "noActiveGame";

/** The server's answer to a command: success with its result, or a refusal with the reason. */
export type Acknowledgement<Result extends object = object> =
  | ({ ok: true } & Result)
  | { ok: false; reason: RejectionReason };

/** Events the web app sends to the server. */
export interface ClientToServerEvents {
  /** Checks the server is answering; the server acknowledges with `"pong"`. */
  ping: (ack: (reply: "pong") => void) => void;
  /**
   * Creates a Game in the Lobby with this Player as its Host, shown by this Player name. Refused if the Player is
   * already in an active Game, or the Player name, once trimmed, is empty or longer than `playerNameMaxLength`.
   */
  createGame: (playerName: string, ack: (reply: Acknowledgement<{ game: GameSnapshot }>) => void) => void;
  /** Leaves the Player's active Game. A Host Leaving the Lobby cancels the Game. Refused if they have none. */
  leaveGame: (ack: (reply: Acknowledgement) => void) => void;
}

/** Events the server sends to the web app. */
export interface ServerToClientEvents {
  /** The Player's Game, sent when they connect while in an active Game, and after every change to it. */
  game: (game: GameSnapshot) => void;
  /** Sent when a Player connects without an active Game, so the web app shows the start screen. */
  noActiveGame: () => void;
}
