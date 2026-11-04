import Icon from "./Icon";
import { commonMessages } from "./messages";

interface Props {
  /** The Lobby's larger size, or the Player cards' smaller one. */
  size: "lobby" | "card";
}

/** Marks a Player who is Away: in the Game, with no tab connected right now. */
export default function AwayTag({ size }: Props) {
  const sizing = size === "lobby"
    ? "h-[22px] gap-1 rounded-[11px] px-[9px] text-xs"
    : "h-[18px] gap-1 rounded-[9px] px-[7px] text-[11px]";
  return (
    <span className={`flex w-fit flex-none items-center bg-tan font-bold text-maroon ${sizing}`}>
      <Icon name="away" size={11} strokeWidth={2.6} />
      {commonMessages.away}
    </span>
  );
}
