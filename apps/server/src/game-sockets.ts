// The socket layer: turns Socket.IO events into game service commands, and sends each Player their snapshot.
import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@ludo/shared";

import type { GameNotifier } from "./game-notifier.js";
import type { GameService } from "./game-service.js";
import type { PlayerData } from "./identity.js";
import { toSnapshot } from "./snapshot.js";

export type GameIo = Server<ClientToServerEvents, ServerToClientEvents, object, PlayerData>;

export const handleGameSockets = (io: GameIo, gameService: GameService, notifier: GameNotifier) => {
  // Every change to a Game reaches every tab its Players have open.
  notifier.subscribe((game) => {
    game.players.forEach(({ playerId }) => io.to(playerRoom(playerId)).emit("game", toSnapshot(game, playerId)));
  });

  io.on("connection", async (socket) => {
    const { playerId } = socket.data;
    socket.join(playerRoom(playerId));

    socket.on("createGame", async (playerName, ack) => {
      // The check in server.ts only looks at the last argument, so a command sent with no Player name arrives here
      // with its callback as the Player name. It's still answered, so the tab isn't left waiting.
      const reply = typeof ack === "function" ? ack : (playerName as unknown as typeof ack);
      if (typeof playerName !== "string") return reply({ ok: false, reason: "invalidPlayerName" });
      const result = await gameService.createGame(playerId, playerName);
      ack(result.ok ? { ok: true, game: toSnapshot(result.game, playerId) } : result);
    });

    socket.on("leaveGame", async (ack) => {
      const result = await gameService.leaveGame(playerId);
      ack(result.ok ? { ok: true } : result);
    });

    // A Rejoin: only this tab is sent the Game, as nothing about it has changed for the Player's other tabs.
    const game = await gameService.findActiveGame(playerId);
    if (game) socket.emit("game", toSnapshot(game, playerId));
    else socket.emit("noActiveGame");
  });
};

/** One room per Player, holding every tab they have open. */
const playerRoom = (playerId: string) => `player:${playerId}`;
