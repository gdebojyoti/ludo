# Game modes are sets of house rules

A game's rules are described by house rules, and nothing in the rules depends on a game mode's name. Today, each game mode is a name the rules look up (`modeRules` in `@ludo/shared`, over the values in `classicRules`), and every rule function is passed that name. Instead, when a game is created, its game mode and any house rules its host chose are turned into the one set of rules it's played by, and that set is stored with the game. The rule functions are passed that set, never the name.

The House Rules game mode is the host's own choice of house rules, made with a checkbox for each, and a way to set a value for a house rule that needs one. Every other game mode, such as Classic and One Kill Win, is a fixed choice of the same house rules, and players still pick it by its own name, as they know it. So a game mode can only change what the house rules can change. A game mode that needs a rule they can't express yet adds it as a new house rule, which House Rules then offers too. In time, House Rules should be able to recreate every other game mode.

## Considered Options

- **Each game mode as its own code** (`if (mode === "oneKillWin")` through the rules): the simplest for two game modes, but the code grows with every one, and House Rules couldn't combine their rules.
- **House rules only inside House Rules, with the other game modes coded as now:** two ways to express the same rule, which would drift apart.

## Consequences

- Some house rules don't make sense together, such as a win by bringing every token home with no home column. The shared rules decide which choices are allowed together, and the server refuses others, as it refuses any other invalid command.
- Creating a game, over Socket.IO and over MCP (ADR-0008), carries the house rules as well as the game mode, and the snapshot every screen gets carries the rules the game is played by.
- Text that states a rule, such as "all 4 tokens" in the web app and in what AI players are told, is made from the game's rules rather than written out, so a new house rule doesn't mean finding every such sentence.
- Each house rule is tested on its own, and each named game mode as a whole.
- A game keeps the rules it was created with, so changing what a game mode chooses later doesn't change games already made.
- The first step changes how a game holds its rules without changing how any game plays.
