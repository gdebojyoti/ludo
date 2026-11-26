// Identity (ADR-0003): a Player is a random UUID kept in a cookie, issued during the Socket.IO handshake. A browser with
// a Session from `accounts` is also known by its Account (ADR-0014), checked as each connection opens.
import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { TLSSocket } from "node:tls";

import { playerNameMaxLength } from "@ludo/shared";
import type { Server } from "socket.io";

import { sessionTokenIn, type CheckSession, type SessionAccount } from "./sessions.js";

export const playerIdCookieName = "ludo-player-id";
const oneYearInSeconds = 365 * 24 * 60 * 60;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PlayerData {
  playerId: string;
  /** The Account the browser was signed in to when the connection opened, or null for a Guest. */
  account: PlayerAccount | null;
}

/** The Account a browser is signed in to, as the server knows it. */
export interface PlayerAccount {
  accountId: string;
  /** Its Player name, its Google name cut to `playerNameMaxLength`; null if that has nothing in it to show. */
  playerName: string | null;
}

/** How the Accounts of browsers that connect are checked and recorded. */
export interface AccountCheck {
  /** The name of the cookie that carries the Session. */
  sessionCookieName: string;
  /** Checks a Session, by its token. Without one, every browser is a Guest. */
  checkSession?: CheckSession;
  /** Records that Ludo has seen the Account. */
  markSeen: (accountId: string) => Promise<unknown>;
}

/**
 * Issues a player ID to every browser that connects without one, and gives every socket its Player's ID as
 * `socket.data.playerId`, and the Account its browser is signed in to as `socket.data.account`, recording that Ludo has
 * seen it.
 */
export const identifyPlayers = (io: Server<any, any, any, PlayerData>, accountCheck: AccountCheck) => {
  // The browser only sends a new cookie back from its next request, so the connection opened by this
  // handshake gets its ID from here.
  const issuedIds = new WeakMap<IncomingMessage, string>();

  io.engine.on("initial_headers", (headers: Record<string, string>, request: IncomingMessage) => {
    if (readCookie(request)) return;
    const playerId = randomUUID();
    issuedIds.set(request, playerId);
    headers["set-cookie"] = serializeCookie(playerId, isHttps(request));
  });

  io.use(async (socket, next) => {
    const playerId = issuedIds.get(socket.request) ?? readCookie(socket.request);
    if (!playerId) return next(new Error("No player ID"));
    socket.data.playerId = playerId;
    socket.data.account = await findAccount(socket.request, accountCheck);
    next();
  });
};

/**
 * The Account of the request's Session, recorded as seen, or null without one: no session cookie, or a Session that
 * `accounts` never made, has expired or was ended by a Sign out. A Session that can't be checked, such as while the
 * database is down, counts as none, so play goes on as a Guest. Neither the cookie nor its token is ever logged.
 */
const findAccount = async (
  request: IncomingMessage,
  { sessionCookieName, checkSession, markSeen }: AccountCheck,
): Promise<PlayerAccount | null> => {
  const token = sessionTokenIn(request.headers.cookie, sessionCookieName);
  if (!token || !checkSession) return null;
  try {
    const sessionAccount = await checkSession(token);
    if (!sessionAccount) return null;
    await markSeen(sessionAccount.accountId);
    return toPlayerAccount(sessionAccount);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("A Session couldn't be checked, so the Player plays as a Guest:", reason);
    return null;
  }
};

/** The Account, with its Google name cut to the longest Player name, and null if that leaves nothing to show. */
const toPlayerAccount = ({ accountId, name }: SessionAccount): PlayerAccount => {
  const playerName = [...name.trim()].slice(0, playerNameMaxLength).join("").trim();
  return { accountId, playerName: playerName || null };
};

const readCookie = (request: IncomingMessage): string | undefined => {
  const value = request.headers.cookie
    ?.split(";")
    .map((pair) => pair.trim())
    .find((pair) => pair.startsWith(`${playerIdCookieName}=`))
    ?.slice(playerIdCookieName.length + 1);
  return value && uuid.test(value) ? value : undefined;
};

// Host-only (no Domain), so the other games on the parent domain never see it.
const serializeCookie = (playerId: string, secure: boolean): string => {
  const attributes = [
    `${playerIdCookieName}=${playerId}`,
    "Path=/",
    `Max-Age=${oneYearInSeconds}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
};

// In production the server sits behind Render's proxy, which says in X-Forwarded-Proto that the browser used HTTPS.
const isHttps = (request: IncomingMessage): boolean => {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)?.split(",")[0]?.trim();
  return proto === "https" || (request.socket as TLSSocket).encrypted === true;
};
