// The authority on every Game: it validates each command from a Player, changes Games through the store, and
// publishes each change.
import { randomInt as cryptoRandomInt, randomUUID } from "node:crypto";

import { gameCodeLength, playerNameMaxLength, type RejectionReason } from "@ludo/shared";

import type { GameNotifier } from "./game-notifier.js";
import type { Game, GameStore } from "./game-store.js";

export type CommandResult = { ok: true; game: Game } | { ok: false; reason: RejectionReason };

/** Returns a random whole number from 0 up to, but not including, `max`. */
export type RandomInt = (max: number) => number;

// Every random choice the server makes goes through `randomInt`, so tests can script them.
export const createGameService = (
  store: GameStore,
  notifier: GameNotifier,
  randomInt: RandomInt = cryptoRandomInt,
) => {
  const oneAtATime = createQueue();

  // Published before the command returns, so each Player is sent the change before the reply to their command.
  const save = async (game: Game): Promise<Game> => {
    await store.save(game);
    notifier.publish(game);
    return game;
  };

  const newGameCode = async (): Promise<string> => {
    for (;;) {
      const gameCode = String(randomInt(10 ** gameCodeLength)).padStart(gameCodeLength, "0");
      if (!(await store.findLobbyGameByCode(gameCode))) return gameCode;
    }
  };

  /** Creates a Game in the Lobby, with the Player as its Host. */
  const createGame = oneAtATime(async (playerId: string, playerName: string): Promise<CommandResult> => {
    const trimmedName = playerName.trim();
    if (!isValidPlayerName(trimmedName)) return { ok: false, reason: "invalidPlayerName" };
    if (await store.findActiveGameByPlayer(playerId)) return { ok: false, reason: "alreadyInActiveGame" };
    const game: Game = {
      id: randomUUID(),
      state: "lobby",
      gameCode: await newGameCode(),
      hostId: playerId,
      players: [{ playerId, playerName: trimmedName }],
    };
    return { ok: true, game: await save(game) };
  });

  /**
   * Leave: the Player steps out of their active Game for good. Until others can join, the Host is the only Player in
   * the Lobby, and their Leaving cancels the Game, which frees every Player in it and retires its Game code.
   */
  const leaveGame = oneAtATime(async (playerId: string): Promise<CommandResult> => {
    const game = await store.findActiveGameByPlayer(playerId);
    if (!game) return { ok: false, reason: "noActiveGame" };
    return { ok: true, game: await save({ ...game, state: "cancelled" }) };
  });

  const findActiveGame = oneAtATime((playerId: string) => store.findActiveGameByPlayer(playerId));

  return { createGame, leaveGame, findActiveGame };
};

export type GameService = ReturnType<typeof createGameService>;

/** Whether a trimmed Player name can be shown: not empty, and short enough. */
const isValidPlayerName = (playerName: string) => {
  const length = [...playerName].length;
  return length > 0 && length <= playerNameMaxLength;
};

// Runs commands one at a time, each finishing before the next starts. Commands that run side by side could both pass
// a check before either saves: a double click on Create would create two Games.
const createQueue = () => {
  let last: Promise<unknown> = Promise.resolve();

  return <Args extends unknown[], Result>(command: (...args: Args) => Promise<Result>) => {
    return (...args: Args): Promise<Result> => {
      const result = last.then(() => command(...args));
      // A command that fails mustn't stop the ones queued after it.
      last = result.catch(() => {});
      return result;
    };
  };
};
