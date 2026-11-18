import type { ReactNode } from "react";
import { useSettings } from "./settings";
import SnowTrees from "./SnowTrees";

/** A snowflake's six arms, each with a pair of branches, centred on (x, y) and r across from the middle. */
const flake = (x: number, y: number, r: number, colour: string, width: number) => (
  <g key={`${x},${y}`} transform={`translate(${x} ${y})`} stroke={colour} strokeWidth={width} strokeLinecap="round">
    {[0, 60, 120].map((angle) => <line key={angle} y1={-r} y2={r} transform={`rotate(${angle})`} />)}
    {[0, 60, 120, 180, 240, 300].flatMap((angle) => [-1, 1].map((side) => (
      <line
        key={`${angle},${side}`}
        x1={side * 0.343 * r}
        y1={-0.75 * r}
        y2={-0.443 * r}
        transform={`rotate(${angle})`}
      />
    )))}
  </g>
);

// The two layers of snow, each a 150px tile repeated across the screen: far off, specks that fall slowly; nearer,
// snowflakes that fall faster.
const farSnow = [[50, 48, 1.6], [120, 60, 1.3], [36, 78, 1.2], [104, 140, 1.5], [140, 32, 1.1], [62, 128, 1.2],
  [8, 60, 1.3], [86, 40, 1], [20, 10, 1.1], [132, 98, 1.2]].map(([cx, cy, r]) => (
  <circle key={`${cx},${cy}`} cx={cx} cy={cy} r={r} fill="#2e4a77" />
));
const nearSnow = [
  flake(22, 26, 7, "#22395f", 1.4),
  flake(98, 18, 4, "#2e4a77", 1.2),
  flake(70, 84, 9, "#22395f", 1.5),
  flake(126, 112, 5, "#2e4a77", 1.2),
  flake(18, 118, 4, "#2e4a77", 1.2),
];

/**
 * A layer of snow, a tile taller than the screen and starting a tile above it, so as it falls by a tile and starts
 * again, there's always snow at the top.
 */
const layer = (id: string, className: string, content: ReactNode) => (
  <svg className={`absolute -top-[150px] left-0 h-[calc(100%+150px)] w-full ${className}`} aria-hidden>
    <defs>
      <pattern id={id} width="150" height="150" patternUnits="userSpaceOnUse">{content}</pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#${id})`} />
  </svg>
);

// In the Christmas theme, behind every screen: snow falling, swaying a little from side to side, and a row of
// snowy trees along the bottom. Still, if the Player's device asks for less motion.
export default function Snowfall() {
  const { theme } = useSettings();
  if (theme !== "christmas") return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -inset-2 motion-safe:animate-ludo-snow-sway">
        {layer("ludo-snow-far", "motion-safe:animate-ludo-snow-far", farSnow)}
        {layer("ludo-snow-near", "motion-safe:animate-ludo-snow-near", nearSnow)}
      </div>
      <SnowTrees className="absolute bottom-0 left-0" />
    </div>
  );
}
