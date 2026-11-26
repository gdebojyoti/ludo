import { useSyncExternalStore } from "react";

// The desktop layout starts at Tailwind's xl, 1280px, as the screens' own classes do.
const desktopQuery = () => window.matchMedia("(min-width: 1280px)");

const subscribe = (listener: () => void) => {
  const query = desktopQuery();
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};

/**
 * Whether the screens are in their phone layout, narrower than desktop, which re-renders the component when the window
 * crosses into the other. For what only phones have, such as tapping a Player's avatar.
 */
export const usePhoneLayout = (): boolean => useSyncExternalStore(subscribe, () => !desktopQuery().matches);
