# One coin, earned against humans, with a daily cap

Ludo has no ads, so it's paid for by cosmetics, host perks and the supporter pack, all bought with one currency: coins. Coins are bought with money or earned by playing, so everything in the store can be earned, and buying only gets it sooner. Nothing in the store is left to chance. Coins are Ludo's own, not shared with the other games on the site, even though accounts may later be.

Only an account earns, never a guest. A finished game pays each account in it by its standing: the winner the most and the last the least, if anything, with players who tie each paid for the higher place they share. In One Kill Win only the winner is paid. A player who leaves earns nothing, and a game that ends by forfeit before a minimum number of turns pays no one. A guest can claim the game they just finished by creating an account from its result screen, but not by signing in to an account they already have, and not once they leave that screen.

What keeps this from being farmed:

- **Coins only from games against humans.** A game pays coins only if at least one other player joined through the web app, guest or account. With only AI players as opponents, it pays no coins and half the XP. The server can tell how a player joined, but not whether a human is behind it, so a script driving the web app's events counts as human; the cap is what limits that.
- **A daily cap on earned coins**, reset at 00:00 IST. Coins bought that day don't count towards it, and don't change it.
- **No coins from levels.** XP has no cap and can be earned against AI players, so levels give cosmetics and unlocks, never coins. Achievements are earned once each, so any coins they give are outside the cap.
- **The leaderboard counts XP from games against humans only**, reset weekly at Wednesday 00:00 IST. XP from games against AI players still counts towards levels, and so towards what levels unlock.

Every amount, price, threshold and cap is in one config in `@ludo/shared`, so the server, which awards and charges coins, and the web app, which shows them, never disagree, and each can be tuned in one place.

## Considered Options

- **Two currencies, one bought and one earned:** lets some items be bought only with money, but is harder for players to follow, and we want everything earnable.
- **Coins against AI players, limited by the cap:** simpler, but would make the cheapest way to earn a game with no other person in it.
- **Coins shared across the site's games:** would have to be decided before any money is in it, and nothing else yet needs it.

## Consequences

- Each coin and each point of XP is recorded with where it came from (the game, and whether it was against humans, a purchase, an achievement), so the leaderboard, refunds and support can all be worked out from the record.
- A finished game records how each of its players joined, which the stored game doesn't today.
- A chargeback after coins are spent can leave a balance below zero. While it's below a set threshold, such as -100, everything bought with coins is switched off at once, by one check of the balance rather than a flag on each thing: a cosmetic isn't drawn on any player's screen, and a host perk can't be used. What came from levels, achievements or the supporter pack stays on. What the player has equipped stays equipped, so it all comes back as soon as the balance is above the threshold again.
- A chargeback of the supporter pack itself is the one exception: it ends the player's supporter status and takes away the pack's badge and frame for good, whatever the balance, and its coins come off the balance like any other.
