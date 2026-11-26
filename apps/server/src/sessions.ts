// Checking a Player's Session, made by `accounts` when they Sign in with Google on any TableHop game (ADR-0014), exactly
// as thg.accounts' docs/contract.md says: by reading it from the database every TableHop game shares, rather than by
// asking `accounts`, so signed-in Players keep playing while `accounts` is asleep or down.
//
// The cookie and its token are enough to use the Session, so neither is ever logged.
import type pg from "pg";

/** The Account a Session is for: all a game can read of it. */
export interface SessionAccount {
  /** The Account ID, a UUID. */
  accountId: string;
  /** The Account's Google name. */
  name: string;
}

/**
 * The Account of the Session with this token, if it's one `accounts` made, it hasn't expired, and it hasn't been ended by
 * a Sign out; otherwise undefined. Checking a Session never extends it.
 */
export type CheckSession = (token: string) => Promise<SessionAccount | undefined>;

/** The session cookie's name in production, set by `accounts` on `tablehop.games` for every TableHop game. */
export const productionSessionCookieName = "__Secure-tablehop.session_token";

/** The session cookie's name locally, set by `accounts` on `localhost`, so a server on any port receives it. */
export const localSessionCookieName = "tablehop.session_token";

/**
 * The Session's token in a request's `Cookie` header, if it has the session cookie: the cookie's value, URL-decoded, up
 * to its last `.`. What comes after it is a signature, which a game doesn't check.
 */
export const sessionTokenIn = (cookieHeader: string | undefined, cookieName: string): string | undefined => {
  const value = cookieHeader
    ?.split(";")
    .map((pair) => pair.trim())
    .find((pair) => pair.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (!value) return undefined;
  try {
    const token = decodeURIComponent(value).replace(/\.[^.]*$/, "");
    return token || undefined;
  } catch {
    // Not URL-encoded as `accounts` encodes it, so it isn't a cookie `accounts` set.
    return undefined;
  }
};

interface SessionRow {
  id: string;
  name: string;
}

/** The contract's check, connected as Ludo's own role, which can read `accounts`' contract columns and nothing else. */
export const createPostgresSessionCheck = (pool: pg.Pool): CheckSession => {
  return async (token) => {
    // Better Auth's names are camelCase, and `user` is a reserved word, so they're double-quoted, as MySQL backticks.
    const { rows: [row] } = await pool.query<SessionRow>(
      `SELECT "user".id, "user".name
       FROM accounts.session
       JOIN accounts."user" ON "user".id = session."userId"
       WHERE session.token = $1 AND session."expiresAt" > now()`,
      [token],
    );
    return row && { accountId: row.id, name: row.name };
  };
};
