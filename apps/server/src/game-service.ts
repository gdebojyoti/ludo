// The authority on every Game: it validates each command from a Player, changes Games through the store, and
// publishes each change.
import { randomInt as cryptoRandomInt, randomUUID } from "node:crypto";

import {
  classicRules,
  gameCodeLength,
  giveOutSeats,
  isValidPlayerName,
  type RejectionReason,
  type Seat,
} from "@ludo/shared";

import type { GameNotifier } from "./game-notifier.js";
import type { Game, GameSeat, GameStore } from "./game-store.js";

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

  /**
   * The Game, started: the Seats given out to the Players in the order they joined, every Token in its Yard, and the
   * first Player picked at random. Its Game code stops working, as only Games in the Lobby are found by it.
   */
  const started = (game: Game): Game => {
    const seatsInJoinOrder = giveOutSeats(game.players.length);
    const seats = Array.from({ length: classicRules.seats }, (_, seat): GameSeat => {
      const player = game.players[seatsInJoinOrder.indexOf(seat)];
      if (!player) return { playerId: null, tokens: [] };
      const tokens = Array.from({ length: classicRules.tokensPerSeat }, () => ({ area: "yard" as const }));
      return { playerId: player.playerId, tokens };
    });
    // `randomInt` is always below the number of Players, so this is one of their Seats.
    const turn = seatsInJoinOrder[randomInt(seatsInJoinOrder.length)] as Seat;
    return { ...game, state: "playing", board: { seats, turn } };
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
      board: null,
    };
    return { ok: true, game: await save(game) };
  });

  /**
   * Adds the Player to the Game in the Lobby with this Game code, after the Players already in it. The join that fills the
   * Lobby starts the Game, after which its Game code no longer finds it. Joins run one at a time, so two Players can't
   * both take the last place.
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
    if (!game) return { ok: false, reason: "gameCodeNotFound" };
    const players = [...game.players, { playerId, playerName: playerName.trim() }];
    const joined = { ...game, players };
    return { ok: true, game: await save(players.length === classicRules.maxPlayers ? started(joined) : joined) };
  });

  /** The Host starts their Game in the Lobby, once it has enough Players. */
  const startGame = oneAtATime(async (playerId: string): Promise<CommandResult> => {
    const game = await store.findActiveGameByPlayer(playerId);
    if (!game) return { ok: false, reason: "noActiveGame" };
    if (game.state !== "lobby") return { ok: false, reason: "gameNotInLobby" };
    if (game.hostId !== playerId) return { ok: false, reason: "notHost" };
    if (game.players.length < classicRules.minPlayers) return { ok: false, reason: "notEnoughPlayers" };
    return { ok: true, game: await save(started(game)) };
  });

  /**
   * Leave: the Player steps out of their active Game for good. A Player who isn't the Host is taken out of the Lobby,
   * opening up their place. The Host Leaving the Lobby cancels the Game, which frees every Player in it and retires
   * its Game code. Leaving a Game that has started is refused, until Players can forfeit.
   */
  const leaveGame = oneAtATime(async (playerId: string): Promise<CommandResult> => {
    const game = await store.findActiveGameByPlayer(playerId);
    if (!game) return { ok: false, reason: "noActiveGame" };
    if (game.state !== "lobby") return { ok: false, reason: "gameNotInLobby" };
    if (game.hostId === playerId) return { ok: true, game: await save({ ...game, state: "cancelled" }) };
    const players = game.players.filter((player) => player.playerId !== playerId);
    return { ok: true, game: await save({ ...game, players }, playerId) };
  });

  const findActiveGame = oneAtATime((playerId: string) => store.findActiveGameByPlayer(playerId));

  return { createGame, joinGame, startGame, leaveGame, findActiveGame };
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
