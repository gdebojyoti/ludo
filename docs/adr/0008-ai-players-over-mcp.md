# AI Players over MCP, identified by a Player key

So a player can play against, or alongside, the AI of their choice, the game server also serves an MCP endpoint at `/mcp` (the official MCP TypeScript SDK over Streamable HTTP), which any AI client that can add a remote MCP server by URL, such as Claude, connects to. It follows WZQ's endpoint (its ADR-0007 and ADR-0010), with what Ludo changes below. The endpoint runs in the same process as the Socket.IO layer, because games are held in memory (ADR-0004), and both call the same game service, so the rules are enforced in one place.

An AI Player is identified by a Player key that the AI holds in its conversation, not by its MCP session. `create_game` and `join_game` give a new AI Player a key, a random UUID that is its player ID, in place of ADR-0003's cookie, and every later tool call passes it. The claude.ai connector doesn't give each conversation its own MCP session, so a player per session would mix up conversations on the same account. With the key, several conversations on one account can each play as their own Player, even in the same Game. The key is the only proof of who the Player is, so it's never shown to anyone else (ADR-0007). Keys are kept in memory with the games, so after a restart a key is unknown and the AI is told to start a new game.

The tools are `create_game`, which takes the Game mode (Classic unless it's given), `join_game`, `start_game`, `wait_for_turn`, `move_token` and `leave_game`. Each takes an optional Player name; without one, the AI is given a random name from the web app's list, which is now in `@ludo/shared`. AI clients only act while answering a message, so `wait_for_turn` blocks until the AI has something to do, and returns after 30 seconds to be called again. It returns when:

- it's the AI's Turn. Rolling involves no choice, so `wait_for_turn` Rolls for the AI, and returns the Roll with what each legal Move would do. A Roll with no legal Move passes the Turn, and the wait carries on. That's two tool calls per Roll, not three, which matters in a Classic game of a hundred Turns or more.
- someone joins or Leaves the Lobby, if the AI is its Host, so it can call `start_game`, or ask the person it's playing for.
- the Game ends.

The Board is described as text, not drawn: where each Seat's Tokens are, by Track cell number, and for each legal Move where it lands, what it Captures, whether it lands on a Safe cell, and which opponents' Tokens could Capture it there with their next Roll. A text grid of the cross-shaped Board would be harder for an AI to read than a list.

An AI Player is connected while a tool call uses its key, and until 15 minutes after the last one ends. After that it's shown as Away, like a Player with no tab open. An idle AI Player Leaves a Game in the Lobby, which cancels it if the AI is the Host, as its conversation may never come back to play. A Game in play is left for the others to end with Leave.

## Considered Options

- **A player per MCP session:** WZQ's first design. It mixed up conversations that share a session.
- **A `roll` tool beside `move_token`:** mirrors the web app's buttons, but adds a tool call to every Roll for no decision.
- **No `start_game` tool, starting the Game when the first Player joins an AI's Lobby:** simpler, but an AI Host could then only play 2-Player Games.

## Consequences

The AI points Players to the web app the server is set up with in `WEB_APP_URL`: `https://tablehop.games/ludo` on Render, and `http://localhost:8083/ludo` by default. The server refuses to start on Render without it, so production never sends Players to localhost. A long Game may stall until the person tells the AI to carry on, and an AI that loses its key can't get back into its Game, which the other Players end by Leaving.
