import { track } from "./analytics";
import Button from "./Button";
import { settingsMessages } from "./messages";
import SettingSwitch from "./SettingSwitch";
import { changeSettings, nextTheme, useSettings } from "./settings";

interface Props {
  /** Starts the ids of its labels, which must be unique on the page. */
  idPrefix: string;
}

// The settings, each in a row, drawn on a card: in the Settings dialog in a Game, and on the Settings tab.
export default function SettingsList({ idPrefix }: Props) {
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

  const changeTheme = () => {
    const theme = nextTheme(settings.theme);
    changeSettings({ theme });
    track("theme_change", { theme });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Only on phones: on desktop, the die is always below the Turn status, so this would change nothing. */}
      <SettingSwitch
        id={`${idPrefix}-dice`}
        className="xl:hidden"
        label={settingsMessages.diceOnLeft}
        detail={settingsMessages.diceOnLeftDetail}
        on={diceOnLeft}
        onToggle={toggleDiceOnLeft}
      />
      <SettingSwitch
        id={`${idPrefix}-autoplay`}
        label={settingsMessages.autoplay}
        detail={settingsMessages.autoplayDetail}
        on={autoplay}
        onToggle={toggleAutoplay}
      />
      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span id={`${idPrefix}-theme-label`} className="text-base font-semibold">{settingsMessages.theme}</span>
          <span id={`${idPrefix}-theme-detail`} className="text-[13px] leading-snug text-ludo-ink-muted">
            {settingsMessages.themeDetail}
          </span>
        </div>
        <Button
          variant="outline"
          className="h-10"
          aria-describedby={`${idPrefix}-theme-label ${idPrefix}-theme-detail`}
          onClick={changeTheme}
        >
          {settingsMessages.changeTheme}
        </Button>
      </div>
    </div>
  );
}
