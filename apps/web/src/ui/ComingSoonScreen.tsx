import Button from "./Button";
import { tabMessages } from "./messages";
import type { Tab } from "./NavBar";

interface Props {
  tab: Exclude<Tab, "play">;
  /** Back to the Start screen, on desktop, which has no tabs to go back with. */
  onBack: () => void;
}

// A tab whose screen isn't built yet. On desktop, only Profile opens it, from the Start screen.
export default function ComingSoonScreen({ tab, onBack }: Props) {
  return (
    <div className="flex flex-1 flex-col gap-6 px-5 pt-4 pb-8 xl:mx-auto xl:w-full xl:max-w-[430px] xl:pt-12">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h1 className="m-0 font-ludo-display text-[26px] font-normal">{tabMessages.tabs[tab]}</h1>
        <div className="hidden xl:block">
          <Button variant="icon" className="h-12 w-auto px-5 text-base font-semibold text-ludo-on-page" onClick={onBack}>
            {tabMessages.back}
          </Button>
        </div>
      </div>
      <p className="m-auto text-[15px] text-ludo-on-page-muted">{tabMessages.comingSoon}</p>
    </div>
  );
}
