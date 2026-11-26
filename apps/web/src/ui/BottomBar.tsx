import type { ReactNode } from "react";

interface Props {
  /** Its pull into the screen's bottom padding, which it takes into itself to reach the bottom edge, such as -mb-8. */
  className: string;
  children: ReactNode;
}

// The gold button at the bottom of a screen, and anything with it. On phones, it stays in view at the bottom of the
// screen while the rest scrolls, in a bar across the screen that blurs what scrolls under it, with 16px all round. On
// desktop, it stays where it is in the layout.
export default function BottomBar({ className, children }: Props) {
  return (
    <div
      className={`sticky bottom-0 -mx-4 flex flex-col gap-2.5 self-stretch bg-ludo-page/60 p-4 backdrop-blur-md xl:static
        xl:m-0 xl:bg-transparent xl:p-0 xl:backdrop-blur-none ${className}`}
    >
      {children}
    </div>
  );
}
