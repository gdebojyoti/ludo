// Test helper: starts the real server in-process, and connects Players to it the way the web app does, or the way
// an AI client does over MCP.
import type { IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { NodeWebSocket } from "engine.io-client";
import { io, type Socket } from "socket.io-client";
import type {
  Acknowledgement,
  ClientToServerEvents,
  GameMode,
  GameSnapshot,
  ServerToClientEvents,
} from "@ludo/shared";

import type { DebugGames } from "./debug-games.js";
import { playerIdCookieName } from "./identity.js";
import { createGameServer, type GameServerOptions } from "./server.js";

export const webOrigin = "http://localhost:8083";

export const webAppUrl = `${webOrigin}/ludo`;

/** What the server sent a connection, in the order it arrived. */
type Message = { event: "game"; game: GameSnapshot } | { event: "noActiveGame" };

/** One open connection to the server: a browser tab with the web app loaded. */
export interface Connection {
  /** Waits for the next message from the server that this connection hasn't read yet. */
  nextMessage: () => Promise<Message>;
  ping: () => Promise<"pong">;
  /** Creates a Game following this Game mode, Classic unless it's given. */
  createGame: (playerName: string, mode?: GameMode) => Promise<Acknowledgement<{ game: GameSnapshot }>>;
  joinGame: (gameCode: string, playerName: string) => Promise<Acknowledgement<{ game: GameSnapshot }>>;
  leaveGame: () => Promise<Acknowledgement>;
  startGame: () => Promise<Acknowledgement>;
  roll: () => Promise<Acknowledgement>;
  move: (token: number) => Promise<Acknowledgement>;
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

/** What a tool call returned: its text, and whether it was refused. */
export interface ToolResult {
  text: string;
  isError: boolean;
}

/**
 * An AI client's conversation, connected to `/mcp` through the MCP SDK. It keeps the Player key that `create_game` or
 * `join_game` gives it, and passes it to every later tool call, as the tools tell it to.
 */
export interface AiPlayer {
  /** The description of each tool the server lists, by name. */
  toolDescriptions: () => Promise<Record<string, string>>;
  createGame: (args?: { mode?: string; playerName?: string }) => Promise<ToolResult>;
  joinGame: (gameCode: string, args?: { playerName?: string }) => Promise<ToolResult>;
  startGame: () => Promise<ToolResult>;
  waitForTurn: () => Promise<ToolResult>;
  /** Moves the Token with this number, from 1, as the Board view numbers them. */
  moveToken: (token: number) => Promise<ToolResult>;
  leaveGame: () => Promise<ToolResult>;
  /**
   * Calls a tool with any arguments, unchecked by the tool's schema and with no Player key added, as no well-behaved
   * client would.
   */
  callUnchecked: (tool: string, args: Record<string, unknown>) => Promise<ToolResult>;
  /**
   * A new conversation whose calls arrive on this one's MCP session, as the claude.ai connector sends a second
   * conversation's calls on the first one's session.
   */
  sharingSession: () => AiPlayer;
  /** Starts a new MCP session, and carries on the conversation on it with the same Player key. */
  moveToNewSession: () => Promise<void>;
  /** Ends the conversation's MCP session, as a client does when it's done with it. */
  close: () => Promise<void>;
}

/** One MCP session, which any number of conversations can send their calls on. */
interface McpSession {
  client: Client;
  call: (tool: string, args: Record<string, unknown>) => Promise<ToolResult>;
  close: () => Promise<void>;
}

export interface TestServer {
  url: string;
  createPlayer: () => Player;
  /** Starts an MCP session and a conversation on it, as an AI client does when it's given the server's `/mcp` URL. */
  connectAi: () => Promise<AiPlayer>;
  /**
   * A tab of a Player with no active Game, with everything sent so far already read: a new Player, or another tab
   * of `player`.
   */
  playerWithNoGame: (player?: Player) => Promise<Connection>;
  /**
   * A Host waiting in the Lobby of a Game following `mode`, Classic unless it's given, with everything sent so far
   * already read: a new Player, or `player`, shown as `playerName`.
   */
  hostInLobby: (
    options?: { playerName?: string; player?: Player; mode?: GameMode },
  ) => Promise<{ host: Connection; gameCode: string }>;
  /**
   * A Player who has joined the Game with this Game code, with everything sent to them so far already read: a new
   * Player, or `player`, shown as `playerName`. The other Players in the Lobby are each sent the change.
   */
  playerInLobby: (gameCode: string, options?: { playerName?: string; player?: Player }) => Promise<Connection>;
  /** Opens `/debug/games` as a browser does, and returns the body as it was sent, and the list in it. */
  debugGames: () => Promise<{ body: string } & DebugGames>;
  /** The player ID the server gave each open connection, in no particular order. */
  connectedPlayerIds: () => Promise<string[]>;
  close: () => Promise<void>;
  /**
   * Closes the server and starts a new one, with its random choices scripted to be these numbers in turn, then 0, and
   * the same clock.
   */
  restartWithRandomNumbers: (...numbers: number[]) => Promise<TestServer>;
}

/**
 * Starts the server. `options.randomInt` scripts its random choices, such as Game codes, and `options.now` the times
 * its Games are created and saved.
 */
export const startServer = async (options?: GameServerOptions): Promise<TestServer> => {
  const server = createGameServer({ port: 0, webOrigins: [webOrigin], webAppUrl }, options);
  await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
  const { port } = server.httpServer.address() as AddressInfo;
  const url = `http://localhost:${port}`;
  const sockets: Socket[] = [];
  const aiClosers: Array<() => Promise<void>> = [];

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
        createGame: (playerName, mode = "classic") => socket.emitWithAck("createGame", playerName, mode),
        joinGame: (gameCode, playerName) => socket.emitWithAck("joinGame", gameCode, playerName),
        leaveGame: () => socket.emitWithAck("leaveGame"),
        startGame: () => socket.emitWithAck("startGame"),
        roll: () => socket.emitWithAck("roll"),
        move: (token) => socket.emitWithAck("move", token),
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

  const hostInLobby: TestServer["hostInLobby"] = async ({
    playerName = "Luna Lovegood",
    player = createPlayer(),
    mode,
  } = {}) => {
    const host = await playerWithNoGame(player);
    const reply = await host.createGame(playerName, mode);
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

  const startMcpSession = async (): Promise<McpSession> => {
    const client = new Client({ name: "ludo-test-ai", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`${url}/mcp`));
    await client.connect(transport);

    const call = async (tool: string, args: Record<string, unknown>): Promise<ToolResult> => {
      const result = await client.callTool({ name: tool, arguments: args });
      const content = result.content as Array<{ type: string; text?: string }>;
      return { text: content.map((part) => part.text ?? "").join("\n"), isError: result.isError === true };
    };

    let isOpen = true;
    const close = async () => {
      if (!isOpen) return;
      isOpen = false;
      await transport.terminateSession();
      await client.close();
    };
    aiClosers.push(close);

    return { client, call, close };
  };

  const conversationOn = (firstSession: McpSession): AiPlayer => {
    let session = firstSession;
    let playerKey: string | undefined;

    const call = (tool: string, args: Record<string, unknown> = {}) => {
      return session.call(tool, playerKey === undefined ? args : { ...args, playerKey });
    };

    /** Calls `create_game` or `join_game`, and keeps the Player key it gives. */
    const start = async (tool: string, args: Record<string, unknown> = {}) => {
      const reply = await call(tool, args);
      playerKey ??= playerKeyIn(reply) || undefined;
      return reply;
    };

    return {
      toolDescriptions: async () => {
        const { tools } = await session.client.listTools();
        return Object.fromEntries(tools.map((tool) => [tool.name, tool.description ?? ""]));
      },
      createGame: (args = {}) => start("create_game", args),
      joinGame: (gameCode, args = {}) => start("join_game", { gameCode, ...args }),
      startGame: () => call("start_game"),
      waitForTurn: () => call("wait_for_turn"),
      moveToken: (token) => call("move_token", { token }),
      leaveGame: () => call("leave_game"),
      callUnchecked: (tool, args) => session.call(tool, args),
      sharingSession: () => conversationOn(session),
      moveToNewSession: async () => {
        session = await startMcpSession();
      },
      close: () => session.close(),
    };
  };

  const connectAi = async () => conversationOn(await startMcpSession());

  const connectedPlayerIds = async () => (await server.io.fetchSockets()).map((socket) => socket.data.playerId);

  const debugGames = async () => {
    const response = await fetch(`${url}/debug/games`);
    if (!response.ok) throw new Error(`/debug/games answered ${response.status}`);
    const body = await response.text();
    return { body, ...(JSON.parse(body) as DebugGames) };
  };

  const close = async () => {
    await Promise.all(aiClosers.map((closeAi) => closeAi()));
    sockets.forEach((socket) => socket.disconnect());
    await server.io.close();
  };

  const restartWithRandomNumbers = async (...numbers: number[]) => {
    await close();
    return startServer({ ...options, randomInt: () => numbers.shift() ?? 0 });
  };

  return {
    url,
    createPlayer,
    connectAi,
    playerWithNoGame,
    hostInLobby,
    playerInLobby,
    connectedPlayerIds,
    debugGames,
    close,
    restartWithRandomNumbers,
  };
};

/** The Game code in what a tool returned. */
export const gameCodeIn = (reply: { text: string }) => /Game code (\d{6})/.exec(reply.text)?.[1] ?? "";

/** The Player key in what `create_game` or `join_game` returned. */
export const playerKeyIn = (reply: { text: string }) => /Player key is ([\w-]+)/.exec(reply.text)?.[1] ?? "";

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
