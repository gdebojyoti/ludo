import { Dice2, Podium, Settings, Store, User, type LucideIcon } from "lucide-react";
import { tabMessages } from "./messages";

export type Tab = "play" | "store" | "leaderboard" | "settings" | "profile";

// The tabs, in order, each with its icon.
const tabs: { tab: Tab; icon: LucideIcon }[] = [
  { tab: "play", icon: Dice2 },
  { tab: "store", icon: Store },
  { tab: "leaderboard", icon: Podium },
  { tab: "settings", icon: Settings },
  { tab: "profile", icon: User },
];

interface Props {
  /** The tab that's open. */
  open: Tab;
  /** Laid out but hidden, as the Start screen's card is, while the server is yet to say if the Player is in a Game. */
  hidden: boolean;
  onOpen: (tab: Tab) => void;
}

// Along the bottom of the screens outside a Game, on phones only: desktop has no tabs. A tab opens its screen in place,
// leaving the address as it is. It stays in view as the screen above it scrolls.
export default function NavBar({ open, hidden, onOpen }: Props) {
  return (
    <nav
      className={`sticky bottom-0 z-10 grid h-16 flex-none grid-cols-5 border-t border-ludo-on-page/14 bg-ludo-page-deep
        xl:hidden ${hidden ? "invisible" : ""}`}
      aria-label={tabMessages.label}
      inert={hidden}
    >
      {tabs.map(({ tab, icon: TabIcon }) => {
        const isOpen = tab === open;
        return (
          <button
            key={tab}
            type="button"
            className={`relative flex min-w-0 cursor-pointer touch-manipulation flex-col items-center justify-center gap-1
              text-[11px] font-semibold select-none ${isOpen ? "text-ludo-accent-light" : "text-ludo-on-page-muted"}`}
            aria-current={isOpen ? "page" : undefined}
            onClick={() => onOpen(tab)}
          >
            {isOpen && <span className="absolute top-0 h-[3px] w-7 rounded-b-[3px] bg-ludo-accent-light" />}
            <TabIcon size={22} strokeWidth={1.8} aria-hidden />
            {tabMessages.tabs[tab]}
          </button>
        );
      })}
    </nav>
  );
}
