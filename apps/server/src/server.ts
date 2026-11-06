import { createServer, type Server as HttpServer } from "node:http";

import express from "express";
import { Server } from "socket.io";

import type { Config } from "./config.js";
import { handleDebugGames } from "./debug-games.js";
import { createGameNotifier } from "./game-notifier.js";
import { createGameService, type Clock, type RandomInt } from "./game-service.js";
import { handleGameSockets, type GameIo } from "./game-sockets.js";
import { createMemoryGameStore } from "./game-store.js";
import { identifyPlayers } from "./identity.js";
import { createAiPlayers } from "./mcp/ai-players.js";
import { handleGameMcp } from "./mcp/game-mcp.js";

export interface GameServer {
  httpServer: HttpServer;
  io: GameIo;
}

export interface GameServerOptions {
  /** Makes every random choice, such as Game codes. Tests replace it to make them predictable. */
  randomInt?: RandomInt;
  /** Says when each Game is created and saved. Tests replace it to make the times predictable. */
  now?: Clock;
  /** How long, in milliseconds, an AI Player's `wait_for_turn` waits before saying to call it again. */
  waitForTurnTimeout?: number;
  /** How long, in milliseconds, an MCP session can go without a request open before the server closes it. */
  sessionIdleTimeout?: number;
  /**
   * How long, in milliseconds, an AI Player can go without a tool call using its Player key before it's Away, and
   * Leaves a Game in the Lobby.
   */
  aiPlayerIdleTimeout?: number;
  /**
   * Whether an AI Player waits for each Roll and Move to play out on every screen before it Rolls or Moves, as it
   * does unless this is false (ADR-0008). Tests turn it off to run quickly.
   */
  paceAiPlayers?: boolean;
}

export const createGameServer = (config: Config, options: GameServerOptions = {}): GameServer => {
  const app = express();
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  const io: GameIo = new Server(httpServer, {
    cors: { origin: config.webOrigins, credentials: true },
    // A tab whose connection drops without closing, such as on a phone that loses signal, is noticed within
    // pingInterval + pingTimeout, and only then are the others shown that its Player is Away. Socket.IO's defaults
    // would take up to 45 seconds.
    pingInterval: 5000,
    pingTimeout: 5000,
  });
  identifyPlayers(io);
  io.on("connection", (socket) => {
    // Every command expects a reply. One sent without a callback for it would crash the server when answered,
    // so it's dropped here instead.
    socket.use((packet, next) => {
      if (typeof packet.at(-1) === "function") next();
    });
  });
  const notifier = createGameNotifier();
  const gameService = createGameService(createMemoryGameStore(), notifier, options.randomInt, options.now);
  // Long enough for a Game that stalls until the Player tells the AI to carry on (ADR-0008).
  const aiPlayers = createAiPlayers(gameService, notifier, options.aiPlayerIdleTimeout ?? 15 * 60_000);
  const { isAway } = handleGameSockets(io, gameService, notifier, aiPlayers.isConnected);
  handleDebugGames(app, gameService, isAway);
  handleGameMcp(app, gameService, notifier, aiPlayers, isAway, config.webAppUrl, {
    waitForTurn: options.waitForTurnTimeout ?? 30_000,
    sessionIdle: options.sessionIdleTimeout ?? 15 * 60_000,
    paceAiPlayers: options.paceAiPlayers ?? true,
  });

  return { httpServer, io };
};
