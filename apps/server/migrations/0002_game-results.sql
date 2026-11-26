-- The result of each finished Game: one row for the Game, and one for each Player who was given a Seat in it, Leavers
-- included. Live Games stay in memory (ADR-0004), so a Game lost to a server restart has no row.
CREATE TABLE ludo.game_results (
  -- The Game's ID, from the game server. Only one result is kept per Game.
  game_id uuid PRIMARY KEY,
  mode text NOT NULL CHECK (mode IN ('classic', 'oneKillWin')),
  -- How many Turns were played, counting the one the Game ended in.
  turns_played integer NOT NULL CHECK (turns_played >= 1),
  ended_at timestamptz NOT NULL
);

CREATE TABLE ludo.game_result_players (
  game_id uuid NOT NULL REFERENCES ludo.game_results (game_id),
  seat smallint NOT NULL CHECK (seat BETWEEN 0 AND 3),
  -- Through the web app, or over MCP as an AI Player (ADR-0008).
  joined_via text NOT NULL CHECK (joined_via IN ('webApp', 'mcp')),
  -- Counting from 1: Players who tie share one.
  standing smallint NOT NULL CHECK (standing BETWEEN 1 AND 4),
  captures integer NOT NULL CHECK (captures >= 0),
  -- At the end, or when they Left.
  tokens_home smallint NOT NULL CHECK (tokens_home BETWEEN 0 AND 4),
  -- Whether they Left during play. `left` alone is a reserved word in SQL, as in LEFT JOIN.
  has_left boolean NOT NULL,
  PRIMARY KEY (game_id, seat)
);
