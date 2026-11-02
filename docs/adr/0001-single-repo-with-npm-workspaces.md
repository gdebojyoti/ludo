# Single repo with npm workspaces

The web app and the server speak one event contract and follow one set of game rules, and if each kept its own copy they would drift apart. So Ludo is one repo with npm workspaces: `apps/web` (the web app, see ADR-0005), `apps/server` (Express and Socket.IO) and `packages/shared` (the event contract, and the game rules as pure functions), so both live in one place and a change to either is type-checked on both sides. Each app still deploys on its own, from its own root folder.
