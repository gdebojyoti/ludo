// How a Game looks to one of its Players.
import type { GameSnapshot } from "@ludo/shared";

import type { Game } from "./game-store.js";

/**
 * The Game as this Player sees it. Never includes a player ID: the ID is the only proof of who a Player is.
 */
export const toSnapshot = (game: Game, playerId: string): GameSnapshot => {
  const playerName = (id: string) => game.players.find((player) => player.playerId === id)?.playerName ?? null;
  const ownSeat = game.seats.findIndex((seat) => seat.playerId === playerId);
  return {
    state: game.state,
    gameCode: game.state === "lobby" ? game.gameCode : null,
    isHost: game.hostId === playerId,
    players: game.players.map((player) => ({ playerName: player.playerName, isHost: player.playerId === game.hostId })),
    seat: ownSeat === -1 ? null : ownSeat,
    seats: game.seats.map((seat) => ({
      playerName: seat.playerId === null ? null : playerName(seat.playerId),
      tokens: seat.tokens,
    })),
    turn: game.turn,
  };
};
