import { useRef } from "react";
import { track } from "./analytics";
import Button from "./Button";
import DialogCard from "./DialogCard";
import Icon from "./Icon";
import { settingsMessages } from "./messages";
import SettingSwitch from "./SettingSwitch";
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
  const { diceOnLeft, autoplay } = settings;

  const toggleDiceOnLeft = () => {
    changeSettings({ diceOnLeft: !diceOnLeft });
    track("dice_side_change", { on_left: !diceOnLeft });
  };

  const toggleAutoplay = () => {
    changeSettings({ autoplay: !autoplay });
    track("automatic_move_change", { on: !autoplay });
  };

  const open = () => {
    dialogRef.current?.showModal();
    track("settings_open");
  };

  const changeTheme = () => {
    const theme = nextTheme(settings.theme);
    changeSettings({ theme });
    track("theme_change", { theme });
  };

  return (
    <>
      <Button
        variant="icon"
        className={`xl:h-12 xl:w-auto xl:gap-2 xl:px-5 xl:text-base xl:font-semibold ${colours}`}
        title={settingsMessages.label}
        onClick={open}
      >
        <Icon name="settings" className="xl:size-4.5" />
        <span className="sr-only xl:hidden">{settingsMessages.label}</span>
        <span className="hidden xl:inline">{settingsMessages.button}</span>
      </Button>
      <DialogCard ref={dialogRef} icon="settings" title={settingsMessages.title}>
        <div className="mt-1.5 flex flex-col gap-5">
          {/* Only on phones: on desktop, the die is always below the Turn status, so this would change nothing. */}
          <SettingSwitch
            id="settings-dice"
            className="xl:hidden"
            label={settingsMessages.diceOnLeft}
            detail={settingsMessages.diceOnLeftDetail}
            on={diceOnLeft}
            onToggle={toggleDiceOnLeft}
          />
          <SettingSwitch
            id="settings-autoplay"
            label={settingsMessages.autoplay}
            detail={settingsMessages.autoplayDetail}
            on={autoplay}
            onToggle={toggleAutoplay}
          />
          <div className="flex items-center gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span id="settings-theme-label" className="text-base font-semibold">{settingsMessages.theme}</span>
              <span id="settings-theme-detail" className="text-[13px] leading-snug text-ludo-ink-muted">
                {settingsMessages.themeDetail}
              </span>
            </div>
            <Button
              variant="outline"
              className="h-10"
              aria-describedby="settings-theme-label settings-theme-detail"
              onClick={changeTheme}
            >
              {settingsMessages.changeTheme}
            </Button>
          </div>
          <Button variant="solid" className="mt-2" onClick={() => dialogRef.current?.close()}>
            {settingsMessages.done}
          </Button>
        </div>
      </DialogCard>
    </>
  );
}
