import type { CSSProperties } from "react";

interface Props {
  playerName: string;
  /** The Seat's colours, once the Player has one; the Lobby shows them in ivory. */
  colours?: { colour: string; textColour: string };
  /** A gold ring, marking whose Turn it is, or the viewer in the Lobby. */
  ringed?: boolean;
  /** A dashed edge, marking a Player who is Away. */
  away?: boolean;
  className?: string;
}

/** A Player name's first letter, as on an avatar. */
const initial = (playerName: string) => [...playerName.trim()][0]?.toUpperCase() ?? "";

// Decorative: the Player name is always shown beside it.
export default function Avatar({
  playerName,
  colours,
  ringed = false,
  away = false,
  className = "size-9 text-[15px]",
}: Props) {
  const style: CSSProperties = colours
    ? { backgroundColor: colours.colour, color: colours.textColour }
    : {};
  // In the Lobby, an Away Player's avatar is only an outline.
  const look = () => {
    if (colours) return `border-2 border-ivory ${away ? "border-dashed" : ""}`;
    return away ? "border-2 border-dashed border-tan text-ivory" : "bg-ivory text-maroon";
  };
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-full font-display font-semibold ${look()} ${
        ringed ? "shadow-[0_0_0_3px_var(--color-gold)]" : ""
      } ${className}`}
      style={style}
      aria-hidden
    >
      {initial(playerName)}
    </span>
  );
}
