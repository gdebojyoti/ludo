// Test helper: starts the real server in-process, and connects Players to it the way the web app does.
import type { IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";

import { NodeWebSocket } from "engine.io-client";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@ludo/shared";

import { playerIdCookieName } from "./identity.js";
import { createGameServer } from "./server.js";

export const webOrigin = "http://localhost:8081";

/** One open connection to the server: a browser tab with the web app loaded. */
export interface Connection {
  ping: () => Promise<"pong">;
  /** Sends a command with any arguments, unchecked by the event types, as no well-behaved client would. */
  sendUnchecked: (event: keyof ClientToServerEvents, ...args: unknown[]) => void;
  /** Closes the connection, like closing the tab. */
  close: () => Promise<void>;
}

/** A browser with its own cookie jar, so each Player is a distinct identity. */
export interface Player {
  /** Opens a connection, like loading the page, and resolves once the server has accepted it. */
  connect: () => Promise<Connection>;
  /** The player ID the server issued in the cookie, once the Player has connected. */
  playerId: () => string | undefined;
}

export interface TestServer {
  url: string;
  createPlayer: () => Player;
  /** The player ID the server gave each open connection, in no particular order. */
  connectedPlayerIds: () => Promise<string[]>;
  close: () => Promise<void>;
}

export const startServer = async (): Promise<TestServer> => {
  const server = createGameServer({ port: 0, webOrigins: [webOrigin] });
  await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
  const { port } = server.httpServer.address() as AddressInfo;
  const url = `http://localhost:${port}`;
  const sockets: Socket[] = [];

  const createPlayer = (): Player => {
    const cookieJar = new Map<string, string>();
    const transport = withCookieJar(cookieJar);

    const connect = async (): Promise<Connection> => {
      const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(url, {
        transports: [transport],
        forceNew: true,
        reconnection: false,
        autoConnect: false,
        extraHeaders: { origin: webOrigin },
      });
      sockets.push(socket);

      await new Promise<void>((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
        socket.connect();
      });

      return {
        ping: () => socket.emitWithAck("ping"),
        sendUnchecked: (event, ...args) => {
          (socket.emit as (event: string, ...args: unknown[]) => void)(event, ...args);
        },
        close: async () => {
          // A round trip first, so everything sent before closing has reached the server.
          await socket.emitWithAck("ping");
          socket.disconnect();
          // Let the server see the disconnect before the test carries on.
          await new Promise((resolve) => setTimeout(resolve, 20));
        },
      };
    };

    return { connect, playerId: () => cookieJar.get(playerIdCookieName) };
  };

  const connectedPlayerIds = async () => (await server.io.fetchSockets()).map((socket) => socket.data.playerId);

  const close = async () => {
    sockets.forEach((socket) => socket.disconnect());
    await server.io.close();
  };

  return { url, createPlayer, connectedPlayerIds, close };
};

/** Sends a Socket.IO handshake over plain HTTP, the first request a browser makes, so tests can read its headers. */
export const handshake = (url: string, headers: Record<string, string> = {}): Promise<Response> => {
  return fetch(`${url}/socket.io/?EIO=4&transport=polling`, { headers: { origin: webOrigin, ...headers } });
};

/** A WebSocket transport that sends the jar's cookies and keeps any the server sets, as a browser does. */
const withCookieJar = (cookieJar: Map<string, string>) => {
  return class extends NodeWebSocket {
    override createSocket(uri: string, protocols: string | string[] | undefined, opts: Record<string, any>) {
      const cookie = [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ");
      const headers = cookie ? { ...opts.headers, cookie } : opts.headers;
      const ws = super.createSocket(uri, protocols, { ...opts, headers });
      ws.on("upgrade", (response: IncomingMessage) => {
        for (const setCookie of response.headers["set-cookie"] ?? []) {
          const [pair = ""] = setCookie.split(";");
          const separator = pair.indexOf("=");
          cookieJar.set(pair.slice(0, separator), pair.slice(separator + 1));
        }
      });
      return ws;
    }
  };
};
