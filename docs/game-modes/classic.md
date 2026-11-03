# Classic

The one **Game mode** in v1. Later **Game modes**, and any **House rules**, are described as changes to these rules. The rules that later **Game modes** are likely to change are marked _(may vary)_.

Terms in bold are defined in [GLOSSARY.md](../../GLOSSARY.md). The rules never depend on colours ([ADR-0006](../adr/0006-seats-not-colours.md)).

## Players and Seats

- A **Game** has 2 to 4 **Players** _(may vary)_, each in their own **Seat**. One **Player** has one **Seat** _(may vary)_.
- The **Host** creates the **Game** and shares its **Game code**, or its **Join link**. Others join with either while the **Game** is in the **Lobby**.
- **Seats** are given out when the **Game** starts, in the order the **Players** still in joined. The second **Player** sits opposite the first, so a 2-**Player** **Game** always uses opposite **Seats**. The third and fourth fill the other two.
- The **Game** starts by itself when the fourth **Player** joins. With 2 or 3 **Players** in, the **Host** can start it sooner. Nobody can join after that, though **Players** already in can **Rejoin**. Once the **Game** starts, the **Host** is an ordinary **Player**.
- There are no teams.

## The Board

- The standard cross-shaped **Board** _(may vary)_: four **Seats**, a **Track** of 52 **Cells**, and a **Home column** of 5 **Cells** for each **Seat**, leading to **Home**.
- Each **Seat** has 4 **Tokens** _(may vary)_, which start in its **Yard**.
- The **Safe cells** are the four **Start cells**, and the four **Star cells**, each 8 **Cells** on from a **Start cell** _(may vary)_.

## Turns

- The server makes every random choice in a **Game**, picking the first **Player** and every **Roll**, so no **Player** can influence them. The only random choice made in the browser is a new **Player**'s **Player name**, which plays no part in the rules.
- The first **Player** is picked at random. Play then goes clockwise around the **Seats**.
- A **Player** starts their **Turn** by **Rolling** a six-sided die.
- After a **Roll**, the **Player** must **Move** one **Token** if any **Move** is legal, choosing which, even when only one is legal. If none is legal, the **Turn** passes.
- There's no time limit on a **Turn** _(may vary)_.

## Moving

- Only a 6 brings a **Token** out of the **Yard** onto its **Start cell** _(may vary)_.
- A **Token** moves clockwise around the **Track**, then up its own **Home column** to **Home**. From its **Start cell**, it covers 50 more **Track** **Cells**, ending at the tip of its own arm, then the 5 **Home column** **Cells**, then **Home**: 56 steps in all. It never lands on the **Track** **Cell** just before its own **Start cell**.
- A **Token** needs an exact **Roll** to reach **Home**. A **Roll** that would take it past **Home** can't **Move** it.

## Captures

- A **Token** that ends its **Move** on a **Cell** **Captures** every opponent's **Token** there that isn't protected, sending each back to its **Yard**.
- A **Token** is protected on a **Safe cell**, and when two or more **Tokens** of its **Seat** share its **Cell** _(may vary)_. Other **Tokens** can still pass protected **Tokens**, or land on their **Cell** and share it.

## Extra Rolls

A **Player** **Rolls** again, in the same **Turn**, after a **Move** that _(may vary)_:

- used a 6, with no limit on how many 6s in a row
- made a **Capture**
- brought a **Token** **Home**

A **Move** earns one extra **Roll**, even when it does more than one of these. A 6 that no **Token** can **Move** by earns nothing, and the **Turn** passes.

## Leaving

- In the **Lobby**, a **Player** who **Leaves** makes room for someone else to join. If the **Host** **Leaves**, the **Game** is cancelled.
- During play, a **Player** who **Leaves** forfeits, and their **Tokens** come off the **Board**. Their **Seat** stays empty for the rest of the **Game**, and if it was their **Turn**, the **Turn** passes to the next taken **Seat** clockwise. Play continues while 2 or more **Players** remain. If only one remains, they win.

## Winning

The first **Player** to bring all their **Tokens** **Home** wins, and the **Game** ends.
