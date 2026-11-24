# In-memory game state until Postgres

Until v1 ships, games are held in the server's memory, behind a storage interface so a Postgres-backed version can replace it without touching game logic. This means every server restart, including Render's free tier waking from sleep, wipes all games, and a player who tries to rejoin finds their game gone; that's accepted for v1. After v1, storage moves to Postgres, used as plain Postgres through a connection string so it stays portable (ADR-0013).
