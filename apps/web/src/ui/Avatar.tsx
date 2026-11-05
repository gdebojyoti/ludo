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
  style?: CSSProperties;
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
  style: extraStyle,
}: Props) {
  const style: CSSProperties = {
    ...extraStyle,
    ...(colours ? { backgroundColor: colours.colour, color: colours.textColour } : {}),
  };
  // In the Lobby, an Away Player's avatar is only an outline.
  const look = () => {
    if (colours) return `border-2 border-ludo-ivory ${away ? "border-dashed" : ""}`;
    return away ? "border-2 border-dashed border-ludo-tan text-ludo-ivory" : "bg-ludo-ivory text-ludo-maroon";
  };
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-full font-ludo-display font-semibold ${look()} ${
        ringed ? "shadow-[0_0_0_3px_var(--color-ludo-gold)]" : ""
      } ${className}`}
      style={style}
      aria-hidden
    >
      {initial(playerName)}
    </span>
  );
}
