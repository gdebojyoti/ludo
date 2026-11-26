import type { ReactNode } from "react";
import Button from "./Button";
import Header from "./Header";
import { tabMessages } from "./messages";

interface Props {
  title: string;
  /** On the right of the title, such as the Coins. */
  aside?: ReactNode;
  /** Back to the Start screen, on desktop, which has no tabs to go back with. */
  onBack: () => void;
  children: ReactNode;
}

// A tab's screen, other than Play's: the header, with its title, and no Settings, as that's a tab, and what's on it
// below. Desktop has no tabs, but if the window is widened with one open, the header is the bar across the window,
// with the title beside the wordmark and Back on the right, and the rest is a phone-width column down the middle.
export default function TabScreen({ title, aside, onBack, children }: Props) {
  return (
    <div className="flex flex-1 flex-col gap-[22px] px-4 pt-3.5 pb-7 xl:gap-0 xl:p-0">
      <Header
        title={title}
        subtitle={title}
        settings="never"
        action={
          <>
            {aside}
            <div className="hidden xl:block">
              <Button variant="icon" className="h-12 w-auto px-5 text-base font-semibold text-ludo-on-page" onClick={onBack}>
                {tabMessages.back}
              </Button>
            </div>
          </>
        }
      />
      <div className="flex flex-1 flex-col xl:mx-auto xl:w-full xl:max-w-[430px] xl:px-4 xl:pt-8 xl:pb-7">{children}</div>
    </div>
  );
}
