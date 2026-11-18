import { useRef } from "react";
import Icon from "./Icon";

/** What the Leave button and its question say, which depends on what Leaving does there. */
export interface LeaveText {
  /** The button's label for screen readers on phones, where it's only an icon, and its tooltip. */
  label: string;
  /** The button's text on desktop, beside its icon. */
  button: string;
  title: string;
  /** What Leaving does. */
  message: string;
  stay: string;
  leave: string;
}

interface Props {
  disabled: boolean;
  text: LeaveText;
  onLeave: () => void;
}

// Leave always asks first, so a misclick can't take the Player out, cancel the Game, or forfeit it. Staying is the
// first choice, so it's the one a stray tap or Enter lands on.
export default function LeaveButton({ disabled, text, onLeave }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const leave = () => {
    dialogRef.current?.close();
    onLeave();
  };

  return (
    <>
      {/* Only an icon on phones; on desktop, an icon and its text, as the design has room for it. */}
      <button
        type="button"
        className="ludo-button-icon text-ludo-ivory xl:h-12 xl:w-auto xl:gap-2 xl:px-5 xl:text-base xl:font-semibold"
        title={text.label}
        onClick={() => dialogRef.current?.showModal()}
      >
        <Icon name="leave" className="xl:size-4.5" />
        <span className="sr-only xl:hidden">{text.label}</span>
        <span className="hidden xl:inline">{text.button}</span>
      </button>
      <dialog
        ref={dialogRef}
        className="ludo-dialog m-auto w-[calc(100%-48px)] max-w-[342px] rounded-[22px] bg-ludo-ivory px-[22px] pt-7 pb-[22px]
          font-ludo-ui text-ludo-maroon shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        aria-labelledby="leave-title"
        // A tap on the scrim, outside the card, is a choice to stay.
        onClick={(event) => event.target === dialogRef.current && dialogRef.current.close()}
      >
        <div className="flex flex-col items-center gap-3.5 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-ludo-parchment">
            <Icon name="leave" size={28} />
          </span>
          <h2 id="leave-title" className="m-0 font-ludo-display text-[26px] font-normal">{text.title}</h2>
          <p className="m-0 text-[15px] leading-normal text-ludo-brown">{text.message}</p>
          <div className="mt-2 flex w-full flex-col gap-2.5">
            <button type="button" className="ludo-button-maroon" onClick={() => dialogRef.current?.close()}>
              {text.stay}
            </button>
            <button type="button" className="ludo-button-danger" disabled={disabled} onClick={leave}>
              {text.leave}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
