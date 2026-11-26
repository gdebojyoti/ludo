import { useState } from "react";
import { track } from "./analytics";

/**
 * A call to `accounts` that takes the Player away from the page if it works, as Sign in and Sign out do, sending its
 * event as it starts. Until then it's busy, and it stays busy if it works, as the page is going. If it fails, it says so,
 * and can be tried again.
 */
export const useAccountsCall = (call: () => Promise<void>, event: string) => {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const start = async () => {
    setBusy(true);
    setFailed(false);
    track(event);
    try {
      await call();
    } catch {
      setBusy(false);
      setFailed(true);
    }
  };

  return { busy, failed, start };
};
