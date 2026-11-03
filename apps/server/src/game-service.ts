// The authority on every Game: it validates each command from a Player, changes Games through the store, and
// publishes each change.
import { randomInt as cryptoRandomInt, randomUUID } from "node:crypto";

import { classicRules, gameCodeLength, isValidPlayerName, type RejectionReason } from "@ludo/shared";

import type { GameNotifier } from "./game-notifier.js";
import type { Game, GameStore } from "./game-store.js";

export type CommandResult = { ok: true; game: Game } | { ok: false; reason: RejectionReason };

/** Returns a random whole number from 0 up to, but not including, `max`. */
export type RandomInt = (max: number) => number;

// Every random choice in a Game goes through `randomInt`, so tests can script them. A Game's ID isn't one: it plays no
// part in the rules, and is never sent to a Player.
export const createGameService = (
  store: GameStore,
  notifier: GameNotifier,
  randomInt: RandomInt = cryptoRandomInt,
) => {
  const oneAtATime = createQueue();

  // Published before the command returns, so each Player is sent the change before the reply to their command.
  const save = async (game: Game, leaverId?: string): Promise<Game> => {
    await store.save(game);
    notifier.publish(game, leaverId);
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
    if (!isValidPlayerName(playerName)) return { ok: false, reason: "invalidPlayerName" };
    if (await store.findActiveGameByPlayer(playerId)) return { ok: false, reason: "alreadyInActiveGame" };
    const game: Game = {
      id: randomUUID(),
      state: "lobby",
      gameCode: await newGameCode(),
      hostId: playerId,
      players: [{ playerId, playerName: playerName.trim() }],
    };
    return { ok: true, game: await save(game) };
  });

  /**
   * Adds the Player to the Game in the Lobby with this Game code, after the Players already in it. A full Lobby is
   * refused as if there were no such Game, as a Game that has started will be. Joins run one at a time, so two Players
   * can't both take the last place.
   */
  const joinGame = oneAtATime(async (
    playerId: string,
    gameCode: string,
    playerName: string,
  ): Promise<CommandResult> => {
    if (!isValidPlayerName(playerName)) return { ok: false, reason: "invalidPlayerName" };
    // This also stops a Player joining a Game they're already in.
    if (await store.findActiveGameByPlayer(playerId)) return { ok: false, reason: "alreadyInActiveGame" };
    const game = await store.findLobbyGameByCode(gameCode);
    if (!game || game.players.length >= classicRules.maxPlayers) return { ok: false, reason: "gameCodeNotFound" };
    const players = [...game.players, { playerId, playerName: playerName.trim() }];
    return { ok: true, game: await save({ ...game, players }) };
  });

  /**
   * Leave: the Player steps out of their active Game for good. A Player who isn't the Host is taken out of the Lobby,
   * opening up their place. The Host Leaving the Lobby cancels the Game, which frees every Player in it and retires
   * its Game code.
   */
  const leaveGame = oneAtATime(async (playerId: string): Promise<CommandResult> => {
    const game = await store.findActiveGameByPlayer(playerId);
    if (!game) return { ok: false, reason: "noActiveGame" };
    if (game.hostId === playerId) return { ok: true, game: await save({ ...game, state: "cancelled" }) };
    const players = game.players.filter((player) => player.playerId !== playerId);
    return { ok: true, game: await save({ ...game, players }, playerId) };
  });

  const findActiveGame = oneAtATime((playerId: string) => store.findActiveGameByPlayer(playerId));

  return { createGame, joinGame, leaveGame, findActiveGame };
};

export type GameService = ReturnType<typeof createGameService>;

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
