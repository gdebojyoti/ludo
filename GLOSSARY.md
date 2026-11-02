# Ludo

Ludo is an online multiplayer board game, played between friends.

## Language

### Players

**Player**:
One of the people in a **Game**. A Player is recognised across visits, for now without needing an account.
_Avoid_: user, opponent (except relative to another player)

**Player name**:
The name a **Player** is shown by to the other **Players**, picked at random for them on their first visit.
_Avoid_: username, nickname, display name

**Host**:
The **Player** who created a **Game**.
_Avoid_: creator, owner, admin

**Away**:
Said of a **Player** who is in a **Game** but isn't connected to it right now.
_Avoid_: offline, disconnected (in user-facing text)

**Seat**:
A **Player**'s place at the **Board**, one of the places around it, with its own **Yard**, **Start cell**, **Home column** and **Tokens**. A Seat isn't a colour.
_Avoid_: colour (except for how a Seat is shown), corner, position

### Game lifecycle

**Game**:
A single match between its **Players**, from creation until it ends.
_Avoid_: match, room

**Game code**:
The short code the **Host** shares so others can join their **Game**.
_Avoid_: room code, invite code, game ID

**Lobby**:
A **Game** before it starts, while **Players** are joining.
_Avoid_: waiting room, pending game

**Leave**:
A **Player** stepping out of a **Game** for good.
_Avoid_: quit, resign, abandon

**Rejoin**:
A **Player** returning to a **Game** they are already in, such as after a page refresh or a lost connection.
_Avoid_: reconnect (in user-facing text)

**Game mode**:
A named set of rules, and the **Board** they're played on, that a **Game** follows.
_Avoid_: variant, ruleset

**Classic**:
The traditional **Game mode**, and the only one in v1.
_Avoid_: standard mode, normal mode

**House rules**:
Changes to the rules that the **Players** choose for one **Game**, in a **Game mode** that allows them.
_Avoid_: custom rules, options

### Board

**Board**:
Where a **Game** is played: a **Yard** for each **Seat**, the **Track**, a **Home column** for each **Seat**, and **Home**.
_Avoid_: map

**Cell**:
The smallest part of the **Board**, which a **Token** stands on.
_Avoid_: square, space, field

**Yard**:
A **Seat**'s corner of the **Board**, where its **Tokens** wait before entering the **Track**.
_Avoid_: base, nest, home

**Track**:
The loop of **Cells** shared by every **Seat**, which each **Token** travels around.
_Avoid_: path, ring

**Start cell**:
The **Cell** on the **Track** where a **Seat**'s **Tokens** enter from its **Yard**.
_Avoid_: entry, starting square

**Safe cell**:
A **Cell** where no **Token** can be **Captured**.
_Avoid_: safe square, safe spot

**Star cell**:
A **Cell** on the **Track** marked with a star.
_Avoid_: star square, star

**Home column**:
A **Seat**'s own lane of **Cells**, leading from the **Track** to **Home**.
_Avoid_: home stretch, home run

**Home**:
The centre of the **Board**, where a **Token**'s journey ends.
_Avoid_: goal, finish, triangle

### Play

**Token**:
A marker that belongs to a **Seat** and travels from its **Yard** to **Home**.
_Avoid_: piece, pawn, counter

**Roll**:
One cast of the die, and the number it shows.
_Avoid_: throw, dice value

**Turn**:
The part of a **Game** that belongs to one **Player**, which can include several **Rolls**.
_Avoid_: go, chance

**Move**:
One **Token** advancing by the number **Rolled**.
_Avoid_: step, play

**Capture**:
Landing on an opponent's **Token** and sending it back to its **Yard**.
_Avoid_: kill, cut, knock out
