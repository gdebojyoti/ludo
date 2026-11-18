import { useId, type ReactNode, type RefObject } from "react";
import Icon, { type IconName } from "./Icon";

interface Props {
  /** For the button that opens it to call showModal() on. */
  ref: RefObject<HTMLDialogElement | null>;
  /** Shown large, in a circle above the title. */
  icon: IconName;
  title: string;
  /** Below the title. */
  children: ReactNode;
}

// The card that Leave's question and Settings open in, in the middle of the screen over a scrim. A tap on the scrim,
// outside the card, closes it, as does Escape.
export default function DialogCard({ ref, icon, title, children }: Props) {
  const titleId = useId();

  return (
    <dialog
      ref={ref}
      className="ludo-dialog m-auto w-[calc(100%-48px)] max-w-[342px] rounded-[22px] bg-ludo-ivory px-[22px] pt-7 pb-[22px]
        font-ludo-ui text-ludo-maroon shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      aria-labelledby={titleId}
      onClick={(event) => event.target === ref.current && ref.current.close()}
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col items-center gap-3.5">
          <span className="flex size-16 items-center justify-center rounded-full bg-ludo-parchment">
            <Icon name={icon} size={28} />
          </span>
          <h2 id={titleId} className="m-0 text-center font-ludo-display text-[26px] font-normal">{title}</h2>
        </div>
        {children}
      </div>
    </dialog>
  );
}
