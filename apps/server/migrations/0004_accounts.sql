-- What Ludo keeps of the Accounts it has seen. The Accounts themselves are `accounts`' own (ADR-0014), so each table
-- here is keyed by Account ID, with no foreign key to `accounts."user"`, which Ludo's role can't reference.

-- Each Account Ludo has seen, from the first time it saw it, wherever the Account was created. It's how Ludo pays the
-- Sign-up bonus once.
CREATE TABLE ludo.seen_accounts (
  account_id uuid PRIMARY KEY,
  first_seen_at timestamptz NOT NULL DEFAULT now()
);

-- Each Account's settings, as a JSON object of those it has changed, the latest change to each winning. One it never
-- changed is left out, so a browser it signs in on keeps its own.
CREATE TABLE ludo.account_settings (
  account_id uuid PRIMARY KEY,
  settings jsonb NOT NULL CHECK (jsonb_typeof(settings) = 'object')
);
