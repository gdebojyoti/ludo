import Coin from "./Coin";
import { profileMessages } from "./messages";
import { placeholderProfile, showPlaceholderProfile } from "./profilePlaceholder";

// The Player's Coins, beside the Profile's title, from placeholder data for now (profilePlaceholder.ts): none while the
// placeholder is switched off.
export default function CoinBalance() {
  if (!showPlaceholderProfile) return null;
  const { coins } = placeholderProfile;
  return (
    <span
      className="inline-flex h-9 items-center gap-2 rounded-full bg-ludo-on-page/8 pr-3.5 pl-[9px] text-[15px] font-bold
        shadow-[inset_0_0_0_1px_var(--color-ludo-row-line)]"
    >
      <Coin size={20} />
      <span aria-hidden>{coins.toLocaleString("en")}</span>
      <span className="sr-only">{profileMessages.coins(coins)}</span>
    </span>
  );
}
