# Ludo: new screens (exported artboards)

Exported from the "Ludo: new screens" design canvas on 2026-11-26. Heritage theme, phone only (370 px wide).

| Letter | File | Screen | Size |
|---|---|---|---|
| D1 | `D1-start-guest-logo-card.dc.html` | Start · Guest · Logo + ivory card + plain sign-in | 370 × 667 |
| E | `E-start-guest-new-name-dialog.dc.html` | Start · Guest · New name dialog | 370 × 844 |
| G | `G-lobby-host.dc.html` | Lobby (Host) | 370 × 844 |
| P | `P-profile-yours.dc.html` | Profile · Yours (full length) | 370 × 1360 |
| Q | `Q-profile-other-player-sheet.dc.html` | Another Player's Profile (sheet) | 370 × 844 |
| R | `R-profile-guest-tapped-sheet.dc.html` | A Guest's Avatar tapped (sheet) | 370 × 844 |
| S | `S-profile-tab-guest.dc.html` | Profile tab · Guest | 370 × 844 |
| T | `T-settings-account.dc.html` | Settings (Account) | 370 × 844 |

## Reading these files

- Each file is one screen. The markup inside `<x-dc>` is plain HTML with inline styles, plus a `<helmet><style>` block for shared classes.
- `<script src="./support.js">` loads the design tool's runtime. It isn't included, and the screens don't need it to be understood.
- A few screens use the design tool's template syntax: `{{name}}` fills in a value from `renderVals()` in the `<script type="text/x-dc">` block at the bottom, `<sc-for>` repeats markup over a list, and `<sc-if>` shows markup conditionally.
- `/_blob/43e36bac26a919e52da9ee8ad6d30cc7` is the Hexagon Coin. It's included here as `coin-hexagon.svg` (used in P and S).
- `HNStartGuest.dc.html` (linked from E's "Done") is artboard D, which isn't part of this export.
- Fonts: Marcellus (display) and Figtree (interface), from Google Fonts.
- "Sign in with Google" buttons are placeholders. The real button should follow Google's branding rules, and its dashed "G" box marks where Google's logo goes.
