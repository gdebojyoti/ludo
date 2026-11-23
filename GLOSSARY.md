# Ludo

Ludo is an online multiplayer board game, played between friends.

## Language

### Players

**Player**:
One of the people in a **Game**. A Player is recognised across visits, as a **Guest** or by their **Account**.
_Avoid_: user, opponent (except relative to another player)

**Player name**:
The name a **Player** is shown by to the other **Players**. A **Guest**'s is picked at random for them on their first visit, and an **Account**'s is its Google name, for now.
_Avoid_: username, nickname, display name

**Host**:
The **Player** who created a **Game**.
_Avoid_: creator, owner, admin

**AI Player**:
A **Player** who is an AI, playing through the game server's MCP tools rather than the web app. It's an ordinary **Player** in every rule. See [ADR-0008](docs/adr/0008-ai-players-over-mcp.md).
_Avoid_: bot, computer player

**Player key**:
What identifies an **AI Player**: given to it when it creates or joins a **Game**, and passed back with every tool call after that. It's the **AI Player**'s own secret, never shown to anyone else.
_Avoid_: token (a **Token** is a marker on the **Board**), session ID

**Away**:
Said of a **Player** who is in a **Game** but isn't connected to it right now.
_Avoid_: offline, disconnected (in user-facing text)

**Seat**:
A **Player**'s place at the **Board**, one of the places around it, with its own **Yard**, **Start cell**, **Home column** and **Tokens**. A Seat isn't a colour.
_Avoid_: colour (except for how a Seat is shown), corner, position

### Accounts and progression

**Account**:
What a **Player** signs in with, using Google, so that their **Player name**, **Coins**, **XP** and **Cosmetics** follow them to any device.
_Avoid_: user, user account, login

**Guest**:
A **Player** without an **Account**, recognised only by the browser they play in. A Guest earns no **Coins** or **XP**.
_Avoid_: anonymous player, unregistered user

**Profile**:
What other **Players** can see of an **Account**: its **Player name**, **Level**, equipped **Cosmetics** and stats.
_Avoid_: account page, user page

**Standing**:
A **Player**'s place at the end of a **Game**: the winner first, then the others by how many **Tokens** they brought **Home**, with ties sharing a Standing, and those who **Left** last.
_Avoid_: rank, position, placement

**XP**:
What an **Account** earns by finishing a **Game**, more for a higher **Standing**, and which raises its **Level**. It can't be bought.
_Avoid_: experience, points

**Level**:
How far an **Account** has come, raised by **XP**. Reaching a Level can give a reward, or unlock a **Host perk**.
_Avoid_: rank, tier

**Leaderboard**:
The **Accounts** ranked by the **XP** they've earned this week in **Games** with at least one other human **Player**.
_Avoid_: ranking, high scores

**Rival**:
Another **Account** that an **Account** has played a **Game** with, whose record against it they can both see.
_Avoid_: friend (until there are friends), opponent

### Store

**Coin**:
Ludo's one currency, bought with money or earned by finishing a **Game**, and spent in the **Store**. Coins are Ludo's own, not shared with the other games on the site.
_Avoid_: gold, gems, credits

**Coin cap**:
The most **Coins** an **Account** can earn from **Games** in one day. **Coins** bought that day don't count towards it.
_Avoid_: daily limit, earning limit

**Store**:
Where **Coins** and the **Supporter pack** are bought with money, and **Cosmetics** and **Host perks** with **Coins**. Nothing in it is left to chance.
_Avoid_: shop, market

**Cosmetic**:
Something an **Account** owns that changes how Ludo looks, never how it's played.
_Avoid_: item, skin, collectible

**Slot**:
One kind of **Cosmetic**, of which an **Account** equips one at a time, such as its **Token finish**.
_Avoid_: category, cosmetic type

**Token finish**:
A **Cosmetic** laid over a **Seat**'s colour on its **Tokens**, such as a pattern or glitter, which every **Player** sees. It never changes the colour itself, which stays relative to each viewer.
_Avoid_: token skin, token colour

**Locker**:
Where an **Account** sees the **Cosmetics** it owns, and equips them.
_Avoid_: inventory, collection, wardrobe

**Host perk**:
A **Modifier** that only a **Host** who has unlocked it can create a **Game** with. The other **Players** need nothing to play it.
_Avoid_: premium feature, paid option

**Supporter pack**:
A one-off purchase, for a fixed price, that supports Ludo and makes the **Account** a **Supporter**.
_Avoid_: donation, tip, subscription

**Supporter**:
An **Account** that bought the **Supporter pack**, marked as one on its **Profile**.
_Avoid_: premium, VIP, donor, subscriber

### Game lifecycle

**Game**:
A single match between its **Players**, from creation until it ends.
_Avoid_: match, room

**Game code**:
The short code the **Host** shares so others can join their **Game**.
_Avoid_: room code, invite code, game ID

**Join link**:
The web app's address with a **Game code**, `/ludo?join=<Game code>`, which any **Player** in the **Lobby** can copy and share so a friend can join by opening it, without typing the code. It joins as soon as it's opened, and works only while the **Game** is in the **Lobby** and has room, like the code itself.
_Avoid_: invite link, share link

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
The traditional **Game mode**.
_Avoid_: standard mode, normal mode

**One Kill Win**:
A **Game mode** won by the first **Capture**, with no **Home columns** or **Home** in play. See [docs/game-modes/one-kill-win.md](docs/game-modes/one-kill-win.md).
"Kill" is fine in this name only: elsewhere, it is still a **Capture**.
_Avoid_: one capture mode

**House Rules**:
A **Game mode** in which the **Host**, when creating the **Game**, chooses which **Modifiers** it's played with. See [docs/game-modes/house-rules.md](docs/game-modes/house-rules.md).
Written with capitals, as the mode's name, as **One Kill Win** is.
_Avoid_: custom mode, custom game

**Modifier**:
One of the rules a **House Rules** **Game** can be played with, which its **Host** turns on or leaves off, and sets a value for where it needs one, when creating the **Game**.
_Avoid_: house rule, option, setting, custom rule, tweak

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
