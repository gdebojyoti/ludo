# Ludo · Heritage UI design handoff

Mobile web designs for Ludo (TableHop Games), exported from the design canvas. Use these as the visual reference when building the UI.

## How to read these files

Each `*.dc.html` file is one screen (artboard), 390 × 844 unless noted. They are **design sources, not production code**:

- Styles are plain CSS (in the `<style>` block inside `<helmet>`) plus inline styles. All colours, sizes, radii and spacing are exact and can be copied.
- Markup uses a small template syntax: `{{name}}` holes, `<sc-for list=… as=…>` loops and `<sc-if value=…>` conditionals.
- Data for each screen (token positions, yard counts, labels) and any interaction logic lives in the `<script type="text/x-dc">` block at the bottom, inside `renderVals()`.
- `<script src="./support.js">` is the design tool's runtime. It is not included, so these files will not render on their own in a browser.
- Fonts: Marcellus (display) and Figtree (interface), from Google Fonts.

## 1 · Game screens (`1-game-screens/`)

| File | Screen |
|---|---|
| Main.dc.html | A · Your turn, Roll button. Board is a stacking stress test (every stack case). |
| Rolled6.dc.html | A2 · You rolled a 6: cells you can move from turn gold, your tokens get a maroon ring and lift. |
| TheirTurn.dc.html | A3 · Someone else's turn, realistic mid-game board. |
| ThreePlayers.dc.html | A4 · 3 players: one Away, one empty seat (neutral yard, lane and Home triangle). |
| HomeTokens.dc.html | A5 · Tokens that reached Home, drawn in each seat's centre triangle; card shows "N Home". |
| RollAnimation.dc.html | A6 · Interactive (390 × 1264). Roll animation: fast reply, slow server (keeps rolling until the reply), server error then retry. Includes three Web Audio dice sounds (not final). |
| CaptureYou.dc.html | A7 · Interactive. You sent Hermione's token back: it hops back to her Yard (0.9 s arc). |
| CaptureThem.dc.html | A8 · Interactive. Luna sent your token back to your Yard. |

## 2 · Start, lobby & result (`2-start-lobby-result/`)

| File | Screen |
|---|---|
| StartSheet.dc.html | Start 2 · Name (with new-name button), Create a game, Join with a code. |
| StartNoGame.dc.html | Start 2 error · No game found (also covers started or full games). |
| ChooseMode.dc.html | Start 2b · Choose a mode: bottom sheet over the Start screen after Create a game. Classic only; the rest Coming soon. |
| StartInGame.dc.html | Start 2 error · You're already in a game. |
| LobbyCodePlain.dc.html | Lobby 3 (Host) · Game code, Share join link, Copy code, players, Start. |
| LobbyGuest.dc.html | Lobby 3 (Guest) · No Start; "Waiting for [Host] to start". |
| LeaveLobby.dc.html | Leave 1 · Host leaves the Lobby (cancels the game). |
| LeaveLobbyGuest.dc.html | Leave 1b · Guest leaves the Lobby. |
| LeaveGame.dc.html | Leave 2 · Leave during a game (forfeit). |
| ResultStandings.dc.html | Result 2 · Winner and tokens Home at the end. |
| ResultCancelled.dc.html | Result 3 · Cancelled by the Host. |

## 3 · Style guide (`3-style-guide/`)

| File | Contents |
|---|---|
| Buttons.dc.html | B1–B6 with specs and where each is used (760 × 1160). |
| Foundations.dc.html | Colours (hex + role) and type scale (760 × 1480). |
| BoardPieces.dc.html | Cells, tokens, stacks, yards, Home (760 × 1380). |
| Components.dc.html | Header, player cards, die, Roll, lobby rows, tags, inputs, notice, game code, dialog (760 × 1380). |

## Key decisions

- **Seats are relative to the viewer.** `s0` = you, bottom-left, red. Clockwise: `s1` top-left green, `s2` top-right yellow, `s3` bottom-right blue. Players are always shown by name, never by colour.
- **Board:** 15 × 15 grid, 360 px, 1 px lines (`#CDBB94`), no gold border; a thin outer ring only.
- **Stacking:** 1 token = full size (17 px). 2–4 tokens = 11 px tokens (diagonal pair / triangle / 2×2). 5+ = 20 px count chip with a ring split by each seat's share. Nothing draws outside its cell. Players tap the cell, not a token.
- **Everything is fully opaque.** No transparency on tokens; board colours never change to show state.
- **Your options after a roll:** gold cells (`#F3CF7E`, 1.5 px inset `#B8892B`) and your tokens ringed and lifted. Opponents' tokens look normal (capture targets are deliberately not highlighted).
- **Header 1** on every game screen: wordmark · divider · "Classic · N players", icon-only Leave on the right.
- **Buttons:** all bordered buttons use a 1.5 px border; icon buttons are 44 × 44 rounded squares (radius 12).
- **Roll:** shown only on your turn; every roll is shown to everyone. In production the die keeps rolling until the server returns the value.
- **Game code** is shown as plain numerals so it doesn't look editable.

## Still open

- Small-screen fix (S1, S3, S4 or S5 on the canvas) not chosen yet.
- "Share join link" and "New name" are out of scope for v1 in the spec; decide before building.
- Whether a capture gives a bonus roll; whether a 6 is needed to leave the Yard.
- Dice sounds and the capture animation are placeholders.
- Not designed yet: 2-player game, a player Leaving mid-game, the win moment, connection states, larger screens.
