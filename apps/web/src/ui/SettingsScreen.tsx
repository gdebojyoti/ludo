import { Cloud } from "lucide-react";
import { settingsMessages, tabMessages } from "./messages";
import SettingsList from "./SettingsList";
import SnowCap from "./SnowCap";
import TabScreen from "./TabScreen";

interface Props {
  /** Whether the Player is signed in to an Account, whose settings follow it; undefined until the server says. */
  signedIn: boolean | undefined;
  onBack: () => void;
}

// The Settings tab, on phones: the same settings as the dialog in a Game, on a card, and below it, where they're kept.
export default function SettingsScreen({ signedIn, onBack }: Props) {
  return (
    <TabScreen title={tabMessages.tabs.settings} onBack={onBack}>
      <div className="flex flex-col gap-4">
        <section className="relative rounded-[20px] bg-ludo-card p-5 text-ludo-ink">
          <SnowCap />
          <SettingsList idPrefix="settings-tab" />
        </section>
        {signedIn !== undefined && (
          <p className="m-0 flex items-start gap-2.5 px-1 text-[13px] leading-[1.45] text-ludo-on-page-muted">
            <Cloud className="flex-none" aria-hidden />
            <span>{signedIn ? settingsMessages.followsAccount : settingsMessages.keptInBrowser}</span>
          </p>
        )}
      </div>
    </TabScreen>
  );
}
