import { useRef } from "react";
import Button from "./Button";
import DialogCard from "./DialogCard";
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
      <Button
        variant="icon"
        className="text-ludo-on-page xl:h-12 xl:w-auto xl:gap-2 xl:px-5 xl:text-base xl:font-semibold"
        title={text.label}
        onClick={() => dialogRef.current?.showModal()}
      >
        <Icon name="leave" className="xl:size-4.5" />
        <span className="sr-only xl:hidden">{text.label}</span>
        <span className="hidden xl:inline">{text.button}</span>
      </Button>
      {/* A tap on the scrim, outside the card, is a choice to stay. */}
      <DialogCard ref={dialogRef} icon="leave" title={text.title}>
        <p className="m-0 text-center text-[15px] leading-normal text-ludo-ink-muted">{text.message}</p>
        <div className="mt-2 flex flex-col gap-2.5">
          <Button variant="solid" onClick={() => dialogRef.current?.close()}>
            {text.stay}
          </Button>
          <Button variant="danger" disabled={disabled} onClick={leave}>
            {text.leave}
          </Button>
        </div>
      </DialogCard>
    </>
  );
}
