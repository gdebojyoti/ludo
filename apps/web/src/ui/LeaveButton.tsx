import { useRef } from "react";
import Icon from "./Icon";

/** What the Leave button and its question say, which depends on what Leaving does there. */
export interface LeaveText {
  /** The icon button's label, for screen readers. */
  label: string;
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

// Leave always asks first, so a misclick can't take the Player out, cancel the Game, or forfeit it. Leaving is the
// prominent button, as it's what the Player opened the dialog to do, but staying is the first choice, so it's the one
// a stray tap or Enter lands on.
export default function LeaveButton({ disabled, text, onLeave }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const leave = () => {
    dialogRef.current?.close();
    onLeave();
  };

  return (
    <>
      <button
        type="button"
        className="ludo-button-icon text-ludo-ivory"
        aria-label={text.label}
        title={text.label}
        onClick={() => dialogRef.current?.showModal()}
      >
        <Icon name="leave" />
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
            <button
              type="button"
              className="ludo-button-outline h-[54px] w-full"
              onClick={() => dialogRef.current?.close()}
            >
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
