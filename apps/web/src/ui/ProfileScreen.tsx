import AccountProfile from "./AccountProfile";
import GuestProfile from "./GuestProfile";
import { tabMessages } from "./messages";
import TabScreen from "./TabScreen";

interface Props {
  playerName: string;
  /** Whether the Player is signed in to an Account; undefined until the server says. */
  signedIn: boolean | undefined;
  onBack: () => void;
}

// The Profile tab: for a Guest, what signing in gets them; for a Player signed in to an Account, their Profile. Empty
// until the server says which. On desktop, opened by the Profile button on the Start screen.
export default function ProfileScreen({ playerName, signedIn, onBack }: Props) {
  if (signedIn === undefined) return <TabScreen title={tabMessages.tabs.profile} onBack={onBack}>{null}</TabScreen>;
  if (!signedIn) return <GuestProfile playerName={playerName} onBack={onBack} />;
  return <AccountProfile playerName={playerName} onBack={onBack} />;
}
