-- Each Player's Account on a finished Game's result: the Account the server knew them by when the Game ended. Empty for
-- Guests and AI Players, and for every result kept before this migration, which count for nobody. A Guest's Games
-- aren't linked to an Account later, so nothing here identifies a Guest.
--
-- There's no foreign key to `accounts."user"`, which Ludo's role can't reference (thg.accounts' docs/contract.md).
ALTER TABLE ludo.game_result_players ADD COLUMN account_id uuid;

-- Finds an Account's rows, for its Profile's stats and its Rivals. Partial, so Guests' and AI Players' rows, which are
-- most of them, are left out of it.
CREATE INDEX game_result_players_account_id ON ludo.game_result_players (account_id) WHERE account_id IS NOT NULL;
