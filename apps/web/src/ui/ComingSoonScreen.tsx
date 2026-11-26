import { tabMessages } from "./messages";
import type { Tab } from "./NavBar";
import TabScreen from "./TabScreen";

interface Props {
  tab: Exclude<Tab, "play">;
  onBack: () => void;
}

// A tab whose screen isn't built yet.
export default function ComingSoonScreen({ tab, onBack }: Props) {
  return (
    <TabScreen title={tabMessages.tabs[tab]} onBack={onBack}>
      <p className="m-auto text-[15px] text-ludo-on-page-muted">{tabMessages.comingSoon}</p>
    </TabScreen>
  );
}
