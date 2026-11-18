import { useRef, type FormEvent } from "react";
import { isGameMode, type GameMode } from "@ludo/shared";
import Frost from "./Frost";
import Icon from "./Icon";
import { modeMessages, startMessages } from "./messages";

interface Props {
  disabled: boolean;
  onCreateGame: (mode: GameMode) => void;
}

/** The Game modes the Host can choose from, each drawn with the icon of the same name. Quick Game isn't played yet. */
const modes = [
  { mode: "classic", available: true },
  { mode: "oneKillWin", available: true },
  { mode: "quick", available: false },
] as const;

// How a Game mode's option looks, by whether it can be chosen yet.
const availableStyles = {
  label: "cursor-pointer",
  icon: "bg-ludo-card-sunk text-ludo-ink group-has-checked:bg-ludo-ink group-has-checked:text-ludo-accent-light",
  name: "font-bold",
  radio: `cursor-pointer border-ludo-line bg-ludo-card checked:border-ludo-ink
    checked:bg-[radial-gradient(circle,var(--color-ludo-ink)_0_5px,var(--color-ludo-card)_5.5px)]`,
};

const soonStyles = {
  label: "cursor-default",
  icon: "bg-ludo-notice text-ludo-line",
  name: "font-semibold text-ludo-ink-muted",
  radio: "cursor-default border-ludo-notice-line bg-ludo-notice",
};

// Create a game asks for the Game mode first, in a sheet over the Start screen, or on desktop a dialog in the middle of
// it, like Leave's. A tap on the scrim, outside the sheet, or Escape closes it without creating a Game.
export default function CreateGameButton({ disabled, onCreateGame }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const createGame = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Only the Game modes that are available can be checked.
    const mode = new FormData(event.currentTarget).get("mode");
    if (!isGameMode(mode)) return;
    dialogRef.current?.close();
    onCreateGame(mode);
  };

  return (
    <>
      <button
        type="button"
        className="ludo-button-solid"
        disabled={disabled}
        onClick={() => dialogRef.current?.showModal()}
      >
        <Frost />
        {startMessages.createGame}
      </button>
      <dialog
        ref={dialogRef}
        className="ludo-dialog mx-auto mt-auto mb-0 w-full max-w-[430px] bg-transparent p-0 font-ludo-ui
          motion-safe:animate-ludo-sheet-in xl:m-auto xl:w-[calc(100%-48px)] xl:max-w-[420px] xl:rounded-[22px]
          xl:shadow-[0_20px_50px_rgba(0,0,0,0.5)] xl:motion-safe:animate-none"
        aria-labelledby="mode-title"
        onClick={(event) => event.target === dialogRef.current && dialogRef.current.close()}
      >
        {/* The design's text is spaced at the font's normal line height, not the page's. */}
        <form
          className="flex flex-col gap-3.5 rounded-t-[28px] bg-ludo-card px-6 pt-2.5 pb-9 leading-[normal]
            text-ludo-ink xl:rounded-[22px] xl:pt-7 xl:pb-6"
          onSubmit={createGame}
        >
          {/* A sheet's handle, which a dialog doesn't have. */}
          <span className="h-1 w-10 self-center rounded-xs bg-ludo-notice-line xl:hidden" aria-hidden />
          <div>
            <h2 id="mode-title" className="m-0 font-ludo-display text-[26px] font-normal">{modeMessages.title}</h2>
            <p className="mt-1 mb-0 text-[13px] text-ludo-ink-muted">{modeMessages.subtitle}</p>
          </div>
          <fieldset className="m-0 flex flex-col border-none p-0">
            <legend className="sr-only">{modeMessages.legend}</legend>
            <span id="mode-soon-note" className="sr-only">{modeMessages.soonNote}</span>
            {modes.map(({ mode, available }) => {
              const styles = available ? availableStyles : soonStyles;
              return (
                <label
                  key={mode}
                  className={`group flex items-center gap-3.5 border-t border-ludo-die-shade px-1 py-4 text-ludo-ink
                    first-of-type:border-t-0 ${styles.label}`}
                >
                  <span
                    className={`flex size-10 flex-none items-center justify-center rounded-full ${styles.icon}`}
                    aria-hidden
                  >
                    <Icon name={mode} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`text-[16px] ${styles.name}`}>{modeMessages.modes[mode].name}</span>
                      {!available && (
                        <span
                          className="inline-flex h-5 items-center rounded-[10px] bg-ludo-card-sunk px-2 text-[11px]
                            font-bold tracking-[0.04em] text-ludo-ink-muted"
                        >
                          {modeMessages.soon}
                        </span>
                      )}
                    </span>
                    <span className="text-[13px] leading-[1.4] text-ludo-ink-muted">
                      {modeMessages.modes[mode].description}
                    </span>
                  </span>
                  <input
                    type="radio"
                    name="mode"
                    value={mode}
                    className={`m-0 size-[22px] flex-none appearance-none rounded-full border-2 focus-visible:outline-2
                      focus-visible:outline-offset-3 focus-visible:outline-ludo-accent ${styles.radio}`}
                    defaultChecked={mode === "classic"}
                    disabled={!available}
                    aria-describedby={available ? undefined : "mode-soon-note"}
                  />
                </label>
              );
            })}
          </fieldset>
          <button type="submit" className="ludo-button-solid" disabled={disabled}>
            <Frost />
            {modeMessages.createGame}
          </button>
        </form>
      </dialog>
    </>
  );
}
