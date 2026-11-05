// Where Games are kept. The game service only knows this interface, so the in-memory store (ADR-0004) can be swapped
// for a Postgres one without touching game logic.
import type { GameMode, GameState, Move, Roll, Seat, TokenPosition } from "@ludo/shared";

export interface Game {
  id: string;
  /** The Game mode whose rules the Game follows, chosen by its Host when they created it. */
  mode: GameMode;
  state: GameState;
  /** Shared by the Host so others can join. Unique among Games in the Lobby, and only used there. */
  gameCode: string;
  hostId: string;
  /** The Players in the Game, in the order they joined. */
  players: GamePlayer[];
  /** The Board, once the Game has started; null in the Lobby. */
  board: GameBoard | null;
  /** When the Game was created, as an ISO 8601 time. */
  createdAt: string;
  /** When the Game was last saved, as an ISO 8601 time. */
  updatedAt: string;
}

export interface GameBoard {
  /** Every Seat at the Board, by number. */
  seats: GameSeat[];
  /** The Seat whose Turn it is. */
  turn: Seat;
  /** Whether the Player whose Turn it is has Rolled, and is yet to Move by `lastRoll`. */
  rolled: boolean;
  /** The latest Roll in the Game; null before the first. */
  lastRoll: Roll | null;
  /** The latest Move in the Game; null before the first. */
  lastMove: Move | null;
  /** The Seat whose Player won the Game: set exactly when the Game's state is won, and otherwise null. */
  winner: Seat | null;
}

export interface GamePlayer {
  playerId: string;
  /** The Player name they gave when they entered the Game, kept for the whole Game. */
  playerName: string;
}

export interface GameSeat {
  /** The player ID of the Player in this Seat, or null if it's empty. */
  playerId: string | null;
  /** The Player name of the Player who Left this Seat during play, emptying it for the rest of the Game; else null. */
  leaverName: string | null;
  /** Where each of the Seat's Tokens is. An empty Seat has none. */
  tokens: TokenPosition[];
}

export interface GameStore {
  /** Adds the Game, or replaces the one with the same ID. */
  save: (game: Game) => Promise<void>;
  /** The Game the Player is in, if it's active: a Player is in at most one active Game. */
  findActiveGameByPlayer: (playerId: string) => Promise<Game | undefined>;
  findLobbyGameByCode: (gameCode: string) => Promise<Game | undefined>;
  /** Up to `limit` Games, whatever their state, the newest created first. */
  findNewestGames: (limit: number) => Promise<Game[]>;
}

export const createMemoryGameStore = (): GameStore => {
  const games = new Map<string, Game>();

  return {
    save: async (game) => {
      games.set(game.id, copy(game));
    },
    findActiveGameByPlayer: async (playerId) => {
      const game = [...games.values()].find((game) => isActive(game) && isPlayerIn(game, playerId));
      return game && copy(game);
    },
    findLobbyGameByCode: async (gameCode) => {
      const game = [...games.values()].find((game) => game.state === "lobby" && game.gameCode === gameCode);
      return game && copy(game);
    },
    findNewestGames: async (limit) => {
      // A Map keeps its keys in the order they were first set, which saving a Game again doesn't change, so this is
      // the order the Games were created in.
      return [...games.values()].reverse().slice(0, limit).map(copy);
    },
  };
};

/** Whether the Game is still going, rather than ended. The Lobby counts. */
const isActive = (game: Game) => game.state === "lobby" || game.state === "playing";

const isPlayerIn = (game: Game, playerId: string) => game.players.some((player) => player.playerId === playerId);

// Hands out copies, so changing a Game only takes effect once it's saved, as with a database.
const copy = (game: Game): Game => structuredClone(game);
