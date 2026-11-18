import { useRef } from "react";
import DialogCard from "./DialogCard";
import Frost from "./Frost";
import Icon from "./Icon";
import { settingsMessages } from "./messages";
import { changeSettings, nextTheme, useSettings } from "./settings";

interface Props {
  /** Its colours, for what it's drawn on: ivory on the dark background by default. */
  colours?: string;
}

// Beside Leave, on its right, and drawn the same way: only an icon on phones, and an icon and its text on desktop. It
// opens the settings in a card like Leave's question.
export default function SettingsButton({ colours = "text-ludo-on-page" }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const settings = useSettings();
  const { diceOnLeft } = settings;

  const toggleDiceOnLeft = () => changeSettings({ diceOnLeft: !diceOnLeft });

  const changeTheme = () => changeSettings({ theme: nextTheme(settings.theme) });

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
      <DialogCard ref={dialogRef} icon="settings" title={settingsMessages.title}>
        <div className="mt-1.5 flex flex-col gap-5">
          {/* Only on phones: on desktop, the die is always below the Turn status, so this would change nothing. */}
          <div className="flex items-center gap-4 xl:hidden">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span id="settings-dice-label" className="text-base font-semibold">{settingsMessages.diceOnLeft}</span>
              <span id="settings-dice-detail" className="text-[13px] leading-snug text-ludo-ink-muted">
                {settingsMessages.diceOnLeftDetail}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={diceOnLeft}
              aria-labelledby="settings-dice-label"
              aria-describedby="settings-dice-detail"
              className={`relative h-7 w-12 flex-none cursor-pointer rounded-full transition-colors ${
                diceOnLeft ? "bg-ludo-ink" : "bg-ludo-board-line"
              }`}
              onClick={toggleDiceOnLeft}
            >
              <span
                className={`absolute top-1 left-1 size-5 rounded-full bg-ludo-card-raised shadow transition-transform ${
                  diceOnLeft ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span id="settings-theme-label" className="text-base font-semibold">{settingsMessages.theme}</span>
              <span id="settings-theme-detail" className="text-[13px] leading-snug text-ludo-ink-muted">
                {settingsMessages.themeDetail}
              </span>
            </div>
            <button
              type="button"
              className="ludo-button-outline h-10"
              aria-describedby="settings-theme-label settings-theme-detail"
              onClick={changeTheme}
            >
              <Frost light />
              {settingsMessages.changeTheme}
            </button>
          </div>
          <button type="button" className="ludo-button-solid mt-2" onClick={() => dialogRef.current?.close()}>
            <Frost />
            {settingsMessages.done}
          </button>
        </div>
      </DialogCard>
    </>
  );
}
