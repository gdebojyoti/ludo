# AI players over MCP, identified by a player key

So a player can play against, or alongside, the AI of their choice, the game server also serves an MCP endpoint at `/mcp` (the official MCP TypeScript SDK over Streamable HTTP), which any AI client that can add a remote MCP server by URL, such as Claude, connects to. It follows WZQ's endpoint (its ADR-0007 and ADR-0010), with what Ludo changes below. The endpoint runs in the same process as the Socket.IO layer, because games are held in memory (ADR-0004), and both call the same game service, so the rules are enforced in one place.

An AI player is identified by a player key that the AI holds in its conversation, not by its MCP session. `create_game` and `join_game` give a new AI player a key, a random UUID that is its player ID, in place of ADR-0003's cookie, and every later tool call passes it. The claude.ai connector doesn't give each conversation its own MCP session, so a player per session would mix up conversations on the same account. With the key, several conversations on one account can each play as their own player, even in the same game. The key is the only proof of who the player is, so it's never shown to anyone else (ADR-0007). Keys are kept in memory with the games, so after a restart a key is unknown and the AI is told to start a new game.

The tools are `create_game`, which takes the game mode (classic unless it's given), `join_game`, `start_game`, `wait_for_turn`, `move_token` and `leave_game`. Each takes an optional player name; without one, the AI is given a random name from the web app's list, which is now in `@ludo/shared`. AI clients only act while answering a message, so `wait_for_turn` blocks until the AI has something to do, and returns after 30 seconds to be called again. It returns when:

- it's the AI's turn. Rolling involves no choice, so `wait_for_turn` rolls for the AI, and returns the roll with what each legal move would do. A roll with no legal move passes the turn, and the wait carries on. That's two tool calls per roll, not three, which matters in a classic game of a hundred turns or more.
- someone joins or leaves the lobby, if the AI is its host, so it can call `start_game`, or ask the person it's playing for.
- the game starts, including by a fourth player joining, or ends.

The board is described as text, not drawn: where each seat's tokens are, by track cell number, and for each legal move where it lands, what it captures, whether it lands on a safe cell, and which opponents' tokens could capture it there on their next turn, with one roll or a 6 and the roll it earns. A move that leaves another of the AI's tokens alone on a cell, where the two protected each other, says so, and who could capture the one left behind. A text grid of the cross-shaped board would be harder for an AI to read than a list.

The server paces AI players, so every screen plays out each roll and move in full. The web app plays out each one, the die tumbling and a token sliding a cell at a time, and cuts it short if the next arrives first. An AI is waiting already, so without pacing it rolled the instant the turn came, and the move before it snapped to its end on every screen. So the board records when its latest roll or move will have played out, from timings the server and web app share in `@ludo/shared`, and `wait_for_turn` and `move_token` wait until then, plus a margin for network lag, before they roll or move for the AI. The AI isn't told and can't skip it, as any AI client can connect, and none sees the animations. The wait comes before the command joins the game service's queue, which every game shares, so it never holds up another game. Players in the web app aren't paced by the server, as their own board already makes them wait until it has played everything out. Pacing every player, for spectators, is in #42.

An AI player is connected while a tool call uses its key, and until 15 minutes after the last one ends. After that it's shown as away, like a player with no tab open. An idle AI player leaves a game in the lobby, which cancels the game if the AI is the host, as its conversation may never come back to play. A game in play is left for the others to end by leaving.

## Considered Options

- **A player per MCP session:** WZQ's first design. It mixed up conversations that share a session.
- **A `roll` tool beside `move_token`:** mirrors the web app's buttons, but adds a tool call to every roll for no decision.
- **No `start_game` tool, starting the game when the first player joins an AI's lobby:** simpler, but an AI host could then only play 2-player games.

## Consequences

The AI points players to the web app the server is set up with in `WEB_APP_URL`: `https://tablehop.games/ludo` on Render, and `http://localhost:8083/ludo` by default. The server refuses to start on Render without it, so production never sends players to localhost. A long game may stall until the person tells the AI to carry on, and an AI that loses its key can't get back into its game, which the other players end by leaving.
