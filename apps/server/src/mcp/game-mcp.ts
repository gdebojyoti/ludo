// The MCP layer (ADR-0008): serves `/mcp`, where AI Players create, join and play Games through tools. Each AI Player
// is known by the Player key it holds in its conversation, whichever MCP session its calls arrive on, so several
// conversations on one account, which may share a session, can each play as their own Player, even in the same Game.
import { randomInt, randomUUID } from "node:crypto";

import express, { type Express } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest, type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  classicRules,
  gameModes,
  isSafeCell,
  playerNameMaxLength,
  randomPlayerName,
  startCell,
  type RejectionReason,
} from "@ludo/shared";
import { z } from "zod";

import { createIdleTimer, text, toolError, type AiPlayers } from "./ai-players.js";
import { boardView, modeNames } from "./board-view.js";
import type { GameNotifier } from "../game-notifier.js";
import type { CommandResult, GameService } from "../game-service.js";
import type { Game } from "../game-store.js";
import { toSnapshot, type IsAway } from "../snapshot.js";

/** How long, in milliseconds, an AI Player's `wait_for_turn` waits, and how long an MCP session can sit idle. */
export interface McpTimeouts {
  waitForTurn: number;
  sessionIdle: number;
}

export const handleGameMcp = (
  app: Express,
  gameService: GameService,
  notifier: GameNotifier,
  aiPlayers: AiPlayers,
  isAway: IsAway,
  webAppUrl: string,
  timeouts: McpTimeouts,
) => {
  const sessions = new Map<string, Session>();
  const context: ToolContext = {
    aiPlayers,
    gameService,
    notifier,
    isAway,
    webAppUrl,
    waitForTurnTimeout: timeouts.waitForTurn,
    lastShown: new Map(),
  };

  app.all("/mcp", express.json(), async (req, res) => {
    const sessionId = req.header("mcp-session-id");
    const session = sessionId === undefined ? undefined : sessions.get(sessionId);
    if (session) {
      session.track(res);
      return session.transport.handleRequest(req, res, req.body);
    }
    // A client whose session has gone, such as after the server restarted, starts a new one when told so with a 404.
    if (sessionId !== undefined) return res.status(404).json(jsonRpcError("The session has ended: start a new one"));
    if (req.method !== "POST" || !isInitializeRequest(req.body)) {
      return res.status(400).json(jsonRpcError("Start a session with an initialize request"));
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, newSession);
      },
    });
    const newSession = createSession(transport, timeouts.sessionIdle);
    // Set before connecting: the MCP server keeps a handler that's already set, and calls it when the session closes.
    transport.onclose = () => {
      newSession.stopTracking();
      const id = transport.sessionId;
      if (id !== undefined) sessions.delete(id);
    };
    // Tracked from the start, so a session whose initialization never finishes is closed too.
    newSession.track(res);
    await createGameTools(context).connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
};

type Session = ReturnType<typeof createSession>;

/**
 * An MCP session, closed once it has been idle for `idleTimeout`, as many clients never say when they're done. It's
 * idle while it has no request open, so a long `wait_for_turn`, or a stream the client keeps open, keeps it going.
 * Closing it ends no Game, as the AI Players whose calls arrived on it can carry on from another session.
 */
const createSession = (transport: StreamableHTTPServerTransport, idleTimeout: number) => {
  const idleTimer = createIdleTimer(idleTimeout, () => transport.close());

  /** Counts the request this response answers as open until the response closes. */
  const track = (res: express.Response) => {
    res.on("close", idleTimer.start());
  };

  return { transport, track, stopTracking: idleTimer.stop };
};

/** What every session's tools share. */
interface ToolContext {
  aiPlayers: AiPlayers;
  gameService: GameService;
  notifier: GameNotifier;
  isAway: IsAway;
  webAppUrl: string;
  waitForTurnTimeout: number;
  /** The Game each AI Player was last shown, by its player ID: one entry for each, kept as long as its key. */
  lastShown: Map<string, ShownGame>;
}

interface ShownGame {
  gameId: string;
  /**
   * The Players in the Game's Lobby when it was shown, if it was in the Lobby; otherwise null. So an AI Host's
   * `wait_for_turn` returns once someone joins or Leaves, and any AI's once the Game starts.
   */
  lobbyPlayers: string | null;
}

