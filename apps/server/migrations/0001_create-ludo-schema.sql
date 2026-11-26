-- Every Ludo table lives in Ludo's own schema, as accounts' tables live in `accounts`, and none in `public`. A Postgres
-- schema is close to what MySQL calls a database. node-pg-migrate has already created it, to hold its `pgmigrations`
-- table, but this file keeps it in the migrations, so that applying them by hand gives the same result.
CREATE SCHEMA IF NOT EXISTS ludo;
