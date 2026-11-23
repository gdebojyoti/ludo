import { useEffect, useRef } from "react";
import type { GameSnapshot, GameState } from "@ludo/shared";
import { track } from "./analytics";
import { howWonAt, playerCountAt, winnerAt } from "./boardView";

/** What the page has seen of the Player's Game, to tell what's new in each snapshot. */
interface Seen {
  state: GameState;
  /** When the page saw the Game reach its state, or first saw the Game, if that was later. The server doesn't say. */
  since: number;
  /** The index of the Game's latest Move, or -1 before the first, so each Capture is sent once. */
  lastMove: number;
}

const howNames = { allHome: "all_home", capture: "capture", othersLeft: "others_left" } as const;

const secondsSince = (time: number) => Math.round((Date.now() - time) / 1000);

/** How many Players the Game has: those it started with once it has, and those in the Lobby before. */
const playerCount = (game: GameSnapshot) => (game.board ? playerCountAt(game.board) : game.players.length);

/**
 * Analytics for the Player's Game, sent by each Player's own browser as it sees the server's snapshots: game_start,
 * token_capture for a Capture the Player made, and game_over. A page that opens partway through a Game, as after a
 * reload, starts from there: it sends no game_start for it, and counts seconds from when it opened. A Player who Leaves
 * is sent no more snapshots of the Game, so call `leaving` just before they Leave, and what it returns once they have,
 * to send game_left.
 */
export const useGameAnalytics = (game: GameSnapshot | null | undefined) => {
  const seen = useRef<Seen>(undefined);

  useEffect(() => {
    if (!game) {
      seen.current = undefined;
      return;
    }
    const before = seen.current;
    const { mode, state, board } = game;
    const lastMove = board?.lastMove ?? null;
    const now: Seen = { state, since: Date.now(), lastMove: lastMove?.index ?? -1 };
    // A Game seen for the first time. A new Game always starts in the Lobby.
    if (!before || (state === "lobby" && before.state !== "lobby")) {
      seen.current = now;
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
        seconds: secondsSince(before.since),
        how: howNames[howWonAt(mode, board).how],
      });
    }
    seen.current = { ...now, since: state === before.state ? before.since : now.since };
  }, [game]);

  const leaving = () => {
    const before = seen.current;
    if (!game || !before || (game.state !== "lobby" && game.state !== "playing")) return () => {};
    const data = { mode: game.mode, players: playerCount(game), phase: game.state, seconds: secondsSince(before.since) };
    return () => track("game_left", data);
  };

  return { leaving };
};
