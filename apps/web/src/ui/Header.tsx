import type { ReactNode } from "react";
import { commonMessages } from "./messages";
import SettingsButton from "./SettingsButton";

interface Props {
  /** What the screen is, beside the wordmark, such as the Game mode and how many Players it has. None in the Lobby. */
  subtitle?: string;
  /** A button on the right, such as Leave. Settings is to its right. */
  action?: ReactNode;
}

// On desktop, a bar across the top of the window, the same height whether or not it has a button.
export default function Header({ subtitle, action }: Props) {
  return (
    <header
      className="flex h-11 w-full flex-none items-center justify-between gap-3 xl:h-[85px] xl:gap-4 xl:border-b
        xl:border-ludo-on-page/12 xl:px-8"
    >
      <div className="flex min-w-0 items-center gap-3 xl:gap-3.5">
        <span
          className="font-ludo-display text-[22px] tracking-[0.08em] uppercase christmas:tracking-[0.04em]
            christmas:text-white xl:text-2xl"
        >
          {commonMessages.wordmark}
        </span>
        {subtitle && (
          <>
            <span className="h-5 w-px bg-ludo-divider xl:h-[22px]" />
            <span className="truncate text-[13px] text-ludo-on-page-muted xl:text-sm">{subtitle}</span>
          </>
        )}
      </div>
      {action && (
        <div className="flex flex-none items-center gap-2 xl:gap-3">
          {action}
          <SettingsButton />
        </div>
      )}
    </header>
  );
}
