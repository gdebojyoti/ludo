import { createServer, type Server as HttpServer } from "node:http";

import express from "express";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@ludo/shared";

import type { Config } from "./config.js";
import { identifyPlayers, type PlayerData } from "./identity.js";

export type GameIo = Server<ClientToServerEvents, ServerToClientEvents, object, PlayerData>;

export interface GameServer {
  httpServer: HttpServer;
  io: GameIo;
}

export const createGameServer = (config: Config): GameServer => {
  const app = express();
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);
  const io: GameIo = new Server(httpServer, {
    cors: { origin: config.webOrigins, credentials: true },
  });
  identifyPlayers(io);
  io.on("connection", (socket) => {
    // Every command expects a reply. One sent without a callback for it would crash the server when answered,
    // so it's dropped here instead.
    socket.use((packet, next) => {
      if (typeof packet.at(-1) === "function") next();
    });
    socket.on("ping", (ack) => ack("pong"));
  });

  return { httpServer, io };
};
