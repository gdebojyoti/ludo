// The design's line icons, drawn in the current text colour. Each is decorative: what it means is said in text.
const paths = {
  leave: ["M10 4H5v16h5M14 16l4-4-4-4M18 12H9"],
  newName: ["M20 11a8 8 0 0 0-14.3-4.9L4 8", "M4 3v5h5", "M4 13a8 8 0 0 0 14.3 4.9L20 16", "M20 21v-5h-5"],
  share: ["M12 15V3M7 8l5-5 5 5", "M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"],
  copy: ["M11 9h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z", "M5 15V5a1 1 0 0 1 1-1h10"],
  waiting: ["M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9"],
  error: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 7.5v5.5M12 16.5v.01"],
  info: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 11v5.5M12 7.5v.01"],
  away: ["M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"],
  // The Game modes.
  classic: [
    "M7.5 4.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    "M16.5 4.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    "M7.5 13.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    "M16.5 13.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  ],
  quick: ["M13 2.5L4.5 13.5H11L10 21.5l8.5-11H12z"],
  oneKill: [
    "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z",
    "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    "M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4",
  ],
  closedDoor: ["M4 21h16M6 21V4.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1V21", "M14 12.5v.01"],
};

interface Props {
  name: keyof typeof paths;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function Icon({ name, size = 20, strokeWidth = 2, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name].map((path) => <path key={path} d={path} />)}
    </svg>
  );
}
