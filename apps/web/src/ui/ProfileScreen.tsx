import AccountProfile from "./AccountProfile";
import CoinBalance from "./CoinBalance";
import GuestProfile from "./GuestProfile";
import { tabMessages } from "./messages";
import TabScreen from "./TabScreen";

interface Props {
  playerName: string;
  /** Whether the Player is signed in to an Account; undefined until the server says. */
  signedIn: boolean | undefined;
  onBack: () => void;
}

// The Profile tab, on phones: for a Guest, what signing in gets them; for a Player signed in to an Account, their
// Profile. Empty until the server says which. On desktop, a signed-in Player's Profile opens in a dialog instead
// (ProfileButton.tsx).
export default function ProfileScreen({ playerName, signedIn, onBack }: Props) {
  if (signedIn === undefined) return <TabScreen title={tabMessages.tabs.profile} onBack={onBack}>{null}</TabScreen>;
  if (!signedIn) return <GuestProfile playerName={playerName} onBack={onBack} />;
  return (
    <TabScreen title={tabMessages.tabs.profile} aside={<CoinBalance />} onBack={onBack}>
      <AccountProfile playerName={playerName} />
    </TabScreen>
  );
}
