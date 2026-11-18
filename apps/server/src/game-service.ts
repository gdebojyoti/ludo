// The authority on every Game: it validates each command from a Player, changes Games through the store, and
// publishes each change.
import { randomInt as cryptoRandomInt, randomUUID } from "node:crypto";

import {
  applyMove,
  classicRules,
  dieFaces,
  movePlaysOutFor,
  earnsExtraRoll,
  gameCodeLength,
  giveOutSeats,
  indexAfter,
  isGameMode,
  isValidPlayerName,
  legalMoves,
  nextTakenSeat,
  rollPlaysOutFor,
  startingTokens,
  wonByMove,
  type GameMode,
  type RejectionReason,
  type Seat,
  type TokenPosition,
} from "@ludo/shared";

import type { GameNotifier } from "./game-notifier.js";
import type { Game, GameBoard, GameSeat, GameStore } from "./game-store.js";

export type CommandResult = { ok: true; game: Game } | { ok: false; reason: RejectionReason };

/** Returns a random whole number from 0 up to, but not including, `max`. */
export type RandomInt = (max: number) => number;

/** Says what time it is now. */
export type Clock = () => Date;

// Every random choice in a Game goes through `randomInt`, so tests can script them. A Game's ID isn't one: it plays no
// part in the rules, and is never sent to a Player. Every time a Game is created or saved is read from `now`, so
// tests can script those too.
export const createGameService = (
  store: GameStore,
  notifier: GameNotifier,
  randomInt: RandomInt = cryptoRandomInt,
  now: Clock = () => new Date(),
) => {
  const oneAtATime = createQueue();

  const timestamp = () => now().toISOString();

  /** When a Roll or Move made now, which takes this long to play out, will have played out on every screen. */
  const playsOutAfter = (playsOutFor: number) => new Date(now().getTime() + playsOutFor).toISOString();

  /**
   * Saves the Game as of `savedAt`, now unless it's given, and publishes it, with the Player who just Left it if
   * they're no longer in it. Published before the command returns, so each Player is sent the change before the reply
   * to their command.
   */
  const save = async (game: Game, { leaverId, savedAt = timestamp() }: SaveOptions = {}): Promise<Game> => {
    const saved = { ...game, updatedAt: savedAt };
    await store.save(saved);
    notifier.publish(saved, leaverId);
    return saved;
  };

  const newGameCode = async (): Promise<string> => {
    for (;;) {
      const gameCode = String(randomInt(10 ** gameCodeLength)).padStart(gameCodeLength, "0");
      if (!(await store.findLobbyGameByCode(gameCode))) return gameCode;
    }
  };

  /**
   * The Game, started: the Seats given out to the Players in the order they joined, their Tokens where its Game mode
   * starts them, and the first Player picked at random. Its Game code stops working, as only Games in the Lobby are
   * found by it.
   */
  const started = (game: Game): Game => {
    const seatsInJoinOrder = giveOutSeats(game.players.length);
    const seats = Array.from({ length: classicRules.seats }, (_, seat): GameSeat => {
      const player = game.players[seatsInJoinOrder.indexOf(seat)];
      if (!player) return { playerId: null, leaverName: null, tokens: [] };
      return { playerId: player.playerId, leaverName: null, tokens: startingTokens(game.mode, seat) };
    });
    // `randomInt` is always below the number of Players, so this is one of their Seats.
    const turn = seatsInJoinOrder[randomInt(seatsInJoinOrder.length)] as Seat;
    const board = { seats, turn, rolled: false, lastRoll: null, lastMove: null, playsOutAt: null, winner: null };
    return { ...game, state: "playing", board };
  };

  /** The Board with the Turn passed to the next taken Seat clockwise, not yet Rolled for. */
  const turnPassed = (board: GameBoard): GameBoard => {
    return { ...board, turn: nextTakenSeat(board.turn, takenSeats(board)), rolled: false };
  };

  /** The Player's Game in play, with its Board and their Seat at it, if it's their Turn; otherwise why not. */
  const findTurn = async (playerId: string) => {
    const game = await store.findActiveGameByPlayer(playerId);
    if (!game) return { ok: false as const, reason: "noActiveGame" as const };
    const { board } = game;
    if (game.state !== "playing" || !board) return { ok: false as const, reason: "gameNotInPlay" as const };
    if (board.seats[board.turn]?.playerId !== playerId) return { ok: false as const, reason: "notYourTurn" as const };
    return { ok: true as const, game, board, seat: board.turn };
  };

  /** Creates a Game in the Lobby, following this Game mode, with the Player as its Host. */
  const createGame = oneAtATime(async (
    playerId: string,
    playerName: string,
    mode: GameMode,
  ): Promise<CommandResult> => {
    if (!isValidPlayerName(playerName)) return { ok: false, reason: "invalidPlayerName" };
    if (!isGameMode(mode)) return { ok: false, reason: "invalidGameMode" };
    if (await store.findActiveGameByPlayer(playerId)) return { ok: false, reason: "alreadyInActiveGame" };
    const createdAt = timestamp();
    const game: Game = {
      id: randomUUID(),
      mode,
      state: "lobby",
      gameCode: await newGameCode(),
      hostId: playerId,
      players: [{ playerId, playerName: playerName.trim() }],
      board: null,
      createdAt,
      updatedAt: createdAt,
    };
    return { ok: true, game: await save(game, { savedAt: createdAt }) };
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
   * its Game code. Any Player Leaving during play forfeits: see `forfeited`.
   */
  const leaveGame = oneAtATime(async (playerId: string): Promise<CommandResult> => {
    const game = await store.findActiveGameByPlayer(playerId);
    if (!game) return { ok: false, reason: "noActiveGame" };
    if (game.board) {
      return { ok: true, game: await save(forfeited(game, game.board, playerId), { leaverId: playerId }) };
    }
    return { ok: true, game: await leftLobby(game, playerId) };
  });

  /** Leave, only if the Player's active Game is in the Lobby. A Game in play is left as it is. */
  const leaveLobby = oneAtATime(async (playerId: string): Promise<CommandResult> => {
    const game = await store.findActiveGameByPlayer(playerId);
    if (!game) return { ok: false, reason: "noActiveGame" };
    if (game.state !== "lobby") return { ok: false, reason: "gameNotInLobby" };
    return { ok: true, game: await leftLobby(game, playerId) };
  });

  /** Saves the Game in the Lobby with the Player gone from it: cancelled if they're its Host, else without them. */
  const leftLobby = async (game: Game, playerId: string): Promise<Game> => {
    if (game.hostId === playerId) return save({ ...game, state: "cancelled" });
    const players = game.players.filter((player) => player.playerId !== playerId);
    return save({ ...game, players }, { leaverId: playerId });
  };

  /**
   * The Game in play, with the Player gone from it: their Tokens off the Board, and their Seat empty for the rest of
   * the Game, which Turns skip. If it was their Turn, it passes. If only one Player remains, they win, ending the Game.
   * `board` is the Game's own, passed apart only because it's known not to be null.
   */
  const forfeited = (game: Game, board: GameBoard, playerId: string): Game => {
    const leaver = board.seats.findIndex((seat) => seat.playerId === playerId);
    const leaverName = game.players.find((player) => player.playerId === playerId)?.playerName ?? null;
    const players = game.players.filter((player) => player.playerId !== playerId);
    const emptied = { playerId: null, leaverName, tokens: [] };
    const seats = board.seats.map((seat, index) => (index === leaver ? emptied : seat));
    const withoutLeaver = { ...board, seats };
    const [winner, ...others] = takenSeats(withoutLeaver);
    if (winner !== undefined && others.length === 0) {
      return { ...game, players, state: "won", board: { ...withoutLeaver, turn: winner, rolled: false, winner } };
    }
    return { ...game, players, board: board.turn === leaver ? turnPassed(withoutLeaver) : withoutLeaver };
  };

  /** The Player Rolls on their Turn. If no Token can Move by the Roll, the Turn passes, with the Roll still shown. */
  const roll = oneAtATime(async (playerId: string): Promise<CommandResult> => {
    const turn = await findTurn(playerId);
    if (!turn.ok) return turn;
    const { game, board, seat } = turn;
    if (board.rolled) return { ok: false, reason: "alreadyRolled" };
    const number = randomInt(dieFaces) + 1;
    const rolled = {
      ...board,
      rolled: true,
      lastRoll: { seat, number, index: indexAfter(board.lastRoll) },
      playsOutAt: playsOutAfter(rollPlaysOutFor),
    };
    const tokens = board.seats[seat]?.tokens ?? [];
    const canMove = legalMoves(game.mode, seat, tokens, number).length > 0;
    return { ok: true, game: await save({ ...game, board: canMove ? rolled : turnPassed(rolled) }) };
  });

  /**
   * The Player Moves one of their Tokens, by its place in their Seat's list of Tokens, by their Roll, Capturing any
   * opponents' Tokens it can. A Move that used a 6, made a Capture, or brought a Token Home earns them another Roll in
   * the same Turn; any other passes the Turn. A Move that wins by the Game mode's rules, bringing the Seat's last Token
   * Home in Classic or making a Capture in One Kill Win, ends the Game, which frees every Player in it.
   */
  const move = oneAtATime(async (playerId: string, token: number): Promise<CommandResult> => {
    const turn = await findTurn(playerId);
    if (!turn.ok) return turn;
    const { game, board, seat } = turn;
    if (!board.rolled || !board.lastRoll) return { ok: false, reason: "notRolled" };
    const { number } = board.lastRoll;
    const tokens = board.seats[seat]?.tokens ?? [];
    if (!legalMoves(game.mode, seat, tokens, number).includes(token)) return { ok: false, reason: "illegalMove" };
    const after = applyMove(game.mode, board.seats.map((other) => other.tokens), seat, token, number);
    const moved = after.seats[seat] ?? [];
    // A legal Move is always one of the Seat's Tokens.
    const from = tokens[token] as TokenPosition;
    const lastMove = {
      seat,
      token,
      from,
      to: moved[token] as TokenPosition,
      captured: after.captured,
      index: indexAfter(board.lastMove),
    };
    const seats = board.seats.map((other, index) => ({ ...other, tokens: after.seats[index] ?? other.tokens }));
    const playsOutAt = playsOutAfter(movePlaysOutFor(from, number, after.captured.length > 0));
    if (wonByMove(game.mode, { tokens: moved, captured: after.captured })) {
      const won = { ...board, seats, lastMove, playsOutAt, rolled: false, winner: seat };
      return { ok: true, game: await save({ ...game, state: "won", board: won }) };
    }
    const movedOn = { ...board, seats, lastMove, playsOutAt };
    // A Move that earns another Roll leaves the Turn with the Player, yet to Roll again.
    const next = earnsExtraRoll(number, lastMove) ? { ...movedOn, rolled: false } : turnPassed(movedOn);
    return { ok: true, game: await save({ ...game, board: next }) };
  });

  /**
   * Hands `use` the Player's active Game, or undefined if they have none. It runs in turn with the commands, before
   * the next can change the Game, so whatever it sends from the Game can't arrive after a newer one.
   */
  const withActiveGame = oneAtATime(async (playerId: string, use: (game: Game | undefined) => void) => {
    use(await store.findActiveGameByPlayer(playerId));
  });

  /**
   * The newest Game the Player is still in, even if it has ended, or undefined if there is none. A Player who Leaves
   * is taken out of the Game, so this may then be an older one. It runs in turn with the commands, so it's never read
   * halfway through one.
   */
  const findLastGame = oneAtATime(async (playerId: string) => store.findLastGameByPlayer(playerId));

  /**
   * Up to `limit` Games, whatever their state, the newest created first, with how many Games there are in all. It runs
   * in turn with the commands, so the count and the Games are read with no command between them.
   */
  const findNewestGames = oneAtATime(async (limit: number) => {
    return { total: await store.countGames(), games: await store.findNewestGames(limit) };
  });

  return {
    createGame,
    joinGame,
    startGame,
    leaveGame,
    leaveLobby,
    roll,
    move,
    withActiveGame,
    findLastGame,
    findNewestGames,
  };
};

export type GameService = ReturnType<typeof createGameService>;

interface SaveOptions {
  /** The Player who just Left the Game, if they're no longer in it, so they can be told too. */
  leaverId?: string;
  /** When the Game is saved, as an ISO 8601 time; now unless it's given. */
  savedAt?: string;
}

/** The Seats with a Player in them, by number. */
const takenSeats = (board: GameBoard): Seat[] => {
  return board.seats.flatMap(({ playerId }, index) => (playerId === null ? [] : [index]));
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
