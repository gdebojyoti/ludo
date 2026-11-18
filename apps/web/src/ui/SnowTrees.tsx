import { useSettings } from "./settings";

interface Props {
  /** Pale, without snow on top, for a light sheet; otherwise dark, with snow on top, for the page. */
  light?: boolean;
  className?: string;
}

// The trees in a 390px stretch, repeated across the screen: where each stands across it, and how tall each of its
// three tiers is.
const trees: [x: number, tier: number][] = [
  [15, 19], [39, 12.4], [59, 24], [85, 14.9], [113, 10.8], [151, 18.2], [179, 25.7], [205, 14.1], [237, 11.6],
  [263, 20.7], [291, 15.7], [319, 27.3], [347, 13.2], [373, 19.9],
];

// Each tier of a tree is a triangle as tall as the tree's tier, set 61% of that above the one below it, and narrower
// as it goes up. The snow on top is the tip of the top tier.
const tierWidths = [1.35, 1.05, 0.76];
const tierStep = 0.61;
const snowDepth = 0.44;

const triangle = (x: number, base: number, top: number, halfWidth: number) =>
  `${x - halfWidth},${base} ${x + halfWidth},${base} ${x},${top}`;

/** In the Christmas theme, a row of fir trees standing along the bottom edge, as a backdrop. */
export default function SnowTrees({ light = false, className = "" }: Props) {
  const { theme } = useSettings();
  if (theme !== "christmas") return null;
  const height = light ? 72 : 90;
  const id = light ? "ludo-trees-light" : "ludo-trees";
  const shapes = trees.flatMap(([x, tier]) => {
    const tiers = tierWidths.map((width, index) => {
      const base = height - index * tierStep * tier;
      return <polygon key={`${x},${index}`} points={triangle(x, base, base - tier, (width * tier) / 2)} />;
    });
    if (light) return tiers;
    const top = height - (tierWidths.length - 1) * tierStep * tier - tier;
    const snow = triangle(x, top + snowDepth * tier, top, (((tierWidths.at(-1) as number) * tier) / 2) * snowDepth);
    return [...tiers, <polygon key={`${x},snow`} points={snow} fill="#2b4570" />];
  });
  return (
    <svg className={`w-full ${className}`} height={height} aria-hidden>
      <defs>
        <pattern id={id} width="390" height={height} patternUnits="userSpaceOnUse">
          <g fill={light ? "#d5e0ef" : "#15284a"}>{shapes}</g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
