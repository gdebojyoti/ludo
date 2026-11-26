// The socket layer: turns Socket.IO events into game service commands, and sends each Player their snapshot.
import type { Server } from "socket.io";
import {
  settingsChangeIn,
  type Acknowledgement,
  type ClientToServerEvents,
  type GameMode,
  type GameSnapshot,
  type ServerToClientEvents,
  type Settings,
} from "@ludo/shared";

import type { AccountStore } from "./account-store.js";
import type { GameNotifier } from "./game-notifier.js";
import { createQueue, type CommandResult, type GameService } from "./game-service.js";
import type { Game } from "./game-store.js";
import type { PlayerAccount, PlayerData } from "./identity.js";
import { toSnapshot } from "./snapshot.js";

export type GameIo = Server<ClientToServerEvents, ServerToClientEvents, object, PlayerData>;

/**
 * Listens for Players' tabs, and returns whether a Player is Away. `isAiConnected` says whether an AI Player, which
 * has no tabs, is connected through MCP. `accounts` keeps the settings of the Accounts browsers are signed in to.
 */
export const handleGameSockets = (
  io: GameIo,
  gameService: GameService,
  notifier: GameNotifier,
  isAiConnected: (playerId: string) => boolean,
  accounts: AccountStore,
) => {
  /**
   * Keeps a change to the Account's settings, and sends it to every tab signed in to it, on every browser. Changes are
   * kept and sent one at a time, so of two at the same moment, the Account sent last is the one with both.
   */
  const changeAccountSettings = createQueue()(async (account: PlayerAccount, changed: Partial<Settings>) => {
    const settings = await accounts.changeSettings(account.accountId, changed);
    io.to(accountRoom(account.accountId)).emit("account", { playerName: account.playerName, settings });
  });
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
    const { playerId, account } = socket.data;
    socket.join(playerRoom(playerId));
    if (account) socket.join(accountRoom(account.accountId));
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

    // A Player signed in to an Account enters every Game by its Player name, whatever the web app sends.
    const accountId = account?.accountId ?? null;
    const nameToEnterBy = (sent: string) => account?.playerName ?? sent;

    onCommand("createGame", async ([playerName, mode], reply) => {
      // The Player name first, as the game service checks it first. It checks the Game mode too.
      if (typeof playerName !== "string") return reply({ ok: false, reason: "invalidPlayerName" });
      // A tab still running the web app from before Game modes sends none. It only ever created Classic Games.
      const gameMode = mode === undefined ? "classic" : mode;
      if (typeof gameMode !== "string") return reply({ ok: false, reason: "invalidGameMode" });
      const name = nameToEnterBy(playerName);
      enterGame(await gameService.createGame(playerId, name, gameMode as GameMode, "webApp", accountId), reply);
    });

    onCommand("joinGame", async ([gameCode, playerName], reply) => {
      // The Player name first, as the game service checks it first.
      if (typeof playerName !== "string") return reply({ ok: false, reason: "invalidPlayerName" });
      if (typeof gameCode !== "string") return reply({ ok: false, reason: "gameCodeNotFound" });
      const name = nameToEnterBy(playerName);
      enterGame(await gameService.joinGame(playerId, gameCode, name, "webApp", accountId), reply);
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

    onCommand("changeSettings", async ([changed], reply) => {
      if (!account) return reply({ ok: false, reason: "notSignedIn" });
      const settingsChange = settingsChangeIn(changed);
      if (!settingsChange) return reply({ ok: false, reason: "invalidSettings" });
      await changeAccountSettings(account, settingsChange);
      reply({ ok: true });
    });

    // Closing the Player's last tab makes them Away, which everyone in their Game is shown. The Game waits for them.
    socket.on("disconnect", async () => {
      if (tabCount(playerId) > 0) return;
      await gameService.withActiveGame(playerId, (game) => game && sendToPlayers(game));
    });

    // The Account, before the Game, so the tab shows its settings from the start.
    if (!account) socket.emit("account", null);
    else socket.emit("account", { playerName: account.playerName, settings: await findSettings(account.accountId) });

    // A Guest who signed in during a Game stays in it, now known by their Account, and shown by its Player name. That
    // sends the Game to everyone in it, this tab included, which brings them back from Away too.
    if (account && await gameService.signIn(playerId, account)) return;

    // A Rejoin. A Player's first tab brings them back from Away, which everyone in their Game is shown, this tab
    // included. Any other tab changes nothing for the rest, so only it is sent the Game.
    await gameService.withActiveGame(playerId, (game) => {
      if (!game) socket.emit("noActiveGame");
      else if (isFirstTab) sendToPlayers(game);
      else socket.emit("game", toSnapshot(game, playerId, isAway));
    });
  });

  /**
   * The settings the Account has changed, or none if they can't be read, such as while the database is down, so the
   * browser keeps its own.
   */
  const findSettings = async (accountId: string) => {
    try {
      return await accounts.findSettings(accountId);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`The settings of Account ${accountId} couldn't be read:`, reason);
      return {};
    }
  };

  return { isAway };
};

type Command = keyof ClientToServerEvents;

/** The callback a command is answered through, its last argument. */
type Reply<Event extends Command> = Parameters<ClientToServerEvents[Event]> extends [...unknown[], infer Ack]
  ? Ack
  : never;

/** One room per Player, holding every tab they have open. */
const playerRoom = (playerId: string) => `player:${playerId}`;

/** One room per Account, holding every tab signed in to it, on every browser. */
const accountRoom = (accountId: string) => `account:${accountId}`;
