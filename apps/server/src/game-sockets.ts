// The socket layer: turns Socket.IO events into game service commands, and sends each Player their snapshot.
import type { Server } from "socket.io";
import type { Acknowledgement, ClientToServerEvents, GameSnapshot, ServerToClientEvents } from "@ludo/shared";

import type { GameNotifier } from "./game-notifier.js";
import type { CommandResult, GameService } from "./game-service.js";
import type { Game } from "./game-store.js";
import type { PlayerData } from "./identity.js";
import { toSnapshot } from "./snapshot.js";

export type GameIo = Server<ClientToServerEvents, ServerToClientEvents, object, PlayerData>;

export const handleGameSockets = (io: GameIo, gameService: GameService, notifier: GameNotifier) => {
  const tabCount = (playerId: string) => io.sockets.adapter.rooms.get(playerRoom(playerId))?.size ?? 0;
  // A Player is Away while none of their tabs is connected. Read when each snapshot is made, so it's never stale.
  const isAway = (playerId: string) => tabCount(playerId) === 0;

  /** Sends the Game to every tab its Players have open, each as they see it. */
  const sendToPlayers = (game: Game) => {
    game.players.forEach(({ playerId }) => {
      io.to(playerRoom(playerId)).emit("game", toSnapshot(game, playerId, isAway));
    });
  };

  // Every change to a Game reaches every tab its Players have open, and every tab of a Player who just Left it.
  notifier.subscribe((game, leaverId) => {
    sendToPlayers(game);
    if (leaverId) io.to(playerRoom(leaverId)).emit("noActiveGame");
  });

  io.on("connection", async (socket) => {
    const { playerId } = socket.data;
    socket.join(playerRoom(playerId));
    // Counted at once, before anything is awaited, so of two tabs opening together only one is the first.
    const isFirstTab = tabCount(playerId) === 1;

    // Answers a command that puts the Player in a Game with the Game as they see it.
    const enterGame = (result: CommandResult, ack: (reply: Acknowledgement<{ game: GameSnapshot }>) => void) => {
      ack(result.ok ? { ok: true, game: toSnapshot(result.game, playerId, isAway) } : result);
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

    socket.on("startGame", async (ack) => {
      const result = await gameService.startGame(playerId);
      ack(result.ok ? { ok: true } : result);
    });

    socket.on("leaveGame", async (ack) => {
      const result = await gameService.leaveGame(playerId);
      ack(result.ok ? { ok: true } : result);
    });

    socket.on("roll", async (ack) => {
      const result = await gameService.roll(playerId);
      ack(result.ok ? { ok: true } : result);
    });

    socket.on("move", async (token, ack) => {
      const reply = [ack, token].find(isCallback) as typeof ack;
      // Any token that isn't one of the Player's legal Moves is refused by the game service.
      if (typeof token !== "number") return reply({ ok: false, reason: "illegalMove" });
      const result = await gameService.move(playerId, token);
      ack(result.ok ? { ok: true } : result);
    });

    // Closing the Player's last tab makes them Away, which everyone in their Game is shown. The Game waits for them.
    socket.on("disconnect", async () => {
      if (tabCount(playerId) > 0) return;
      await gameService.withActiveGame(playerId, (game) => game && sendToPlayers(game));
    });

    // A Rejoin. A Player's first tab brings them back from Away, which everyone in their Game is shown, this tab
    // included. Any other tab changes nothing for the rest, so only it is sent the Game.
    await gameService.withActiveGame(playerId, (game) => {
      if (!game) socket.emit("noActiveGame");
      else if (isFirstTab) sendToPlayers(game);
      else socket.emit("game", toSnapshot(game, playerId, isAway));
    });
  });
};

const isCallback = (argument: unknown) => typeof argument === "function";

/** One room per Player, holding every tab they have open. */
const playerRoom = (playerId: string) => `player:${playerId}`;
