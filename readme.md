# Ludo

**Ludo** is a classic board game. This is an online multiplayer version, played between friends.

## Repo layout

| Folder            | What it is                                                          |
| ----------------- | ------------------------------------------------------------------- |
| `apps/web`        | The web app: React, Webpack 5 and Tailwind.                         |
| `apps/server`     | The game server: Express and Socket.IO.                             |
| `packages/shared` | The event contract and game rules shared by the web app and server. |

Decisions behind the setup are in [`docs/adr/`](docs/adr/), and the game's vocabulary is in [`GLOSSARY.md`](GLOSSARY.md).

## Development

Needs Node 24.

```sh
npm install
npm run dev        # web on http://localhost:8083/ludo, server on http://localhost:4003
```

Other commands, run from the root: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

Both apps work without configuration locally. To change the defaults, copy `apps/server/.env.example` to `apps/server/.env`, or `apps/web/.env.example` to `apps/web/.env`.
