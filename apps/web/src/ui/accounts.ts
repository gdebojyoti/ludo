// Where `accounts` is, which signs Players in, with Google, to every TableHop game (ADR-0014).
const accountsUrl = process.env.ACCOUNTS_URL ?? "http://localhost:8080";

/**
 * Hands the Player over to `accounts`, which sends them to Google and then back to this page, signed in, or not if
 * they cancelled. Throws if `accounts` can't be reached or refuses.
 */
export const signIn = async () => {
  const response = await fetch(`${accountsUrl}/api/auth/sign-in/social`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "google", callbackURL: location.href, errorCallbackURL: location.href }),
  });
  if (!response.ok) throw new Error(`accounts refused the sign-in: HTTP ${response.status}`);
  const { url } = (await response.json()) as { url: string };
  location.assign(url);
};
