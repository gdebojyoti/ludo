import type { GameSnapshot, GameState } from "@ludo/shared";
import { track } from "./analytics";
import { howWonAt, playerCountAt, winnerAt } from "./boardView";

// Analytics for the Player's Game, from each snapshot of it this page is sent (ADR-0010): game_start, token_capture for
// a Capture the Player made, and game_over. There's one game on the page, so what it has seen is kept here, as the
// settings are.

/** What the page has seen of the Player's Game, to tell what's new in each snapshot. */
interface Seen {
  state: GameState;
  /** The index of the Game's latest Move, or -1 before the first, so each Capture is sent once. */
  lastMove: number;
}

let seen: Seen | undefined;

// Whether the Player is creating or joining a Game from this page, until the server has replied.
let entering = false;

const howNames = { allHome: "all_home", capture: "capture", othersLeft: "others_left" } as const;

/** How many Players the Game has: those it started with once it has, and those in the Lobby before. */
const playerCount = (game: GameSnapshot) => (game.board ? playerCountAt(game.board) : game.players.length);

/**
 * Call just before a command that creates or joins a Game, and what it returns once the server has replied, so a Game
 * the fourth Player's join starts counts as started from this page, even if a snapshot of it comes before the reply.
 */
export const enteringGame = () => {
  entering = true;
  return () => {
    entering = false;
  };
};

/** Reads a snapshot of the Player's Game, or null once they have none, and sends what's new in it. */
export const sawGame = (game: GameSnapshot | null) => {
  if (!game) {
    seen = undefined;
    return;
  }
  const before = seen;
  const { mode, state, board } = game;
  const lastMove = board?.lastMove ?? null;
  seen = { state, lastMove: lastMove?.index ?? -1 };

  // A Game seen for the first time. A new Game always starts in the Lobby, unless the fourth Player's join starts it.
  // One first seen in play otherwise was already going, as after a reload.
  if (!before || (state === "lobby" && before.state !== "lobby")) {
    if (entering && state === "playing" && board) track("game_start", { mode, players: playerCountAt(board) });
    entering = false;
    return;
  }

  if (before.state === "lobby" && state === "playing" && board) {
    track("game_start", { mode, players: playerCountAt(board) });
  }
  if (board && lastMove && lastMove.index > before.lastMove && lastMove.seat === board.seat && lastMove.captured.length) {
    track("token_capture", { mode, tokens: lastMove.captured.length });
  }
  if (before.state === "playing" && state === "won" && board) {
    track("game_over", {
      mode,
      players: playerCountAt(board),
      won: winnerAt(board) === board.seat,
      how: howNames[howWonAt(mode, board).how],
    });
  }
};

/**
 * Call just before the Player Leaves their Game, and what it returns once they have, to send game_left. A Player who
 * Leaves is sent no more snapshots of the Game, so it's read now.
 */
export const leavingGame = (game: GameSnapshot | null | undefined) => {
  if (!game || (game.state !== "lobby" && game.state !== "playing")) return () => {};
  const data = { mode: game.mode, players: playerCount(game), phase: game.state };
  return () => track("game_left", data);
};