/** The MCP server for one session: the tools that every AI Player whose calls arrive on it plays with. */
const createGameTools = (
  { aiPlayers, gameService, notifier, isAway, webAppUrl, waitForTurnTimeout, lastShown }: ToolContext,
) => {
  const server = new McpServer({ name: "ludo", version: "1.0.0" }, { instructions: guide });

  /** The Board view of the Game, after lines saying what just happened. */
  const viewOf = (playerId: string, game: Game, ...notes: string[]): CallToolResult => {
    lastShown.set(playerId, { gameId: game.id, lobbyPlayers: game.state === "lobby" ? lobbyPlayersOf(game) : null });
    return text([...notes, boardView(toSnapshot(game, playerId, isAway))].join("\n\n"));
  };

  /**
   * The Game the AI last created or joined, or undefined if they've Left it. Every Game they enter is shown to them,
   * so one they're still in is the last shown. A Player who Leaves is taken out of the Game, so the newest Game
   * they're still in is then an older one, or none.
   */
  const findCurrentGame = async (playerId: string) => {
    const game = await gameService.findLastGame(playerId);
    return game && game.id === lastShown.get(playerId)?.gameId ? game : undefined;
  };

  /** Whether the Game started since the AI was last shown it, in the Lobby. */
  const hasStartedSinceShown = (playerId: string, game: Game) => {
    return game.state !== "lobby" && game.state !== "cancelled" && lastShown.get(playerId)?.lobbyPlayers != null;
  };

  /**
   * Whether the AI has something to do: it's their Turn, their Game has started or ended, or, as its Host, someone
   * has joined or Left their Lobby since they were last shown it.
   */
  const isReady = (playerId: string, game: Game) => {
    if (game.state === "lobby") {
      return game.hostId === playerId && lastShown.get(playerId)?.lobbyPlayers !== lobbyPlayersOf(game);
    }
    if (game.state !== "playing") return true;
    return hasStartedSinceShown(playerId, game) || isTurnOf(playerId, game);
  };

  /**
   * Resolves true once a change to a Game the Player is in, or just Left, is published, or false once `stopped`
   * aborts. Listening starts at once, so a change made while the caller looks at the Game still counts.
   */
  const nextChange = (playerId: string, stopped: AbortSignal) => {
    let unsubscribe = () => {};
    const changed = new Promise<boolean>((resolve) => {
      if (stopped.aborted) return resolve(false);
      stopped.addEventListener("abort", () => resolve(false), { once: true });
      unsubscribe = notifier.subscribe((game, leaverId) => {
        if (leaverId === playerId || game.players.some((player) => player.playerId === playerId)) resolve(true);
      });
    });
    return { changed, stop: () => unsubscribe() };
  };

  const answer = (playerId: string, result: CommandResult, ...notes: string[]) => {
    return result.ok ? viewOf(playerId, result.game, ...notes) : refusal(result.reason);
  };

  /**
   * Creates or joins a Game as the AI Player with this key, or, when there's none, as a new AI Player given a key.
   * `note` says what happened.
   */
  const enterGame = async (
    playerKey: string | undefined,
    command: (playerId: string) => Promise<CommandResult>,
    note: (game: Game) => string,
  ) => {
    const isNew = playerKey === undefined;
    const key = playerKey ?? aiPlayers.add();
    return aiPlayers.actAs(key, async (playerId) => {
      const result = await command(playerId);
      if (!result.ok) {
        if (isNew) aiPlayers.remove(key);
        return refusal(result.reason);
      }
      const keyNote = isNew
        ? `Your Player key is ${key}. Pass it as playerKey to every tool you call from now on, exactly as given: ` +
          "it's how Ludo knows you're you, and without it you can't carry on this Game."
        : "Keep passing the same playerKey to every tool you call.";
      return viewOf(playerId, result.game, note(result.game), keyNote);
    });
  };

  /** The name an AI Player is shown by: the one it gave, or a random one. */
  const nameFor = (playerName: string | undefined) => playerName ?? randomPlayerName(randomInt);

  server.registerTool(
    "create_game",
    {
      description: "Creates a Game following the Game mode you choose, with you as its Host, and returns its Join " +
        "link and Game code, which you give the Players you're playing so they can join it, and your Player key. " +
        guide,
      inputSchema: {
        mode: z.enum(gameModes, { error: `mode must be one of ${gameModes.map((mode) => `"${mode}"`).join(", ")}` })
          .optional()
          .describe("The Game mode: \"classic\" (the default) or \"oneKillWin\". If the Player you're playing for " +
            "hasn't said which, ask them."),
        playerName: optionalPlayerName,
        playerKey: optionalPlayerKey,
      },
    },
    async (args) => enterGame(
      args.playerKey,
      (playerId) => gameService.createGame(playerId, nameFor(args.playerName), args.mode ?? "classic"),
      (game) => {
        return `You created a ${modeNames[game.mode]} Game. Send the Players you're playing its Join link, ` +
          `${joinLinkFor(webAppUrl, game.gameCode)}, which joins them as soon as they open it. Or they can open ` +
          `${webAppUrl} and enter the Game code ${game.gameCode}, and another AI can call join_game with it. Call ` +
          "wait_for_turn to wait for them: it returns each time someone joins or Leaves. Once enough have joined, " +
          "call start_game.";
      },
    ),
  );

  server.registerTool(
    "join_game",
    {
      description: "Joins the Game in the Lobby with this Game code, and returns who's in it and your Player key. " +
        guide,
      inputSchema: {
        gameCode: z.string({ error: "gameCode must be the six-digit Game code the Host gave you, as text" })
          .describe("The six-digit Game code the Host gave you"),
        playerName: optionalPlayerName,
        playerKey: optionalPlayerKey,
      },
    },
    async (args) => enterGame(
      args.playerKey,
      (playerId) => gameService.joinGame(playerId, args.gameCode.trim(), nameFor(args.playerName)),
      (game) => {
        const name = game.players.at(-1)?.playerName;
        return game.state === "lobby"
          ? `You joined the Game as ${name}. Call wait_for_turn, which returns once the Game has started and it's ` +
            "your Turn."
          : `You joined the Game as ${name}, the last Player it had room for, which started it. Call wait_for_turn, ` +
            "which returns once it's your Turn.";
      },
    ),
  );

  server.registerTool(
    "start_game",
    {
      description: `As the Host, starts your Game in the Lobby once it has ${classicRules.minPlayers} or more ` +
        "Players, giving out the Seats and picking who goes first. Nobody can join after that. " + guide,
      inputSchema: { playerKey: requiredPlayerKey },
    },
    async (args) => aiPlayers.actAs(args.playerKey, async (playerId) => {
      return answer(playerId, await gameService.startGame(playerId), "You started the Game. Call wait_for_turn, " +
        "which returns once it's your Turn.");
    }),
  );

  server.registerTool(
    "wait_for_turn",
    {
      description: "Waits until it's your Turn, then Rolls for you and returns the Board, with the Tokens you can " +
        "Move by your Roll. A Roll none of your Tokens can Move by passes your Turn, and it waits on. It also " +
        "returns when your Game starts or ends, and, while you're the Host in the Lobby, when someone joins or " +
        `Leaves. If that takes too long, it returns saying you're still waiting: call it again. ${guide}`,
      inputSchema: { playerKey: requiredPlayerKey },
    },
    async (args, { signal }) => aiPlayers.actAs(args.playerKey, async (playerId) => {
      const stopped = AbortSignal.any([signal, AbortSignal.timeout(waitForTurnTimeout)]);
      const notes: string[] = [];
      const stillWaiting = (game: Game) => {
        return text([...notes, `Still waiting for ${waitingFor(playerId, game)}: call wait_for_turn again.`]
          .join("\n\n"));
      };
      for (;;) {
        // Listening before looking, so a change made in between still wakes the wait.
        const next = nextChange(playerId, stopped);
        try {
          const game = await findCurrentGame(playerId);
          if (!game) return refusal("noActiveGame");
          if (!isReady(playerId, game)) {
            if (await next.changed) continue;
            return stillWaiting(game);
          }
          if (hasStartedSinceShown(playerId, game)) {
            notes.push("Your Game has started.");
            // Said once, so a Roll that passes the Turn goes on to wait for the next.
            lastShown.set(playerId, { gameId: game.id, lobbyPlayers: null });
          }
          if (game.state !== "playing" || !isTurnOf(playerId, game) || game.board?.rolled) {
            return viewOf(playerId, game, ...notes);
          }
          const rolled = await gameService.roll(playerId);
          // Refused only if the Game changed since it was looked at, so it's looked at again, unless time is up.
          if (!rolled.ok) {
            if (stopped.aborted) return stillWaiting(game);
            continue;
          }
          const { board } = rolled.game;
          if (board?.rolled) return viewOf(playerId, rolled.game, ...notes);
          notes.push(`You Rolled a ${board?.lastRoll?.number}, which none of your Tokens could Move by, so your ` +
            "Turn passed.");
        } finally {
          next.stop();
        }
      }
    }),
  );

  server.registerTool(
    "move_token",
    {
      description: "Moves one of your Tokens by the Roll wait_for_turn made for you, and returns the Board after " +
        "it. Choose one of the Tokens wait_for_turn listed as able to Move. Then call wait_for_turn, which Rolls " +
        `again for you if the Move earned another Roll. ${guide}`,
      inputSchema: {
        token: z.number({ error: `token must be a whole number from 1 to ${classicRules.tokensPerSeat}` })
          .describe("Which of your Tokens to Move, by its number on the Board, from 1 to " +
            `${classicRules.tokensPerSeat}`),
        playerKey: requiredPlayerKey,
      },
    },
    async ({ token, ...args }) => aiPlayers.actAs(args.playerKey, async (playerId) => {
      const result = await gameService.move(playerId, token - 1);
      if (!result.ok) return refusal(result.reason);
      const { game } = result;
      if (game.state === "won") return viewOf(playerId, game, "Your Move won the Game!");
      const isYourTurn = isTurnOf(playerId, game);
      return viewOf(playerId, game, isYourTurn
        ? "Your Move earned another Roll: call wait_for_turn, which Rolls for you."
        : "Your Token Moved, and your Turn has passed. Call wait_for_turn, which returns once it's your Turn again.");
    }),
  );

  server.registerTool(
    "leave_game",
    {
      description: "Leave: steps out of your Game for good. In the Lobby, it makes room for someone else, or, if " +
        "you're the Host, cancels the Game. During play, you forfeit: your Tokens come off the Board, and if only " +
        `one Player remains, they win. ${guide}`,
      inputSchema: { playerKey: requiredPlayerKey },
    },
    async (args) => aiPlayers.actAs(args.playerKey, async (playerId) => {
      const result = await gameService.leaveGame(playerId);
      if (!result.ok) return refusal(result.reason);
      return text(result.game.state === "cancelled"
        ? "You Left the Lobby. As you were its Host, the Game was cancelled."
        : "You Left the Game. Call create_game or join_game to play another.");
    }),
  );

  return server;
};

