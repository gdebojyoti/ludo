# Accounts shared across TableHop, from an accounts service

A Player has one Account for every TableHop game, signed in to once with Google, while Coins, XP and everything they earn or buy stay each game's own (ADR-0012). Accounts are served by `accounts`, a backend-only service in its own repo at `accounts.tablehop.games`, running Better Auth, a self-hosted auth library, with its tables in the shared Postgres (ADR-0013). It sets the session cookie on `tablehop.games` itself, so signing in on one game signs the Player in on all of them.

Each game builds its own sign-in UI, which hands over to `accounts`. Each game's server checks a session by reading it from the shared database rather than by asking `accounts`, so Players who are signed in keep playing while `accounts` is asleep or down. `accounts` owns the Account and session tables and their migrations, and each game owns its own tables, which refer to an Account by its ID.

## Considered Options

- **Accounts built in Ludo first, and lifted out later:** the first plan. It would mean moving the code and the cookie once a second game needed Accounts, which starting with the service avoids.
- **A hosted vendor, such as Clerk:** less code, and free up to 50,000 retained users, but Accounts would live outside our database, away from the Coin ledger, and it needs its React SDK in a Module Federation remote and DNS for its own subdomain.
- **Neon's managed Better Auth:** the same library, run by Neon, but it doesn't yet support a backend apart from its frontend, it runs on Neon's own domain, and moving to Supabase would mean moving every Account to Supabase Auth.
- **Game servers asking `accounts` on every request:** simpler, but every Game would wait on a second server being awake.

## Consequences

- The session cookie is the only one set on the parent domain, an exception to ADR-0005's host-only rule. It's named for the site rather than for a game, and is `HttpOnly` and `Secure`. Every `tablehop.games` subdomain receives it, so none may ever point at a service we don't control.
- `accounts` accepts requests, with credentials, only from the site's own origins.
- Safari probably caps a cookie at 7 days when the server setting it is on a network far from the site's, as `accounts` on Railway is from the web app on Vercel. A Safari Player who doesn't visit for a week signs in again. That's accepted.
- `accounts` runs on Railway's Hobby plan, about $5 a month, so hosting is no longer all free (ADR-0005).
- Ludo pays its Sign-up bonus the first time it sees an Account (ADR-0012), so it records which Accounts it has seen.
- Creating an Account from the Result screen claims the Game just finished, but signing in to an existing one doesn't (#73). The Account is created in `accounts`, so Ludo has to tell a new Account from an existing one.
- Ludo still links the browser's player ID (ADR-0003) to the Account. How one Account on several devices behaves is #66.
- Ludo's tests fake the session check, and `accounts`' own tests fake Google.
