import { gameCodeLength } from "@ludo/shared";

// The Join link, `/ludo?join=<Game code>`, joins a Game in the Lobby as soon as it's opened, as if its code had been
// typed in. It's taken out of the address once used: a Player who joined is recognised by their cookie after that,
// and a link left in the address would try the code again on every connection.

const joinParameter = "join";

// Ludo's own page. Every game shares one origin (ADR-0005), so a Join link copied while Ludo runs inside the host
// app's page still leads to Ludo, not to that page.
const ludoPath = "/ludo";

/** The full Join link for the Game with this code. */
export const joinLinkFor = (gameCode: string) => {
  const url = new URL(ludoPath, window.location.origin);
  url.searchParams.set(joinParameter, gameCode);
  return url.href;
};

/** The Game code the address asks to join, if it's a Join link, exactly as written, which may not be a valid code. */
export const gameCodeInAddress = () => new URLSearchParams(window.location.search).get(joinParameter);

/** Whether this is shaped like a Game code, so is worth sending to the server. */
export const isGameCode = (text: string) => new RegExp(`^\\d{${gameCodeLength}}$`).test(text);

/** Takes the Join link out of the address bar, without reloading the page or adding to its history. */
export const removeJoinLinkFromAddress = () => {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(joinParameter)) return;
  url.searchParams.delete(joinParameter);
  window.history.replaceState(window.history.state, "", url);
};