/** Whether it's the Turn of the Player with this player ID, in a Game in play. */
const isTurnOf = (playerId: string, game: Game) => {
  return game.state === "playing" && game.board?.seats[game.board.turn]?.playerId === playerId;
};

/** The Players in a Game in the Lobby, so a change to who's in it can be told. */
const lobbyPlayersOf = (game: Game) => game.players.map((player) => player.playerId).join(",");

/** What a Player whose Game isn't ready for them is waiting for. */
const waitingFor = (playerId: string, game: Game) => {
  if (game.state === "lobby") {
    return game.hostId === playerId
      ? `someone else to join with Game code ${game.gameCode}`
      : "the Host to start the Game";
  }
  const turn = game.board?.seats[game.board.turn]?.playerId;
  const name = game.players.find((player) => player.playerId === turn)?.playerName;
  return `${name ?? "another Player"} to take their Turn`;
};

/** The web app's address that joins the Game with this code as soon as it's opened. */
const joinLinkFor = (webAppUrl: string, gameCode: string) => `${webAppUrl}?join=${gameCode}`;

const trackCells = Array.from({ length: classicRules.trackCells }, (_, cell) => cell);

const rules = `Ludo is a race for 2 to ${classicRules.maxPlayers} Players, each in their own Seat at a ` +
  `cross-shaped Board, with ${classicRules.tokensPerSeat} Tokens that start in the Seat's Yard. The Seats are ` +
  `numbered 0 to ${classicRules.seats - 1} clockwise. The Track is a loop of ${classicRules.trackCells} Cells, ` +
  `numbered 0 to ${classicRules.trackCells - 1} clockwise, and Tokens travel round it clockwise. Seat n's Start ` +
  `cell, where its Tokens enter the Track, is Track cell ${startCell(1)}n. The Safe cells, where no Token can be ` +
  `Captured, are the Start cells and the Star cells ${classicRules.starCellOffset} Cells on from each: ` +
  `${trackCells.filter(isSafeCell).join(", ")}. On your Turn you Roll a die, then must Move one of your Tokens ` +
  "that can Move by the Roll, choosing which; if none can, your Turn passes. Only a " +
  `${classicRules.rollToLeaveYard} brings a Token out of the Yard, onto its Start cell. A Token that ends its Move ` +
  "on a Track cell Captures every opponent's Token alone there, sending it back to its Yard, unless it's a Safe " +
  "cell. Two or more Tokens of one Seat on a Cell protect each other. A Move that used a " +
  `${classicRules.rollToRollAgain}, made a Capture, or brought a Token Home earns another Roll in the same Turn. ` +
  "Play goes clockwise round the Seats, from a first Player picked at random. A Player who Leaves during play " +
  "forfeits, and if only one Player remains, they win.";

