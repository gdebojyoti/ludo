import type { ReactNode } from "react";
import Icon from "./Icon";

interface Props {
  /** Shown before the text, such as the Away icon. */
  icon?: "away";
  children: ReactNode;
}

/** A short label under a Player name on a Player card: Away or Left. */
export default function Tag({ icon, children }: Props) {
  return (
    <span
      className="flex h-[18px] w-fit flex-none items-center gap-1 rounded-[9px] bg-ludo-on-page-muted px-[7px] text-[11px]
        font-bold text-ludo-ink"
    >
      {icon && <Icon name={icon} size={11} strokeWidth={2.6} />}
      {children}
    </span>
  );
}
