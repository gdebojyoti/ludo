# The web app is a Module Federation remote

Ludo is one of several games on one site, each at its own path (`<domain>/ludo`, `<domain>/wzq`, and so on), and a host app will load them into one page with Webpack 5 Module Federation. The other games are plain React and Webpack 5, so `apps/web` is too, set up like them: it exposes the game as a React component, shares React as a singleton, and also runs on its own at `/ludo` until the host app exists.

Hosting must be free, so the web app is on Vercel's free tier, at `<domain>/ludo`, and the server is on Render's free tier, on a subdomain of the same domain (for example `api.<domain>`) rather than its default `onrender.com` address. That makes the player cookie (ADR-0003) same-site, so browsers don't block it as a third-party cookie.

## Considered Options

- **Next.js, routed to `/ludo` at the edge (multi-zones) or loaded in an iframe:** Next.js can't be a remote, so Ludo would be the only game built differently and could never share a page with the host app; an iframe would need sizing, browser history and deep links worked around.
- **Default platform domains with a `SameSite=None` cookie:** rejected, because Safari and Chrome's third-party cookie blocking can still drop it.
- **The web app sets the cookie on its own domain and passes the ID to the server:** workable, but needs extra handoff code that a shared domain makes unnecessary.

## Consequences

Every game runs on the same origin, and once federated, in the same page. Anything the web app keeps in the browser (`localStorage` keys, cookies it sets itself) is named `ludo-<name>`, using only hyphens as separators (for example `ludo-theme`), and the server's cookie, `ludo-player-id`, stays host-only rather than being set on the parent domain.
