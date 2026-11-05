import { useRef, type FormEvent } from "react";
import Icon from "./Icon";
import { modeMessages, startMessages } from "./messages";

interface Props {
  disabled: boolean;
  onCreateGame: () => void;
}

/** The Game modes the Host can choose from, of which only Classic is played yet. */
const modes = [
  { value: "classic", icon: "classic", available: true },
  { value: "quick", icon: "quick", available: false },
  { value: "one-kill", icon: "oneKill", available: false },
] as const;

// Create a game asks for the Game mode first, in a sheet over the Start screen. A tap on the scrim, outside the sheet,
// or Escape closes it without creating a Game.
export default function CreateGameButton({ disabled, onCreateGame }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const createGame = (event: FormEvent) => {
    event.preventDefault();
    dialogRef.current?.close();
    onCreateGame();
  };

  return (
    <>
      <button
        type="button"
        className="ludo-button-maroon"
        disabled={disabled}
        onClick={() => dialogRef.current?.showModal()}
      >
        {startMessages.createGame}
      </button>
      <dialog
        ref={dialogRef}
        className="ludo-dialog mx-auto mt-auto mb-0 w-full max-w-[430px] bg-transparent p-0 font-ludo-ui
          motion-safe:animate-ludo-sheet-in"
        aria-labelledby="mode-title"
        onClick={(event) => event.target === dialogRef.current && dialogRef.current.close()}
      >
        <form
          className="flex flex-col gap-3.5 rounded-t-[28px] bg-ludo-ivory px-6 pt-2.5 pb-9 text-ludo-maroon"
          onSubmit={createGame}
        >
          <span className="h-1 w-10 self-center rounded-xs bg-ludo-notice-line" aria-hidden />
          <div>
            <h2 id="mode-title" className="m-0 font-ludo-display text-[26px] font-normal">{modeMessages.title}</h2>
            <p className="mt-1 mb-0 text-[13px] text-ludo-brown">{modeMessages.subtitle}</p>
          </div>
          <fieldset className="m-0 flex flex-col border-none p-0">
            <legend className="sr-only">{modeMessages.legend}</legend>
            <span id="mode-soon-note" className="sr-only">{modeMessages.soonNote}</span>
            {modes.map(({ value, icon, available }) => (
              <label
                key={value}
                className={`group flex items-center gap-3.5 border-t border-ludo-die-shade px-1 py-4 text-ludo-maroon
                  first-of-type:border-t-0 ${available ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`flex size-10 flex-none items-center justify-center rounded-full ${
                    available
                      ? "bg-ludo-parchment text-ludo-maroon group-has-checked:bg-ludo-maroon group-has-checked:text-ludo-gold-light"
                      : "bg-ludo-notice text-ludo-tan-border"
                  }`}
                  aria-hidden
                >
                  <Icon name={icon} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`text-[16px] ${available ? "font-bold" : "font-semibold text-ludo-brown"}`}>
                      {modeMessages.modes[value].name}
                    </span>
                    {!available && (
                      <span
                        className="inline-flex h-5 items-center rounded-[10px] bg-ludo-parchment px-2 text-[11px] font-bold
                          tracking-[0.04em] text-ludo-brown"
                      >
                        {modeMessages.soon}
                      </span>
                    )}
                  </span>
                  <span className="text-[13px] leading-[1.4] text-ludo-brown">{modeMessages.modes[value].description}</span>
                </span>
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  className={`m-0 size-[22px] flex-none appearance-none rounded-full border-2 focus-visible:outline-2
                    focus-visible:outline-offset-3 focus-visible:outline-ludo-gold ${
                      available
                        ? `cursor-pointer border-ludo-tan-border bg-ludo-ivory checked:border-ludo-maroon
                          checked:bg-[radial-gradient(circle,var(--color-ludo-maroon)_0_5px,var(--color-ludo-ivory)_5.5px)]`
                        : "cursor-default border-ludo-notice-line bg-ludo-notice"
                    }`}
                  defaultChecked={value === "classic"}
                  disabled={!available}
                  aria-describedby={available ? undefined : "mode-soon-note"}
                />
              </label>
            ))}
          </fieldset>
          <button type="submit" className="ludo-button-maroon" disabled={disabled}>{modeMessages.createGame}</button>
        </form>
      </dialog>
    </>
  );
}
