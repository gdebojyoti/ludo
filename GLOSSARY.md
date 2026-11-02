# Ludo

Ludo is an online multiplayer board game, played between friends.

## Language

### Players

**Player**:
One of the people in a **Game**. A Player is recognised across visits, for now without needing an account.
_Avoid_: user, opponent (except relative to another player)

### Game lifecycle

**Game**:
A single match between its **Players**, from creation until it ends.
_Avoid_: match, room

**Rejoin**:
A **Player** returning to a **Game** they are already in, such as after a page refresh or a lost connection.
_Avoid_: reconnect (in user-facing text)
