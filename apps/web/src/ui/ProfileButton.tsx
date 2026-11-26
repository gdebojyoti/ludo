import { useId, useRef } from "react";
import { User } from "lucide-react";
import AccountProfile from "./AccountProfile";
import { track } from "./analytics";
import Button from "./Button";
import CoinBalance from "./CoinBalance";
import { startMessages } from "./messages";

interface Props {
  playerName: string;
}

// For a signed-in Player, on the desktop Start screen, which has no Profile tab: drawn as Settings is, and opening their
// Profile in a dialog over the screen, on the page's colours, as the tab is on phones. It scrolls inside when it's
// taller than the window. A tap on the scrim, outside it, closes it, as does Escape.
export default function ProfileButton({ playerName }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const open = () => {
    dialogRef.current?.showModal();
    track("profile_open");
  };

  return (
    <>
      <Button
        variant="icon"
        className="h-12 w-auto gap-2 border-ludo-line px-5 text-base font-semibold text-ludo-ink
          [--ludo-button-icon-fill:transparent]"
        onClick={open}
      >
        <User size={18} aria-hidden />
        {startMessages.profile}
      </Button>
      <dialog
        ref={dialogRef}
        className="ludo-dialog m-auto max-h-[calc(100dvh-64px)] w-[430px] max-w-[calc(100%-48px)] overflow-y-auto
          rounded-[22px] bg-ludo-page font-ludo-ui text-ludo-on-page shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        aria-labelledby={titleId}
        onClick={(event) => event.target === dialogRef.current && dialogRef.current.close()}
      >
        <div className="flex h-15 items-center justify-between gap-3 pr-4 pl-5">
          <h2 id={titleId} className="m-0 font-ludo-display text-[26px] font-normal">{startMessages.profile}</h2>
          <CoinBalance />
        </div>
        <div className="px-5 pt-3 pb-7">
          <AccountProfile playerName={playerName} />
        </div>
      </dialog>
    </>
  );
}
