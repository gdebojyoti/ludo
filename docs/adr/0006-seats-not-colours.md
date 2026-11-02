# Seats, not colours

The rules, the server and the stored Game know a Player's place at the Board only as a Seat, one of four numbered clockwise, never as a colour. Each Player sees their own Seat in their own colour and in the same corner, and the other Seats in colours relative to it, as in Ludo King, so two Players can both see themselves as red. Colour is therefore a matter for each Player's screen, not a fact of the Game: the web app maps Seats to colours and corners, and nothing else does. That's why no colour appears in the rules, the event contract or the server, and why on-screen text names Players by their Player name, never by colour.

## Considered Options

- **Colours as the Seats' IDs** ("red goes first", "next is green"): simpler at first, but it would tie the rules to colours, and break as soon as Players choose their own colours.

## Consequences

Players can't refer to each other by colour, since two Players may see different colours for the same Seat; Player names are the shared way to refer to each other. A colour a Player picks is a preference kept in their browser, and is never sent to the server.
