// Test helper: starts the real server in-process, and connects Players to it the way the web app does.
import type { IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";

import { NodeWebSocket } from "engine.io-client";
import { io, type Socket } from "socket.io-client";
import type { Acknowledgement, ClientToServerEvents, GameSnapshot, ServerToClientEvents } from "@ludo/shared";

import { playerIdCookieName } from "./identity.js";
import { createGameServer, type GameServerOptions } from "./server.js";

export const webOrigin = "http://localhost:8083";

/** What the server sent a connection, in the order it arrived. */
type Message = { event: "game"; game: GameSnapshot } | { event: "noActiveGame" };

/** One open connection to the server: a browser tab with the web app loaded. */
export interface Connection {
  /** Waits for the next message from the server that this connection hasn't read yet. */
  nextMessage: () => Promise<Message>;
  ping: () => Promise<"pong">;
  createGame: (playerName: string) => Promise<Acknowledgement<{ game: GameSnapshot }>>;
  joinGame: (gameCode: string, playerName: string) => Promise<Acknowledgement<{ game: GameSnapshot }>>;
  leaveGame: () => Promise<Acknowledgement>;
  startGame: () => Promise<Acknowledgement>;
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
  /**
   * A tab of a Player with no active Game, with everything sent so far already read: a new Player, or another tab
   * of `player`.
   */
  playerWithNoGame: (player?: Player) => Promise<Connection>;
  /**
   * A Host waiting in the Lobby, with everything sent so far already read: a new Player, or `player`, shown as
   * `playerName`.
   */
  hostInLobby: (options?: { playerName?: string; player?: Player }) => Promise<{ host: Connection; gameCode: string }>;
  /**
   * A Player who has joined the Game with this Game code, with everything sent to them so far already read: a new
   * Player, or `player`, shown as `playerName`. The other Players in the Lobby are each sent the change.
   */
  playerInLobby: (gameCode: string, options?: { playerName?: string; player?: Player }) => Promise<Connection>;
  /** The player ID the server gave each open connection, in no particular order. */
  connectedPlayerIds: () => Promise<string[]>;
  close: () => Promise<void>;
}

/** Starts the server. `options.randomInt` scripts its random choices, such as Game codes. */
export const startServer = async (options?: GameServerOptions): Promise<TestServer> => {
  const server = createGameServer({ port: 0, webOrigins: [webOrigin] }, options);
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

      const inbox = createInbox<Message>();
      socket.on("game", (game) => inbox.put({ event: "game", game }));
      socket.on("noActiveGame", () => inbox.put({ event: "noActiveGame" }));

      await new Promise<void>((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
        socket.connect();
      });

      return {
        nextMessage: inbox.take,
        ping: () => socket.emitWithAck("ping"),
        createGame: (playerName) => socket.emitWithAck("createGame", playerName),
        joinGame: (gameCode, playerName) => socket.emitWithAck("joinGame", gameCode, playerName),
        leaveGame: () => socket.emitWithAck("leaveGame"),
        startGame: () => socket.emitWithAck("startGame"),
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

  const playerWithNoGame = async (player = createPlayer()) => {
    const tab = await player.connect();
    await tab.nextMessage();
    return tab;
  };

  const hostInLobby = async ({ playerName = "Luna Lovegood", player = createPlayer() } = {}) => {
    const host = await playerWithNoGame(player);
    const reply = await host.createGame(playerName);
    if (!reply.ok || !reply.game.gameCode) throw new Error("The Game wasn't created");
    await host.nextMessage();
    return { host, gameCode: reply.game.gameCode };
  };

  const playerInLobby = async (gameCode: string, { playerName = "Ginny Weasley", player = createPlayer() } = {}) => {
    const tab = await playerWithNoGame(player);
    const reply = await tab.joinGame(gameCode, playerName);
    if (!reply.ok) throw new Error(`The Game wasn't joined: ${reply.reason}`);
    await tab.nextMessage();
    return tab;
  };

  const connectedPlayerIds = async () => (await server.io.fetchSockets()).map((socket) => socket.data.playerId);

  const close = async () => {
    sockets.forEach((socket) => socket.disconnect());
    await server.io.close();
  };

  return { url, createPlayer, playerWithNoGame, hostInLobby, playerInLobby, connectedPlayerIds, close };
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

/** A queue whose `take` waits until there's something to take. */
const createInbox = <Item>() => {
  const items: Item[] = [];
  const waiting: Array<(item: Item) => void> = [];

  const put = (item: Item) => {
    const waiter = waiting.shift();
    if (waiter) waiter(item);
    else items.push(item);
  };

  const take = (): Promise<Item> => {
    if (items.length > 0) return Promise.resolve(items.shift() as Item);
    return new Promise((resolve) => waiting.push(resolve));
  };

  return { put, take };
};
