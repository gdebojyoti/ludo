import { useSettings } from "./settings";

// In the Christmas theme, snowy hills that the Start screen's sheet rises out of, in its place of a rounded top: a dark
// hill behind, and in front, one in the sheet's own colour. Along the top of the sheet, which must be positioned.
export default function SnowHills() {
  const { theme } = useSettings();
  if (theme !== "christmas") return null;
  return (
    <svg
      className="pointer-events-none absolute bottom-[calc(100%-1px)] left-0 h-[120px] w-full xl:hidden"
      viewBox="0 0 390 120"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d="M0 120 L0 70 C70 52 130 60 200 72 C270 84 330 58 390 62 L390 120 Z" fill="#15284a" />
      <path
        d="M0 120 L0 98 C48 80 96 82 150 96 C206 110 250 78 312 84 C350 88 372 98 390 92 L390 120 Z"
        className="fill-ludo-card"
      />
    </svg>
  );
}
