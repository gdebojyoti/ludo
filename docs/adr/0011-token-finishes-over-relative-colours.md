# Token finishes over relative colours

The cosmetic most games sell for their pieces is a colour, but each player sees their own seat in their own colour (ADR-0006), so a colour one player buys can't be shown to the others. Instead, what a player can buy for their tokens is a token finish: a pattern, sheen or texture, such as glitter, laid over whatever colour each viewer's screen gives that seat. Every player sees the finish on that seat's tokens, each in the colour their own screen shows the seat in. ADR-0006 stands: colour is still a matter for each player's screen, never a fact of the game, and no cosmetic changes a seat's colour.

## Considered Options

- **Colours fixed per player, superseding ADR-0006:** the most appealing to buy, but two players could pick the same colour, and players would no longer each see themselves in the same colour and corner.
- **No cosmetics on tokens**, only on what's beside the board (avatars, frames, die skins) or what only their owner sees (themes): leaves ADR-0006 untouched, but also leaves out the board, where players look the most.

## Consequences

- A finish has to work over every seat colour in every theme, and keep tokens fully opaque and easy to tell apart, down to the smallest size they're drawn at in a stack.
- Unlike a colour, a finish is a fact the server knows: the snapshot every screen gets carries each player's equipped finish, so the others can draw it.
