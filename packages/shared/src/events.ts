// The Socket.IO event contract between the web app and the server.
// Both sides type their sockets with these, so a change here is checked on both.
import type { Seat, TokenPosition } from "./rules.js";

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
  /** The Board, once the Game has started; null in the Lobby. */
  board: SnapshotBoard | null;
}

/** The Board as one Player sees it. */
export interface SnapshotBoard {
  /** The Seat of the Player viewing this snapshot. */
  seat: Seat;
  /** Every Seat at the Board, by number. */
  seats: SnapshotSeat[];
  /** The Seat whose Turn it is. */
  turn: Seat;
  /** Whether the Player whose Turn it is has Rolled, and is yet to Move. */
  rolled: boolean;
  /** The latest Roll in the Game, still shown after its Turn passes; null before the first. */
  lastRoll: Roll | null;
  /** The latest Move in the Game; null before the first. */
  lastMove: Move | null;
  /**
   * The viewer's Tokens that can Move by their Roll, by their place in the Seat's list of Tokens, once they've Rolled
   * on their Turn. Empty for everyone else, and before they Roll.
   */
  moves: number[];
}

/** A Roll, by the Seat whose Turn it was. */
export interface Roll {
  seat: Seat;
  /** The number Rolled, from 1 up to `dieFaces`. */
  number: number;
}

/** A Move, by the Seat whose Turn it was. */
export interface Move {
  seat: Seat;
  /** Which of the Seat's Tokens Moved, by its place in the Seat's list of Tokens. */
  token: number;
  from: TokenPosition;
  to: TokenPosition;
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

/** Why the server refused a command. Each reason is added with the first command that can give it. */
export type RejectionReason =
  | "alreadyInActiveGame"
  | "alreadyRolled"
  | "gameCodeNotFound"
  | "gameNotInLobby"
  | "gameNotStarted"
  | "illegalMove"
  | "invalidPlayerName"
  | "noActiveGame"
  | "notEnoughPlayers"
  | "notHost"
  | "notRolled"
  | "notYourTurn";

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
  /**
   * Rolls the die for the Player on their Turn. If no Token can Move by the Roll, the Turn passes. Refused unless the
   * Player's Game has started, it's their Turn, and they haven't Rolled yet.
   */
  roll: (ack: (reply: Acknowledgement) => void) => void;
  /**
   * Moves the Player's Token, by its place in their Seat's list of Tokens, by their Roll, and passes the Turn.
   * Refused unless the Player's Game has started, it's their Turn, they've Rolled, and the Move is one of their legal
   * Moves.
   */
  move: (token: number, ack: (reply: Acknowledgement) => void) => void;
}

/** Events the server sends to the web app. */
export interface ServerToClientEvents {
  /** The Player's Game, sent when they connect while in an active Game, and after every change to it. */
  game: (game: GameSnapshot) => void;
  /** Sent when a Player connects without an active Game, so the web app shows the start screen. */
  noActiveGame: () => void;
}