const modes = `There are two Game modes. In ${modeNames.classic}, each Token goes round the Track from its Start ` +
  `cell to the Cell 2 before it, then up its Seat's own Home column of ${classicRules.homeColumnCells} Cells to ` +
  "Home, and needs an exact Roll to reach Home. The first Player with all their Tokens Home wins. In " +
  `${modeNames.oneKillWin}, each Seat starts with 2 Tokens on its Start cell, and Tokens never leave the Track, ` +
  "going round it again and again. The first Player to Capture a Token wins.";

const playLoop = "To play: call create_game to host a Game, or join_game with the Game code a Host gives you. " +
  "Either gives you a Player key: pass it as playerKey to every tool you call after that. As the Host, call " +
  "wait_for_turn until enough Players have joined, then start_game. Then call wait_for_turn, which Rolls for you " +
  "when it's your Turn, then move_token, then wait_for_turn again, and so on until the Game ends.";

/** How to play, which every tool repeats, as some clients never show the model the server's instructions. */
const guide = `${rules} ${modes} ${playLoop}`;

const playerKeyType = z.string({
  error: "playerKey must be the Player key create_game or join_game gave you, as text",
});

// Optional in the schema, so a missing one is refused with what to do next, as other refusals are, rather than as
// bad arguments.
const requiredPlayerKey = playerKeyType.optional()
  .describe("Required: the Player key create_game or join_game gave you");

