// The socket layer: turns Socket.IO events into game service commands, and sends each Player their snapshot.
import type { Server } from "socket.io";
import type { Acknowledgement, ClientToServerEvents, GameSnapshot, ServerToClientEvents } from "@ludo/shared";

import type { GameNotifier } from "./game-notifier.js";
import type { CommandResult, GameService } from "./game-service.js";
import type { PlayerData } from "./identity.js";
import { toSnapshot } from "./snapshot.js";

export type GameIo = Server<ClientToServerEvents, ServerToClientEvents, object, PlayerData>;

export const handleGameSockets = (io: GameIo, gameService: GameService, notifier: GameNotifier) => {
  // Every change to a Game reaches every tab its Players have open, and every tab of a Player who just Left it.
  notifier.subscribe((game, leaverId) => {
    game.players.forEach(({ playerId }) => io.to(playerRoom(playerId)).emit("game", toSnapshot(game, playerId)));
    if (leaverId) io.to(playerRoom(leaverId)).emit("noActiveGame");
  });

  io.on("connection", async (socket) => {
    const { playerId } = socket.data;
    socket.join(playerRoom(playerId));

    // Answers a command that puts the Player in a Game with the Game as they see it.
    const enterGame = (result: CommandResult, ack: (reply: Acknowledgement<{ game: GameSnapshot }>) => void) => {
      ack(result.ok ? { ok: true, game: toSnapshot(result.game, playerId) } : result);
    };

    // The check in server.ts only looks at the last argument, so a command sent with too few arguments arrives in
    // these with its callback in an earlier place. It's still answered, so the tab isn't left waiting.
    socket.on("createGame", async (playerName, ack) => {
      const reply = [ack, playerName].find(isCallback) as typeof ack;
      if (typeof playerName !== "string") return reply({ ok: false, reason: "invalidPlayerName" });
      enterGame(await gameService.createGame(playerId, playerName), ack);
    });

    socket.on("joinGame", async (gameCode, playerName, ack) => {
      const reply = [ack, playerName, gameCode].find(isCallback) as typeof ack;
      // The Player name first, as the game service checks it first.
      if (typeof playerName !== "string") return reply({ ok: false, reason: "invalidPlayerName" });
      if (typeof gameCode !== "string") return reply({ ok: false, reason: "gameCodeNotFound" });
      enterGame(await gameService.joinGame(playerId, gameCode, playerName), ack);
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

const isCallback = (argument: unknown) => typeof argument === "function";

/** One room per Player, holding every tab they have open. */
const playerRoom = (playerId: string) => `player:${playerId}`;
