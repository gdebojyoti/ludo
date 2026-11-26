# A local database

Ludo's server keeps each finished Game's result, and the Accounts it has seen with their settings, in Postgres, in its own `ludo` schema (ADR-0013), and checks each Player's Session there, in `accounts`' tables (ADR-0014). Live Games stay in memory (ADR-0004). Locally, the server and its tests use the same Postgres on your machine that `accounts` uses, never production.

You need two things on it:

- a **`ludo` role** on the `accounts` database, which `npm run dev` connects as, set up as Ludo's role is in production;
- a **`ludo_test` database**, which `npm test` empties and fills again on every run.

A Postgres role is close to a MySQL user. A Postgres schema is close to what MySQL calls a database: a named group of tables. One Postgres database can hold several schemas, which is how `accounts` and every TableHop game share one: `accounts` keeps its tables in the `accounts` schema, and Ludo in `ludo`.

## Before you start

Set up `accounts`' local database first, as thg.accounts' `docs/local-database.md` explains: PostgreSQL 18 on port 5432, an `accounts` database, and `accounts`' migrations run against it (`npm run migrate` in thg.accounts). Those migrations create the role `accounts_reader`, which Ludo's role needs.

## Create Ludo's role and test database

Open the SQL Shell (psql) that came with Postgres, or pgAdmin, sign in as `postgres`, connect to the `accounts` database (in psql, `\c accounts`), and run, with a password of your own in place of `PASSWORD`:

```sql
CREATE ROLE ludo LOGIN PASSWORD 'PASSWORD';
GRANT accounts_reader TO ludo;
GRANT CREATE ON DATABASE accounts TO ludo;
CREATE DATABASE ludo_test;
```

Line by line:

1. Creates the `ludo` role, which can log in (`LOGIN`), much as `CREATE USER` in MySQL.
2. Gives it `accounts_reader`, a role that holds no login of its own, only the right to read the few columns of `accounts`' tables that a game may read (thg.accounts' `docs/contract.md`). Holding it is how Ludo checks a Player's Session, and it can read nothing else of `accounts`.
3. Lets it create a schema in the `accounts` database. The first time the server starts, it creates the `ludo` schema, which it then owns, so it can create and change its own tables there and nowhere else.
4. Creates the test database, which tests connect to as `postgres`. It's a separate database, not just a schema, so the tests can empty it without touching anything `npm run dev` uses.

This mirrors production, where Ludo's role on Neon was set up the same way (#61).

## Point your settings at them

In `apps/server`, copy `.env.example` to `.env`, if you haven't, and set the two connection strings, with the `ludo` role's password in the first and the `postgres` password in the second:

```sh
DATABASE_URL=postgres://ludo:PASSWORD@localhost:5432/accounts
TEST_DATABASE_URL=postgres://postgres:PASSWORD@localhost:5432/ludo_test
```

A connection string holds everything `mysqli_connect()` takes, in one line: `postgres://user:password@host:port/database`. A password with characters such as `@`, `:` or `/` in it needs them percent-encoded, such as `%40` for `@`. `.env` is never committed.

Tests refuse a `TEST_DATABASE_URL` that isn't on `localhost`, so they can't empty production by mistake.

## Create the tables

```sh
npm run migrate -w @ludo/server
```

This runs every migration in `apps/server/migrations/` that hasn't run yet against `DATABASE_URL`, and does nothing when they all have. The server does the same each time it starts, before it serves any request, so `npm run dev` and a deploy migrate by themselves too. `npm test` migrates `ludo_test` by itself.

To check, connect as `ludo` (`psql -U ludo -d accounts`) and run `\dt ludo.*`: it lists `account_settings`, `game_results`, `game_result_players`, `pgmigrations` and `seen_accounts`.

## Run the tests

```sh
npm test
```

Each run empties `ludo_test` and makes it again: the `ludo` schema with every migration, and beside it a stand-in for the two tables of `accounts` that a game reads, so the session check is tested without `accounts`' own migrations.

Without `TEST_DATABASE_URL`, the tests that need Postgres fail, each saying so, and the rest still run.

## Migrations

A migration is one numbered `.sql` file in `apps/server/migrations/` that changes the database's tables, such as `0002_game-results.sql`. It's the by-hand practice of keeping numbered `.sql` files to run in phpMyAdmin, with a table that remembers which ones have run. node-pg-migrate runs them, as it does `accounts`' (thg.accounts' ADR-0004), and records each in `ludo.pgmigrations`, so every database ends up the same.

- Migrations only go forward. A mistake in one that has run anywhere is fixed by the next file, never by editing it.
- Every Ludo table goes in the `ludo` schema, and none in `public`.
- A Ludo table that refers to an Account keeps its Account ID with no foreign key to `accounts."user"`, which Ludo's role can't reference.

## Without a database

`DATABASE_URL` isn't needed for `npm run dev`. With its line deleted from `.env`, or with no `.env` at all, the server keeps finished Games' results and Accounts' settings in memory, until it stops, every Player is a Guest, and it says so as it starts. On Render it's required, and the server won't start without it.
