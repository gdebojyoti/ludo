interface Props {
  /** As an icon's: 20px unless told. */
  size?: number;
  className?: string;
  /** Taken, as an icon is, so it can stand in a list of them. It's always hidden. */
  "aria-hidden"?: boolean;
}

// The Hexagon Coin, Ludo's currency, from the design (docs/design/ludo-artboards/coin-hexagon.svg). Artwork rather
// than an icon, so not from Lucide. Decorative: the amount beside it says what it is.
export default function Coin({ size = 20, className }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path
        d="M24 2.5L42.62 13.25L42.62 34.75L24 45.5L5.38 34.75L5.38 13.25Z"
        fill="#c98a1e"
        stroke="#4a2e08"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M24 8.5L37.42 16.25L37.42 31.75L24 39.5L10.58 31.75L10.58 16.25Z"
        fill="#f4be3a"
        stroke="#f4be3a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="5.5" fill="#9a5b12" />
    </svg>
  );
}
