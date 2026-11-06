// The AI Players (ADR-0008), each known by the Player key it holds in its conversation, in place of the cookie a
// browser keeps (ADR-0003), whichever MCP session its calls arrive on.
import { randomUUID } from "node:crypto";

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { GameNotifier } from "../game-notifier.js";
import type { GameService } from "../game-service.js";

/**
 * Calls `onIdle` once nothing has been in progress for `timeout`. Unref'd, so a timer waiting to run never keeps the
 * server running.
 */
export const createIdleTimer = (timeout: number, onIdle: () => void) => {
  let inProgress = 0;
  let isStopped = false;
  let timer: NodeJS.Timeout | undefined;

  /** Counts something as in progress until the function it returns is called. */
  const start = () => {
    inProgress += 1;
    clearTimeout(timer);
    return () => {
      inProgress -= 1;
      if (inProgress > 0 || isStopped) return;
      timer = setTimeout(onIdle, timeout).unref();
    };
  };

  const stop = () => {
    isStopped = true;
    clearTimeout(timer);
  };

  return { start, stop };
};

type IdleTimer = ReturnType<typeof createIdleTimer>;

/**
 * The AI Players, each known by its Player key, which is its player ID. One is connected while a tool call uses its
 * key, and until `idleTimeout` after the last one ends; while it isn't, it's Away. Keys are kept in memory for as long
 * as the server runs, as Games are (ADR-0004), so a key works for as long as its Game is there.
 */
export const createAiPlayers = (gameService: GameService, notifier: GameNotifier, idleTimeout: number) => {
  const players = new Map<string, { idleTimer: IdleTimer; isConnected: boolean }>();

  // The Player's Game hasn't changed, but how its Players see it has.
  const publishActiveGame = (playerId: string) => {
    return gameService.withActiveGame(playerId, (game) => game && notifier.publish(game));
  };

  /** A new AI Player, who's connected from its first tool call. Returns its Player key. */
  const add = () => {
    const playerKey = randomUUID();
    players.set(playerKey, { idleTimer: createIdleTimer(idleTimeout, () => goIdle(playerKey)), isConnected: false });
    return playerKey;
  };

  /** Forgets an AI Player whose key was never given out, as its first tool call was refused. */
  const remove = (playerKey: string) => {
    players.get(playerKey)?.idleTimer.stop();
    players.delete(playerKey);
  };

  const goIdle = async (playerKey: string) => {
    const player = players.get(playerKey);
    if (!player) return;
    player.isConnected = false;
    // Its conversation may never come back, and a Game can't start, or carry on, with a Player who never acts. So it
    // Leaves a Game in the Lobby, which cancels it if it's the Host. A Game in play is left for the others to end.
    const left = await gameService.leaveLobby(playerKey);
    if (!left.ok) await publishActiveGame(playerKey);
  };

  /** Whether the AI Player with this player ID is connected. False for any other Player. */
  const isConnected = (playerId: string) => players.get(playerId)?.isConnected === true;

  /**
   * Runs a tool call as the AI Player with this key, connected until the call ends, or refuses a missing or unknown
   * key with what to do next.
   */
  const actAs = async (playerKey: string | undefined, act: (playerId: string) => Promise<CallToolResult>) => {
    if (playerKey === undefined) return toolError(missingPlayerKey);
    const player = players.get(playerKey);
    if (!player) return toolError(unknownPlayerKey);
    const end = player.idleTimer.start();
    if (!player.isConnected) {
      player.isConnected = true;
      await publishActiveGame(playerKey);
    }
    try {
      return await act(playerKey);
    } finally {
      end();
    }
  };

  return { add, remove, isConnected, actAs };
};

export type AiPlayers = ReturnType<typeof createAiPlayers>;

export const text = (message: string): CallToolResult => ({ content: [{ type: "text", text: message }] });

export const toolError = (message: string): CallToolResult => ({ ...text(message), isError: true });

const missingPlayerKey = "playerKey is missing: pass the Player key that create_game or join_game gave you, " +
  "exactly as given. If you haven't been given one, call create_game to host a Game, or join_game with a Host's " +
  "Game code.";

const unknownPlayerKey = "That isn't a Player key Ludo gave out, or the server has restarted and forgotten it. " +
  "Check you passed the Player key that create_game or join_game gave you, exactly as given. If you did, your Game " +
  "is gone: call create_game or join_game without a playerKey to play a new one.";
