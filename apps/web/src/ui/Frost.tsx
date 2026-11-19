import { useSettings } from "./settings";

interface Props {
  /** Two small snowflakes on the left only, for a white button; otherwise three, sparkling, at both ends. */
  light?: boolean;
}

// The snowflakes at one end of a button, drawn for one 54px high: each flake's arms, then the branches on them.
const flakes = {
  full: {
    arms: "M13 27L13 14M13 27L24.26 20.5M13 27L24.26 33.5M13 27L13 40M13 27L1.74 33.5M13 27L1.74 20.5M38 13L38 7M38 " +
      "13L43.2 10M38 13L43.2 16M38 13L38 19M38 13L32.8 16M38 13L32.8 10M35 42L35 37.5M35 42L38.9 39.75M35 42L38.9 " +
      "44.25M35 42L35 46.5M35 42L31.1 44.25M35 42L31.1 39.75",
    branches: "M13 20.5L10.06 17.56M13 20.5L15.94 17.56M13 16.86L11.16 15.02M13 16.86L14.84 15.02M18.63 23.75L19.71 " +
      "19.73M18.63 23.75L22.65 24.83M21.78 21.93L22.45 19.42M21.78 21.93L24.29 22.6M18.63 30.25L22.65 29.17M18.63 " +
      "30.25L19.71 34.27M21.78 32.07L24.29 31.4M21.78 32.07L22.45 34.58M13 33.5L15.94 36.44M13 33.5L10.06 36.44M13 " +
      "37.14L14.84 38.98M13 37.14L11.16 38.98M7.37 30.25L6.29 34.27M7.37 30.25L3.35 29.17M4.22 32.07L3.55 34.58M4.22 " +
      "32.07L1.71 31.4M7.37 23.75L3.35 24.83M7.37 23.75L6.29 19.73M4.22 21.93L1.71 22.6M4.22 21.93L3.55 19.42M38 " +
      "10L36.64 8.64M38 10L39.36 8.64M38 8.32L37.15 7.47M38 8.32L38.85 7.47M40.6 11.5L41.1 9.65M40.6 11.5L42.45 " +
      "12M42.05 10.66L42.36 9.5M42.05 10.66L43.21 10.97M40.6 14.5L42.45 14M40.6 14.5L41.1 16.35M42.05 15.34L43.21 " +
      "15.03M42.05 15.34L42.36 16.5M38 16L39.36 17.36M38 16L36.64 17.36M38 17.68L38.85 18.53M38 17.68L37.15 " +
      "18.53M35.4 14.5L34.9 16.35M35.4 14.5L33.55 14M33.95 15.34L33.64 16.5M33.95 15.34L32.79 15.03M35.4 11.5L33.55 " +
      "12M35.4 11.5L34.9 9.65M33.95 10.66L32.79 10.97M33.95 10.66L33.64 9.5",
  },
  light: {
    arms: "M6 27L6 19.5M6 27L12.5 23.25M6 27L12.5 30.75M6 27L6 34.5M6 27L-0.5 30.75M6 27L-0.5 23.25M19 12L19 9.2M19 " +
      "12L21.42 10.6M19 12L21.42 13.4M19 12L19 14.8M19 12L16.58 13.4M19 12L16.58 10.6",
    branches: "M6 23.25L4.3 21.55M6 23.25L7.7 21.55M6 21.15L4.94 20.09M6 21.15L7.06 20.09M9.25 25.12L9.87 22.81M9.25 " +
      "25.12L11.57 25.75M11.07 24.07L11.45 22.63M11.07 24.07L12.52 24.46M9.25 28.88L11.57 28.25M9.25 28.88L9.87 " +
      "31.19M11.07 29.93L12.52 29.54M11.07 29.93L11.45 31.37M6 30.75L7.7 32.45M6 30.75L4.3 32.45M6 32.85L7.06 " +
      "33.91M6 32.85L4.94 33.91M2.75 28.88L2.13 31.19M2.75 28.88L0.43 28.25M0.93 29.93L0.55 31.37M0.93 29.93L-0.52 " +
      "29.54M2.75 25.12L0.43 25.75M2.75 25.12L2.13 22.81M0.93 24.07L-0.52 24.46M0.93 24.07L0.55 22.63",
  },
};

// Where a full end's sparkles are, at the tips of its flakes, and when each starts, so they take turns.
const sparkles = [[13, 14, "0s"], [38, 7, "1.6s"], [35, 37.5, "3s"]] as const;

// In the Christmas theme, snowflakes frosting the ends of a button, behind its text, coloured for the button in
// ludo.css. Drawn by Button, whose ludo-button- class keeps them behind the text.
export default function Frost({ light = false }: Props) {
  const { theme } = useSettings();
  if (theme !== "christmas") return null;
  const { arms, branches } = light ? flakes.light : flakes.full;

  const end = (mirrored: boolean) => (
    <svg
      className={`absolute top-0 aspect-square h-full overflow-visible ${mirrored ? "right-0 -scale-x-100" : "left-0"}`}
      viewBox="0 0 54 54"
    >
      <path className="ludo-frost-branch" d={branches} />
      <path className="ludo-frost-arm" d={arms} />
      {!light && sparkles.map(([cx, cy, delay]) => (
        <circle
          key={delay}
          className="ludo-frost-sparkle"
          cx={cx}
          cy={cy}
          r="1.7"
          style={{ animationDelay: delay }}
        />
      ))}
    </svg>
  );

  return (
    <span className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" aria-hidden>
      {end(false)}
      {!light && end(true)}
    </span>
  );
}
