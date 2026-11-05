import { createServer, type Server as HttpServer } from "node:http";

import express from "express";
import { Server } from "socket.io";

import type { Config } from "./config.js";
import { createGameNotifier } from "./game-notifier.js";
import { createGameService, type RandomInt } from "./game-service.js";
import { handleGameSockets, type GameIo } from "./game-sockets.js";
import { createMemoryGameStore } from "./game-store.js";
import { identifyPlayers } from "./identity.js";

export interface GameServer {
  httpServer: HttpServer;
  io: GameIo;
}

export interface GameServerOptions {
  /** Makes every random choice, such as Game codes. Tests replace it to make them predictable. */
  randomInt?: RandomInt;
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
  const gameService = createGameService(createMemoryGameStore(), notifier, options.randomInt);
  handleGameSockets(io, gameService, notifier);

  return { httpServer, io };
};
