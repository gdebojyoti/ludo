import { useSettings } from "./settings";

// Where each sparkle is in a 390 × 300 area, how far its points reach, and whether it's gold or white.
const sparkles = [[66, 120, 6, true], [300, 190, 4, true], [92, 232, 3.5, false], [352, 148, 3, false]] as const;

/** A four-pointed sparkle, its points curving in to its middle. */
const sparkle = (x: number, y: number, r: number) => {
  const c = r * 0.18;
  return `M${x} ${y - r} Q${x + c} ${y - c} ${x + r} ${y} Q${x + c} ${y + c} ${x} ${y + r} ` +
    `Q${x - c} ${y + c} ${x - r} ${y} Q${x - c} ${y - c} ${x} ${y - r} Z`;
};

// In the Christmas theme, a few sparkles round the Start screen's logo, across the middle of the top of the screen.
export default function Sparkles() {
  const { theme } = useSettings();
  if (theme !== "christmas") return null;
  return (
    <svg
      className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2"
      width="390"
      height="300"
      viewBox="0 0 390 300"
      aria-hidden
    >
      {sparkles.map(([x, y, r, gold]) => (
        <path key={`${x},${y}`} d={sparkle(x, y, r)} className={gold ? "fill-ludo-accent" : "fill-ludo-card"} />
      ))}
    </svg>
  );
}
