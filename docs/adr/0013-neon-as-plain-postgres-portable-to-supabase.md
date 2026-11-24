# Neon as plain Postgres, portable to Supabase

Accounts and everything that belongs to them are kept in one Postgres database, which every TableHop game shares (ADR-0014). It's Neon's free tier, in Singapore, the region nearest India that both Neon and Railway offer. Neon stops after 5 minutes without queries and starts again by itself on the next one, where Supabase's free tier pauses a project after a week of low activity until someone restores it by hand, which would take signing in and the Store down after a quiet week.

It's used as plain Postgres, so that moving to Supabase, or anywhere else, stays a dump, a restore and a new connection string: a standard Postgres driver through a connection string, migrations as plain SQL files, and none of Neon's own features, such as its managed Better Auth, its Data API, its serverless driver or its branches. The storage contract tests run against a local Postgres, never production.

## Considered Options

- **Supabase's free tier, as first planned:** pauses after 7 days of low activity. A daily keep-alive query usually prevents it, but Supabase doesn't promise that. Supabase Pro doesn't pause, but costs $25 a month whether anyone plays or not.
- **Render's free Postgres:** deleted 30 days after it's created.
- **A second hosted database for the tests:** no setup, but slower and needs the network, and there's one developer.
- **PGlite, Postgres running inside the test process:** no setup, but it has one connection, so it can't test two purchases at the same moment.
- **Neon's paid Launch plan, for its 7-day restore:** a few dollars a month, not wanted yet.

## Consequences

- The free tier keeps no backups beyond a 6-hour restore window, and the ledger will hold paid Coins. A nightly `pg_dump` of our own, to private storage, is set up before Razorpay goes live.
- Each server's connection pool closes idle connections, so Neon can stop and stays inside the free tier's 100 compute-hours a month.
- The first query after a quiet spell waits a moment while Neon starts.
