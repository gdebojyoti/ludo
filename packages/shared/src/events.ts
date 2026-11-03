// The Socket.IO event contract between the web app and the server.
// Both sides type their sockets with these, so a change here is checked on both.
import type { Seat } from "./rules.js";

/**
 * Stages a Game goes through: in the Lobby, in play once it has started, or cancelled by its Host Leaving the Lobby.
 * A Game in the Lobby or in play is active; a cancelled one has ended.
 */
export type GameState = "lobby" | "playing" | "cancelled";

/** A Game as one Player sees it. The server sends a fresh one after every change, and it replaces the last. */
export interface GameSnapshot {
  state: GameState;
  /** The six-digit Game code the Host shares, while the Game is in the Lobby; otherwise null. */
  gameCode: string | null;
  /** Whether the Player viewing this snapshot is the Host. */
  isHost: boolean;
  /** The Game's Players, in the order they joined. */
  players: SnapshotPlayer[];
  /** The Seat of the Player viewing this snapshot, once the Game has started; otherwise null. */
  seat: Seat | null;
  /** Every Seat at the Board, by number, once the Game has started; empty in the Lobby. */
  seats: SnapshotSeat[];
  /** The Seat whose Turn it is, while the Game is in play; otherwise null. */
  turn: Seat | null;
}

/** One of a Game's Players, as every Player sees them. Never their player ID: that's the only proof of who they are. */
export interface SnapshotPlayer {
  playerName: string;
  isHost: boolean;
}

/** One of the Seats at the Board, as every Player sees it. */
export interface SnapshotSeat {
  /** The Player name of the Player in this Seat, or null if it's empty. */
  playerName: string | null;
  /** Where each of the Seat's Tokens is. An empty Seat has none. */
  tokens: TokenPosition[];
}

/** Where a Token is. Each place a Token can be is added with the first command that can put it there. */
export type TokenPosition = { area: "yard" };

/** Why the server refused a command. Each reason is added with the first command that can give it. */
export type RejectionReason =
  | "alreadyInActiveGame"
  | "gameCodeNotFound"
  | "gameNotInLobby"
  | "invalidPlayerName"
  | "noActiveGame"
  | "notEnoughPlayers"
  | "notHost";

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
  /**
   * Joins the Game in the Lobby with this Game code, shown by this Player name. Refused for the same Player names as
   * `createGame`, if the Player is already in an active Game, or if no Game in the Lobby has the code. The join that
   * fills the Lobby starts the Game, so a full Game is no longer in it.
   */
  joinGame: (
    gameCode: string,
    playerName: string,
    ack: (reply: Acknowledgement<{ game: GameSnapshot }>) => void,
  ) => void;
  /**
   * Starts the Player's Game in the Lobby, giving out the Seats and picking who goes first. Refused unless the Player
   * is its Host, and it has at least `classicRules.minPlayers` Players.
   */
  startGame: (ack: (reply: Acknowledgement) => void) => void;
  /**
   * Leaves the Player's Game in the Lobby. A Host Leaving it cancels the Game. Refused if they have no active Game,
   * or it has started.
   */
  leaveGame: (ack: (reply: Acknowledgement) => void) => void;
}

/** Events the server sends to the web app. */
export interface ServerToClientEvents {
  /** The Player's Game, sent when they connect while in an active Game, and after every change to it. */
  game: (game: GameSnapshot) => void;
  /** Sent when a Player connects without an active Game, so the web app shows the start screen. */
  noActiveGame: () => void;
}
