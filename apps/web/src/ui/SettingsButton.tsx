import { useRef } from "react";
import Icon from "./Icon";
import { settingsMessages } from "./messages";
import { changeSettings, nextTheme, useSettings } from "./settings";

interface Props {
  /** Its colours, for what it's drawn on: ivory on the dark background by default. */
  colours?: string;
}

// Beside Leave, on its right, and drawn the same way: only an icon on phones, and an icon and its text on desktop. It
// opens the settings in a card like Leave's question.
export default function SettingsButton({ colours = "text-ludo-ivory" }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const settings = useSettings();
  const { diceOnRight } = settings;

  const toggleDiceOnRight = () => changeSettings({ diceOnRight: !diceOnRight });

  // Nothing draws the theme yet, so changing it is only logged.
  const changeTheme = () => {
    const theme = nextTheme(settings.theme);
    changeSettings({ theme });
    console.log("Theme:", theme);
  };

  return (
    <>
      <button
        type="button"
        className={`ludo-button-icon xl:h-12 xl:w-auto xl:gap-2 xl:px-5 xl:text-base xl:font-semibold ${colours}`}
        title={settingsMessages.label}
        onClick={() => dialogRef.current?.showModal()}
      >
        <Icon name="settings" className="xl:size-4.5" />
        <span className="sr-only xl:hidden">{settingsMessages.label}</span>
        <span className="hidden xl:inline">{settingsMessages.button}</span>
      </button>
      <dialog
        ref={dialogRef}
        className="ludo-dialog m-auto w-[calc(100%-48px)] max-w-[342px] rounded-[22px] bg-ludo-ivory px-[22px] pt-7 pb-[22px]
          font-ludo-ui text-ludo-maroon shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        aria-labelledby="settings-title"
        // A tap on the scrim, outside the card, closes it.
        onClick={(event) => event.target === dialogRef.current && dialogRef.current.close()}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3.5">
            <span className="flex size-16 items-center justify-center rounded-full bg-ludo-parchment">
              <Icon name="settings" size={28} />
            </span>
            <h2 id="settings-title" className="m-0 font-ludo-display text-[26px] font-normal">
              {settingsMessages.title}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span id="settings-dice-label" className="text-base font-semibold">{settingsMessages.diceOnRight}</span>
              <span id="settings-dice-detail" className="text-[13px] leading-snug text-ludo-brown">
                {settingsMessages.diceOnRightDetail}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={diceOnRight}
              aria-labelledby="settings-dice-label"
              aria-describedby="settings-dice-detail"
              className={`relative h-7 w-12 flex-none cursor-pointer rounded-full transition-colors ${
                diceOnRight ? "bg-ludo-maroon" : "bg-ludo-board-line"
              }`}
              onClick={toggleDiceOnRight}
            >
              <span
                className={`absolute top-1 left-1 size-5 rounded-full bg-ludo-cream shadow transition-transform ${
                  diceOnRight ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span id="settings-theme-label" className="text-base font-semibold">{settingsMessages.theme}</span>
              <span id="settings-theme-detail" className="text-[13px] leading-snug text-ludo-brown">
                {settingsMessages.themeDetail}
              </span>
            </div>
            <button
              type="button"
              className="ludo-button-outline h-10"
              aria-describedby="settings-theme-label settings-theme-detail"
              onClick={changeTheme}
            >
              {settingsMessages.changeTheme}
            </button>
          </div>
          <button type="button" className="ludo-button-maroon mt-2" onClick={() => dialogRef.current?.close()}>
            {settingsMessages.done}
          </button>
        </div>
      </dialog>
    </>
  );
}
