# Public debug list of games

So the state of the server can be checked during development by opening a URL in a browser, the game server serves `GET /debug/games`: the newest 100 games as JSON, newest first, with no authentication. A token would mean a dashboard or a header, which a browser can't send by opening a URL, and games are held in memory (ADR-0004), so there's no database to look in instead. Each game shows when it was created and last saved, its players and its current board, but not its past rolls and moves, which the server doesn't keep. It stays until it's deliberately removed, for example when games move to Supabase. It follows WZQ's list of the same name.

Because anyone can open it, the list never shows a value that lets someone act as a player or easily join someone else's game:

- **No player IDs.** A player ID is the only proof of who a player is (ADR-0003), so each player is shown by a label of its first 6 characters. That reveals 24 of a UUID's 122 random bits, which leaves the rest unguessable, and keeps the same label for a player in every game.
- **Masked game codes.** Only a game in the lobby shows its game code, with just the first 2 digits visible. A game code stops working once the game leaves the lobby, so other games show none.
- **Player names shown.** Unlike WZQ, Ludo players give a player name, and the list shows it, so it's easy to tell who's who while troubleshooting. A name lets no one act as a player, but anyone with the URL can read the names of everyone playing. This is accepted while the game is played among friends.
- **Game IDs in full.** A game ID is never sent to a player and opens nothing, so it's safe to show.

A later change to the list must keep player IDs out and game codes masked. The tests check that no player's ID appears anywhere in the response.
