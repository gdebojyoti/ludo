# No file cached forever behind the tablehop.games proxy

Players reach Ludo at tablehop.games/ludo, like every TableHop game (ADR-0010). tablehop.games is a separate Vercel project, from the `gdebojyoti/tablehop.games` repo, whose rewrites pass every `/ludo` request on to Ludo's own deployment and cache the answers. That cache keys on the URL only and keeps whatever it got first, for as long as Ludo's `Cache-Control` header allows. So Ludo sends no caching header of its own, for any file, and every file gets Vercel's default, `public, max-age=0, must-revalidate`: the proxy checks with Ludo before reusing a copy, and a browser keeps its copy but asks first, usually getting a 304 with no file.

Webpack gives scripts and sounds hashed names, which are usually cached forever with `max-age=31536000, immutable`, as Ludo's were before this decision. Behind the proxy, that went wrong twice, both times while Ludo's own deployment answered correctly:

- **Part of a file:** Safari asks for the first 2 bytes of a sound before playing it. When that request reached the proxy first, the proxy kept the 2-byte answer and gave it to every later request, so the sounds stopped playing for everyone.
- **A 404:** Vercel adds headers by the file's name, even when there's no file. When an app chunk was missing for a moment, likely during a rollback, the proxy and the browsers that asked for it then kept the 404 for a year, and the game showed a white page.

## Considered Options

- **Cache forever only in browsers, with a separate header telling the proxy not to:** whether one sent by Ludo reaches the proxy and works there is untested, and getting it wrong breaks the game only in production.
- **Fix it in the tablehop.games proxy:** Vercel's rewrites have no caching setting of their own, and the proxy's project also serves WZQ and Tactris, so a change there reaches every game.

## Consequences

Each visit costs one small request per file, usually answered with a 304, and the proxy no longer saves Ludo a request. If a broken copy gets stuck anyway, purge the tablehop.games project's CDN cache, then change `hashSalt` in the web app's webpack config, which renames every hashed file, so browsers that kept the broken copy fetch it afresh.
