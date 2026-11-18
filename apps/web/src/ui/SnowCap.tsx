import { useSettings } from "./settings";

interface Props {
  /** On the logo, scaled with it; otherwise on a card, stretched across it. */
  logo?: boolean;
}

// Snow lying along the top edge of the logo or a card, and over its corners, with drips hanging below it.
const logoSnow = "M-1.2 32.3 C-1.2 16.7 5.7 4 26 4 Q38 1 50 4 Q62 3 74 4.8 Q86 1 98 5.6 Q110 3 122 4 Q134 1 146 4.8 " +
  "Q158 3 170 5.6 Q182 1 194 4 C214.3 4 221.2 16.7 221.2 32.3 L217 32.3 C217 20.3 211.7 15 194 15 L181 15 C181 18.5 " +
  "178.5 20 176 20 C173.5 20 171 18.5 171 15 L155 15 C155 22 152.5 25 150 25 C147.5 25 145 22 145 15 L57 15 C57 19.9 " +
  "54.5 22 52 22 C49.5 22 47 19.9 47 15 L26 15 C8.3 15 3 20.3 3 32.3 Z";
const cardSnow = "M-1.2 29.2 C-1.2 16 4.8 4 22 4 Q39 1 56 4 Q73 3 90 4.8 Q107 1 124 5.6 Q141 3 158 4 Q175 1 192 4.8 " +
  "Q209 3 226 5.6 Q243 1 260 4 Q277 3 294 4.8 Q311 1 328 5.6 C345.2 4 351.2 16 351.2 29.2 L347 29.2 C347 19 343 15 " +
  "328 15 L289 15 C289 18.5 286.5 20 284 20 C281.5 20 279 18.5 279 15 L243 15 C243 21.3 240.5 24 238 24 C235.5 24 " +
  "233 21.3 233 15 L69 15 C69 19.2 66.5 21 64 21 C61.5 21 59 19.2 59 15 L22 15 C7 15 3 19 3 29.2 Z";

// In the Christmas theme, snow on top of the logo or a card. Inside it, which must be positioned.
export default function SnowCap({ logo = false }: Props) {
  const { theme } = useSettings();
  if (theme !== "christmas") return null;
  if (logo) {
    return (
      <svg
        className="pointer-events-none absolute -top-[6.4%] -left-[1.8%] z-[2] w-[101.8%] overflow-visible"
        viewBox="-2 0 224 44"
        aria-hidden
      >
        <path d={logoSnow} className="fill-ludo-card" />
      </svg>
    );
  }
  // A shadow below it, so it stands out from the card.
  return (
    <svg
      className="pointer-events-none absolute -top-3 -left-0.5 h-12 w-[calc(100%+4px)] overflow-visible"
      viewBox="-2 0 354 48"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={cardSnow} fill="#c9d6ea" transform="translate(0 2)" />
      <path d={cardSnow} fill="#ffffff" />
    </svg>
  );
}
