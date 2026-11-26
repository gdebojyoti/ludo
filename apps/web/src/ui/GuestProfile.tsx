import { Podium, Shirt, Smartphone, Users, type LucideIcon } from "lucide-react";
import { initial } from "./Avatar";
import Coin from "./Coin";
import { profileMessages, tabMessages } from "./messages";
import { seatView } from "./seatView";
import SignIn from "./SignIn";
import SnowCap from "./SnowCap";
import TabScreen from "./TabScreen";

interface Props {
  playerName: string;
  onBack: () => void;
}

// The viewer's own colour, as their Seat is on every Board they see.
const ownColours = seatView(0);

// What a Guest gets by signing in, each with its icon.
const perks: { text: string; icon: LucideIcon | "coin" }[] = [
  { text: profileMessages.perks.coins, icon: "coin" },
  { text: profileMessages.perks.devices, icon: Smartphone },
  { text: profileMessages.perks.leaderboard, icon: Podium },
  { text: profileMessages.perks.rivals, icon: Users },
  { text: profileMessages.perks.locker, icon: Shirt },
];

// A Guest's Profile tab: who they are, and what signing in gets them.
export default function GuestProfile({ playerName, onBack }: Props) {
  return (
    <TabScreen title={tabMessages.tabs.profile} onBack={onBack}>
      <div className="flex flex-col gap-[22px]">
        <div className="flex items-center gap-3.5">
          <span
            className="flex size-14 flex-none items-center justify-center rounded-full border-[3px] border-ludo-card-raised
            font-ludo-display text-2xl"
            style={{ background: ownColours.colour, color: ownColours.textColour }}
            aria-hidden
          >
            {initial(playerName)}
          </span>
          <div className="flex min-w-0 flex-col gap-[3px]">
            <span className="font-ludo-display text-2xl wrap-anywhere">{playerName}</span>
            <span className="text-[13px] text-ludo-on-page-muted">{profileMessages.guest}</span>
          </div>
        </div>
        <section className="relative flex flex-col gap-4 rounded-[22px] bg-ludo-card px-5 pt-[22px] pb-5 text-ludo-ink">
          <SnowCap />
          <h2 className="m-0 font-ludo-display text-[26px] leading-[1.2] font-normal">{profileMessages.signInTitle}</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {perks.map(({ text, icon: PerkIcon }) => (
              <li key={text} className="flex items-start gap-3 text-[15px] leading-[1.4]">
                <span className="flex size-8 flex-none items-center justify-center rounded-[10px] bg-ludo-card-sunk">
                  {PerkIcon === "coin" ? <Coin size={18} /> : <PerkIcon size={18} aria-hidden />}
                </span>
                <span className="pt-[5px]">{text}</span>
              </li>
            ))}
          </ul>
          <SignIn pitch={profileMessages.noPassword} onCard />
        </section>
      </div>
    </TabScreen>
  );
}
