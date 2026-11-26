# Umami analytics shared across TableHop Games

Ludo is one of the TableHop Games (THG), each served under a path on tablehop.games, and every THG game sends its analytics to one shared Umami Cloud website. The web app's own page, `index.html`, loads Umami's script with `data-domains="tablehop.games"`, so localhost and preview builds send nothing. Each game loads its own copy for now; a shared host app may take it over later. When a host page loads Ludo as a remote (ADR-0005), Ludo's events are sent only if the host page loads the script.

Every custom event goes through one wrapper, `track()` in `apps/web/src/ui/analytics.ts`, which puts `ludo_` in front of the name: the game's path segment in lower case and an underscore. Umami's Goals and Funnels pick events by name, and its property filters work only inside one event, so a separate name is the only way to keep each game's events apart in reports, and there's no `game` property. Names are snake_case and at most 50 characters with the prefix. An event that means the same as one in another THG game uses the same name after the prefix, so a THG-wide total is a sum of each game's count: Ludo shares `game_created`, `game_joined`, `link_copied` and `back_to_start` with WZQ, `theme_change` with Tactris, and `game_over` and `game_left` with both.

`track()` adds `layout` to every event: `mobile` for phones and tablets by their user agent, otherwise `desktop`, the same test as Tactris's. It's not the layout Ludo shows, which goes by the window's width. Umami counts each property it stores as an event, against a monthly limit every THG game shares, so events carry only what reports need, and `roll`, sent for every Roll, leaves `layout` out.

## Events

| Event | Sent when | Data, besides `layout` |
| --- | --- | --- |
| `ludo_game_created` | The server accepts a new Game. | `mode` |
| `ludo_game_joined` | The server accepts the Player into a Game. | `via`: `code` (typed on the start screen) or `link` (a Join link) |
| `ludo_link_copied` | A copy to share the Game works, in the Lobby. | `what`: `join_link` or `code` |
| `ludo_link_shared` | Something is picked in the phone's share sheet, from the Lobby's Share Join link. | `what`: `join_link` |
| `ludo_game_start` | The page sees the Game start, by the Host or by the fourth Player's join. | `mode`; `players` |
| `ludo_roll` | The Player taps the die to Roll, a retry included. | `mode`, and no `layout` |
| `ludo_token_capture` | The page sees a Capture the Player made. | `mode`; `tokens`: how many the Move Captured |
| `ludo_game_over` | The page sees the Game won. | `mode`; `players`; `won`; `how`: `all_home`, `capture` or `others_left` |
| `ludo_game_left` | The server accepts the Player's Leave. | `mode`; `players`; `phase`: `lobby` or `playing` |
| `ludo_back_to_start` | Back to start, after the Game ended. | `from`: `result` (the Game was won) or `cancelled` (the Host Left the Lobby) |
| `ludo_settings_open` | The Settings button, in the Lobby or in play, or on the start screen on desktop. | Nothing else |
| `ludo_tab_open` | A tab in the bottom bar on phones, outside a Game, or the Profile button on the desktop start screen. | `tab`: `play`, `store`, `leaderboard`, `settings` or `profile` |
| `ludo_sign_in_start` | Sign in with Google, on the start screen, before the page goes to Google. | Nothing else |
| `ludo_theme_change` | Change theme, in Settings. | `theme` |
| `ludo_dice_side_change` | The Dice on the left switch. | `on_left` |
| `ludo_automatic_move_change` | The Automatic move switch. | `on` |

`mode` is the Game mode, `classic` or `oneKillWin`. `players` counts the Players in the Lobby, or, once the Game has started, those it started with, any who have since Left included. `won` says whether this Player won, and `how` how the winner did: bringing their last Token Home, Capturing in One Kill Win, or being the last Player left. In One Kill Win the winning Capture sends both `token_capture` and `game_over`. There's no `seconds`, unlike WZQ's and Tactris's: `roll`, sent for every Roll, already shows how much is played, and a page that opened partway through a Game, such as after a reload, couldn't tell, as snapshots carry no times. A page like that sends no `game_start` either. The share sheet's event isn't `link_copied`, as nothing is copied, unless the Player picks Copy in the sheet, which it doesn't say. `settings_open` is there to show how many Players find Settings at all, beside the change events, which count only those who change something.

Each Player's browser sends its own events, as that Player sees the Game. A Game is counted once for each of its Players in a browser, and not at all for AI Players, who play through the MCP endpoint (ADR-0008) and never load the page. The server sends the Game to every tab a Player has open, and each tab sends its own `game_start`, `token_capture` and `game_over`, so a Player with two tabs open counts twice. Events the Player sets off with a tap, `game_left` among them, come only from the tab they used: a Leaver's other tabs are told only that they have no active Game. Closing the tab doesn't Leave a Ludo Game, so there's no `game_left` for a hidden page. A Game that ends while the Player's connection is down shows as gone when they Rejoin, and sends no `game_over`.

## Considered Options

- **Only the Host's browser sends `game_start` and `game_over`:** counts match Games, but Games an AI Player hosts aren't counted, nor any after the Host Leaves.
- **`layout` by the window's width, as Ludo's own layout goes:** says which layout the Player saw, but `mobile` would mean something different in Ludo from Tactris.
- **`first_roll` once per Game, or `roll` with `layout`:** cheaper, or able to be split by layout. Every Roll was wanted, and leaving `layout` out makes each cost 2 events, not 3: a Classic Game of 4 Players Rolls an estimated 350 times.
- **The share sheet counted as `link_copied`:** one count for every Join link passed on, but Ludo's `join_link` count would include shares that WZQ's doesn't.
- **`token_capture` from every Player who sees the Capture:** up to four events for one Capture, with nothing gained.
- **A `game` property instead of the prefix:** Goals and Funnels can't filter by it, so each game's events would mix in reports.

## Consequences

A Goal or Funnel for Ludo picks events by their `ludo_` names. Counts of `game_start`, `token_capture` and `game_over` are per open tab of each Player, not per Game. A new event goes through `track()`, reuses another THG game's name when it means the same thing, and keeps its properties few, as each one stored costs an event.
