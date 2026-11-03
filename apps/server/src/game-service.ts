// The authority on every Game: it validates each command from a Player, changes Games through the store, and
// publishes each change.
import { randomInt as cryptoRandomInt, randomUUID } from "node:crypto";

import {
  applyMove,
  classicRules,
  dieFaces,
  gameCodeLength,
  giveOutSeats,
  hasWon,
  isValidPlayerName,
  legalMoves,
  nextTakenSeat,
  type RejectionReason,
  type Seat,
  type TokenPosition,
} from "@ludo/shared";

import type { GameNotifier } from "./game-notifier.js";
import type { Game, GameBoard, GameSeat, GameStore } from "./game-store.js";

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
      if (!player) return { playerId: null, leaverName: null, tokens: [] };
      const tokens = Array.from({ length: classicRules.tokensPerSeat }, () => ({ area: "yard" as const }));
      return { playerId: player.playerId, leaverName: null, tokens };
    });
    // `randomInt` is always below the number of Players, so this is one of their Seats.
    const turn = seatsInJoinOrder[randomInt(seatsInJoinOrder.length)] as Seat;
    const board = { seats, turn, rolled: false, lastRoll: null, lastMove: null, winner: null };
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
   * its Game code. Any Player Leaving during play forfeits: see `forfeited`.
   */
  const leaveGame = oneAtATime(async (playerId: string): Promise<CommandResult> => {
    const game = await store.findActiveGameByPlayer(playerId);
    if (!game) return { ok: false, reason: "noActiveGame" };
    if (game.board) return { ok: true, game: await save(forfeited(game, game.board, playerId), playerId) };
    if (game.hostId === playerId) return { ok: true, game: await save({ ...game, state: "cancelled" }) };
    const players = game.players.filter((player) => player.playerId !== playerId);
    return { ok: true, game: await save({ ...game, players }, playerId) };
  });

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
    const rolled = { ...board, rolled: true, lastRoll: { seat, number } };
    const tokens = board.seats[seat]?.tokens ?? [];
    const canMove = legalMoves(seat, tokens, number).length > 0;
    return { ok: true, game: await save({ ...game, board: canMove ? rolled : turnPassed(rolled) }) };
  });

  /**
   * The Player Moves one of their Tokens, by its place in their Seat's list of Tokens, by their Roll, Capturing any
   * opponents' Tokens it can. A Move that brings the Seat's last Token Home wins, ending the Game, which frees every
   * Player in it.
   */
  const move = oneAtATime(async (playerId: string, token: number): Promise<CommandResult> => {
    const turn = await findTurn(playerId);
    if (!turn.ok) return turn;
    const { game, board, seat } = turn;
    if (!board.rolled || !board.lastRoll) return { ok: false, reason: "notRolled" };
    const { number } = board.lastRoll;
    const tokens = board.seats[seat]?.tokens ?? [];
    if (!legalMoves(seat, tokens, number).includes(token)) return { ok: false, reason: "illegalMove" };
    const after = applyMove(board.seats.map((other) => other.tokens), seat, token, number);
    const moved = after.seats[seat] ?? [];
    // A legal Move is always one of the Seat's Tokens.
    const from = tokens[token] as TokenPosition;
    const lastMove = { seat, token, from, to: moved[token] as TokenPosition, captured: after.captured };
    const seats = board.seats.map((other, index) => ({ ...other, tokens: after.seats[index] ?? other.tokens }));
    if (hasWon(moved)) {
      const won = { ...board, seats, lastMove, rolled: false, winner: seat };
      return { ok: true, game: await save({ ...game, state: "won", board: won }) };
    }
    return { ok: true, game: await save({ ...game, board: turnPassed({ ...board, seats, lastMove }) }) };
  });

  const findActiveGame = oneAtATime((playerId: string) => store.findActiveGameByPlayer(playerId));

  return { createGame, joinGame, startGame, leaveGame, roll, move, findActiveGame };
};

export type GameService = ReturnType<typeof createGameService>;

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
