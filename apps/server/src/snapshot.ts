// How a Game looks to one of its Players.
import type { GameSnapshot } from "@ludo/shared";

import type { Game } from "./game-store.js";

/**
 * The Game as this Player sees it. Never includes a player ID: the ID is the only proof of who a Player is.
 */
export const toSnapshot = (game: Game, playerId: string): GameSnapshot => {
  return {
    state: game.state,
    gameCode: game.state === "lobby" ? game.gameCode : null,
    isHost: game.hostId === playerId,
    players: game.players.map(({ playerName }) => ({ playerName })),
  };
};
