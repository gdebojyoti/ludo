// The socket layer: turns Socket.IO events into game service commands, and sends each Player their snapshot.
import type { Server } from "socket.io";
import type {
  Acknowledgement,
  ClientToServerEvents,
  GameMode,
  GameSnapshot,
  ServerToClientEvents,
} from "@ludo/shared";

import type { GameNotifier } from "./game-notifier.js";
import type { CommandResult, GameService } from "./game-service.js";
import type { Game } from "./game-store.js";
import type { PlayerData } from "./identity.js";
import { toSnapshot } from "./snapshot.js";

export type GameIo = Server<ClientToServerEvents, ServerToClientEvents, object, PlayerData>;

/**
 * Listens for Players' tabs, and returns whether a Player is Away. `isAiConnected` says whether an AI Player, which
 * has no tabs, is connected through MCP.
 */
export const handleGameSockets = (
  io: GameIo,
  gameService: GameService,
  notifier: GameNotifier,
  isAiConnected: (playerId: string) => boolean,
) => {
  const tabCount = (playerId: string) => io.sockets.adapter.rooms.get(playerRoom(playerId))?.size ?? 0;
  // A Player is Away while none of their tabs is connected, or, for an AI Player, while it's idle. Read when each
  // snapshot is made, so it's never stale.
  const isAway = (playerId: string) => tabCount(playerId) === 0 && !isAiConnected(playerId);

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

    /**
     * Listens for a command, whatever arguments it's sent with. The check in server.ts drops any command whose last
     * argument isn't a function, so the reply callback is always the last one. The rest go to `handle`, which checks
     * them, as a client may send too few, too many, or ones of the wrong type. An error in `handle` is logged and
     * answered, so one command can't crash the server and lose every Game with it.
     */
    const onCommand = <Event extends Command>(
      event: Event,
      handle: (args: unknown[], reply: Reply<Event>) => Promise<void>,
    ) => {
      const listener = async (...args: unknown[]) => {
        const reply = args.at(-1) as (reply: Acknowledgement) => void;
        try {
          await handle(args.slice(0, -1), reply as Reply<Event>);
        } catch (error) {
          console.error(`The ${event} command failed for Player ${playerId}`, error);
          // Socket.IO sends only the first reply, so this one is dropped if the command was already answered. `ping`
          // can't fail, so every command that gets here is answered with an Acknowledgement.
          reply({ ok: false, reason: "serverError" });
        }
      };
      // Socket.IO types each listener by its event, which one listener for every command can't be.
      socket.on(event, listener as never);
    };

    onCommand("ping", async (_args, reply) => reply("pong"));

    onCommand("createGame", async ([playerName, mode], reply) => {
      // The Player name first, as the game service checks it first. It checks the Game mode too.
      if (typeof playerName !== "string") return reply({ ok: false, reason: "invalidPlayerName" });
      // A tab still running the web app from before Game modes sends none. It only ever created Classic Games.
      if (mode === undefined) return enterGame(await gameService.createGame(playerId, playerName, "classic"), reply);
      if (typeof mode !== "string") return reply({ ok: false, reason: "invalidGameMode" });
      enterGame(await gameService.createGame(playerId, playerName, mode as GameMode), reply);
    });

    onCommand("joinGame", async ([gameCode, playerName], reply) => {
      // The Player name first, as the game service checks it first.
      if (typeof playerName !== "string") return reply({ ok: false, reason: "invalidPlayerName" });
      if (typeof gameCode !== "string") return reply({ ok: false, reason: "gameCodeNotFound" });
      enterGame(await gameService.joinGame(playerId, gameCode, playerName), reply);
    });

    onCommand("startGame", async (_args, reply) => {
      const result = await gameService.startGame(playerId);
      reply(result.ok ? { ok: true } : result);
    });

    onCommand("leaveGame", async (_args, reply) => {
      const result = await gameService.leaveGame(playerId);
      reply(result.ok ? { ok: true } : result);
    });

    onCommand("roll", async (_args, reply) => {
      const result = await gameService.roll(playerId);
      reply(result.ok ? { ok: true } : result);
    });

    onCommand("move", async ([token], reply) => {
      // Any token that isn't one of the Player's legal Moves is refused by the game service.
      if (typeof token !== "number") return reply({ ok: false, reason: "illegalMove" });
      const result = await gameService.move(playerId, token);
      reply(result.ok ? { ok: true } : result);
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

  return { isAway };
};

type Command = keyof ClientToServerEvents;

/** The callback a command is answered through, its last argument. */
type Reply<Event extends Command> = Parameters<ClientToServerEvents[Event]> extends [...unknown[], infer Ack]
  ? Ack
  : never;

/** One room per Player, holding every tab they have open. */
const playerRoom = (playerId: string) => `player:${playerId}`;
