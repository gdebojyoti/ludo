import type { ReactNode } from "react";
import Icon from "./Icon";

interface Props {
  /** The Lobby's larger size, or the Player cards' smaller one. */
  size: "lobby" | "card";
  /** Gold marks the Host; tan marks a Player who is Away or Left. */
  tone?: "tan" | "gold";
  /** Shown before the text, such as the Away icon. */
  icon?: "away";
  children: ReactNode;
}

/** A short label beside or under a Player name: Host, Away, or Left. */
export default function Tag({ size, tone = "tan", icon, children }: Props) {
  const sizing = size === "lobby"
    ? "h-[22px] gap-1 rounded-[11px] px-[9px] text-xs"
    : "h-[18px] gap-1 rounded-[9px] px-[7px] text-[11px]";
  const background = tone === "gold" ? "bg-ludo-gold" : "bg-ludo-tan";
  return (
    <span className={`flex w-fit flex-none items-center font-bold text-ludo-maroon ${background} ${sizing}`}>
      {icon && <Icon name={icon} size={11} strokeWidth={2.6} />}
      {children}
    </span>
  );
}
