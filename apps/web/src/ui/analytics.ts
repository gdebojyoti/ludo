// Analytics, sent to the Umami website every TableHop Games game shares (ADR-0010; the script is in index.html). Each
// event's name starts with "ludo_", as Umami's reports can only tell games apart by name. Event names are snake_case,
// and stay under 50 characters with the prefix. An event that means the same as one in another game has the same name
// after its prefix, such as game_over in Tactris. Umami counts each property as an event of its own, so send only
// what's needed. Every event is listed in the ADR.

type Data = Record<string, string | number | boolean>;

// Set by the Umami script in index.html.
declare global {
  interface Window {
    umami?: { track: (event: string, data?: Data) => Promise<void> };
  }
}

// Phones and tablets, by user agent, as in Tactris, so a layout means the same in every game's events. iPadOS Safari
// says it's a Mac, so a Mac with a touch screen counts as a tablet. Not the layout Ludo shows, which goes by width.
const mobile =
  /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

/**
 * Sends an event to Umami, with the layout unless told not to, for an event sent so often that its cost matters.
 * Does nothing when the script hasn't loaded or is blocked, or off tablehop.games.
 */
export const track = (event: string, data?: Data, { layout = true } = {}) => {
  window.umami?.track(`ludo_${event}`, layout ? { layout: mobile ? "mobile" : "desktop", ...data } : data);
};