const optionalPlayerKey = playerKeyType.optional()
  .describe("The Player key create_game or join_game gave you, if you've been given one in this conversation, so " +
    "you stay the same Player. Leave it out to play as a new Player.");

const optionalPlayerName = z.string({ error: "playerName must be text" }).optional()
  .describe(`The name the other Players see you by, up to ${playerNameMaxLength} characters. Leave it out to be ` +
    "given a random one.");

/** What each refusal means to the AI, and what to do next. */
const explanations: Record<RejectionReason, string> = {
  alreadyInActiveGame: "You're already in a Game that hasn't ended, and you can only be in one at a time. Finish " +
    "it, or call leave_game, before creating or joining another.",
  // wait_for_turn only Rolls for a Player who hasn't, so no tool is refused this way.
  alreadyRolled: "You've already Rolled: call move_token with one of the Tokens that can Move.",
  gameCodeNotFound: "No Game in the Lobby has that Game code. Check the six-digit code with the Host: a Game code " +
    "stops working once its Game has started, or been cancelled.",
  gameNotInLobby: "Your Game has already started. Call wait_for_turn, which returns once it's your Turn.",
  gameNotInPlay: "Your Game isn't in play: it hasn't started yet, or it has ended. Call wait_for_turn, which " +
    "returns once it's your Turn, or says how it ended.",
  illegalMove: "That Token can't Move by your Roll. Choose one of the Tokens the Board lists as able to Move, by " +
    `its number from 1 to ${classicRules.tokensPerSeat}.`,
  invalidGameMode: `That isn't a Game mode: choose ${gameModes.map((mode) => `"${mode}"`).join(" or ")}.`,
  invalidPlayerName: `playerName must have 1 to ${playerNameMaxLength} characters, not counting spaces at either ` +
    "end. Leave it out to be given a random one.",
  noActiveGame: "You're not in a Game. Call create_game to host one, or join_game with a Host's Game code.",
  notEnoughPlayers: `Your Game needs at least ${classicRules.minPlayers} Players to start. Call wait_for_turn, ` +
    "which returns once someone joins.",
  notHost: "Only the Host can start the Game. Call wait_for_turn, which returns once they have and it's your Turn.",
  notRolled: "You haven't Rolled yet: call wait_for_turn, which Rolls for you when it's your Turn.",
  notYourTurn: "It's not your Turn. Call wait_for_turn, which returns once it is.",
  serverError: "Something went wrong on the server. Try again.",
};

const refusal = (reason: RejectionReason): CallToolResult => toolError(explanations[reason]);

const jsonRpcError = (message: string) => ({ jsonrpc: "2.0", error: { code: -32000, message }, id: null });
