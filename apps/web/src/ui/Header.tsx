import type { ReactNode } from "react";
import { commonMessages } from "./messages";

interface Props {
  /** What the screen is, beside the wordmark, such as the Game mode and how many Players it has. */
  subtitle: string;
  /** A button on the right, such as Leave. */
  action?: ReactNode;
}

// On desktop, a bar across the top of the window, the same height whether or not it has a button.
export default function Header({ subtitle, action }: Props) {
  return (
    <header
      className="flex h-11 w-full flex-none items-center justify-between gap-3 lg:h-[85px] lg:gap-4 lg:border-b
        lg:border-ludo-ivory/12 lg:px-8"
    >
      <div className="flex min-w-0 items-center gap-3 lg:gap-3.5">
        <span className="font-ludo-display text-[22px] tracking-[0.08em] uppercase lg:text-2xl">
          {commonMessages.wordmark}
        </span>
        <span className="h-5 w-px bg-ludo-ivory/30 lg:h-[22px]" />
        <span className="truncate text-[13px] text-ludo-tan lg:text-sm">{subtitle}</span>
      </div>
      {action}
    </header>
  );
}
