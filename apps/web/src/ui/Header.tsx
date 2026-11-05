import type { ReactNode } from "react";
import { commonMessages } from "./messages";

interface Props {
  /** What the screen is, beside the wordmark, such as the Game mode and how many Players it has. */
  subtitle: string;
  /** A button on the right, such as Leave. */
  action?: ReactNode;
}

export default function Header({ subtitle, action }: Props) {
  return (
    <header className="flex h-11 w-full items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="font-ludo-display text-[22px] tracking-[0.08em] uppercase">{commonMessages.wordmark}</span>
        <span className="h-5 w-px bg-ludo-ivory/30" />
        <span className="truncate text-[13px] text-ludo-tan">{subtitle}</span>
      </div>
      {action}
    </header>
  );
}
