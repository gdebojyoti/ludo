# House Rules

A **Game mode** in which the **Host** chooses the **House rules**, when creating the **Game**. It follows the rules of [Classic](classic.md), changed by each **House rule** the **Host** turns on. In time, there'll be enough **House rules** to recreate every other **Game mode**, as [ADR-0009](../adr/0009-game-modes-are-sets-of-house-rules.md) describes.

Terms in bold are defined in [GLOSSARY.md](../../GLOSSARY.md).

## Choosing House rules

- **House Rules** is one of the **Game modes** listed when creating a **Game**, beside **Classic** and **One Kill Win**, which keep their own names.
- Choosing it shows a checkbox for each **House rule**, to turn it on or leave it off. A **House rule** that needs a value shows a way to set it when it's on.
- The screen's design will be shared before it's built. The names below are working names, until it settles what **Players** see.

## House rules

### Tokens per Seat

- Each **Seat** has a number of **Tokens** other than **Classic**'s 4, fewer or more, which the **Host** sets. Every **Seat** has that same number when the **Game** starts.
- With it off, each **Seat** has 4, as in **Classic**.

### Weighted die

- The die stops being fair: some **Rolls** become more likely, depending on the **Board**. One checkbox turns on every boost below, and more may be added.
- A **Player** whose **Tokens** are all in their **Yard** is more likely to **Roll** a 6.
- A **Player** with an opponent's **Token** in reach is more likely to **Roll** a number that would **Capture** it.
- The exact logic is decided when it's built.

## Open questions

- With every **House rule** off, is the **Game** exactly **Classic**? Likely, but not decided.
- **Tokens per Seat**: the lowest and highest numbers allowed.
- **Weighted die**: how much each boost changes the odds, how boosts combine when more than one applies, which other boosts it covers, and whether **Players** are told when a **Roll** was boosted.
- Which of the **Host**'s choices the other **Players** see, in the **Lobby** and during play.
- How an **AI Player** creates a **House Rules** **Game**, and how it's told the **House rules** of a **Game** it's in.
- Which **House rules** can't be turned on together. None yet, with these two.
