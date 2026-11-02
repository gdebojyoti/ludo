# Seats, not colours

The rules, the server and the stored game know a player's place at the board only as a seat, never as a colour. Each player sees their own seat in their own colour and in the same corner, and the other seats in colours relative to it, as in Ludo King, so two players can both see themselves as red. Colour is therefore a matter for each player's screen, not a fact of the game: the web app maps seats to colours and corners, and nothing else does. That's why no colour appears in the rules, the event contract or the server, and why on-screen text names players by their player name, never by colour.

## Considered Options

- **Colours as the seats' IDs** ("red goes first", "next is green"): simpler at first, but it would tie the rules to colours, and break as soon as players choose their own colours.

## Consequences

Players can't refer to each other by colour, since two players may see different colours for the same seat; player names are the shared way to refer to each other. A colour a player picks is a preference kept in their browser, and is never sent to the server.
