import type { ReactNode } from "react";
import Button from "./Button";
import { tabMessages } from "./messages";

interface Props {
  title: string;
  /** On the right of the title, such as the Coins. */
  aside?: ReactNode;
  /** Back to the Start screen, on desktop, which has no tabs to go back with. */
  onBack: () => void;
  children: ReactNode;
}

// A tab's screen, other than Play's: its title along the top, and what's on it below. Desktop has no tabs, but if the
// window is widened with one open, it's a phone-width column down the middle, with Back beside the title.
export default function TabScreen({ title, aside, onBack, children }: Props) {
  return (
    <div className="flex flex-1 flex-col xl:mx-auto xl:w-full xl:max-w-[430px] xl:pt-8">
      <div className="flex h-15 flex-none items-center justify-between gap-3 pr-4 pl-5">
        <h1 className="m-0 font-ludo-display text-[26px] font-normal">{title}</h1>
        <div className="flex items-center gap-3">
          {aside}
          <div className="hidden xl:block">
            <Button variant="icon" className="h-11 w-auto px-5 text-base font-semibold text-ludo-on-page" onClick={onBack}>
              {tabMessages.back}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-5 pt-3 pb-7">{children}</div>
    </div>
  );
}
