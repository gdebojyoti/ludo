import { useState } from "react";
import { Heart, House, Lock, LogOut, Shirt, Swords, Trophy, type LucideIcon } from "lucide-react";
import { signOut } from "./accounts";
import { track } from "./analytics";
import { initial } from "./Avatar";
import Button from "./Button";
import Icon from "./Icon";
import { modeMessages, profileMessages } from "./messages";
import { placeholderProfile, type StatsMode } from "./profilePlaceholder";
import { seatView } from "./seatView";

interface Props {
  playerName: string;
}

// The viewer's own colour, as their Seat is on every Board they see.
const ownColours = seatView(0);

// Each placeholder Achievement's icon, until #65 settles the list.
const achievementIcons: Record<string, LucideIcon> = { firstWin: Trophy, allFourHome: House, tenCaptures: Swords };

const statsModes: { mode: StatsMode; name: string }[] = [
  { mode: "classic", name: modeMessages.modes.classic.name },
  { mode: "oneKillWin", name: modeMessages.modes.oneKillWin.name },
  { mode: "houseRules", name: profileMessages.houseRules },
];

// What's on a signed-in Player's Profile, below its title: on the Profile tab on phones, and in the Profile dialog on
// desktop. From placeholder data for now (profilePlaceholder.ts), but for their Player name.
export default function AccountProfile({ playerName }: Props) {
  const profile = placeholderProfile;
  const [statsMode, setStatsMode] = useState<StatsMode>("classic");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const stats = profile.stats[statsMode];

  const startSignOut = async () => {
    setSigningOut(true);
    setSignOutFailed(false);
    track("sign_out");
    try {
      // The page reloads, so it stays busy.
      await signOut();
    } catch {
      setSigningOut(false);
      setSignOutFailed(true);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-center gap-2.5 text-center">
        {/* In its frame, a Cosmetic, here the placeholder's. */}
        <span className="relative flex size-[92px] flex-none items-center justify-center">
          <svg className="absolute inset-0 size-full" viewBox="0 0 48 48" aria-hidden>
            <circle cx="24" cy="24" r="22.6" fill="none" stroke="#8e97a3" strokeWidth="1.4" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="#8e97a3" strokeWidth="1.4" />
          </svg>
          <span
            className="flex size-[72px] items-center justify-center rounded-full border-[3px] border-ludo-card
                font-ludo-display text-[30px]"
            style={{ background: ownColours.colour, color: ownColours.textColour }}
            aria-hidden
          >
            {initial(playerName)}
          </span>
        </span>
        <div className="flex flex-col items-center gap-1">
          <h2 className="m-0 inline-flex items-center gap-2 font-ludo-display text-[26px] font-normal wrap-anywhere">
            {playerName}
            {profile.supporter && (
              <span
                className="flex size-5 flex-none items-center justify-center rounded-full bg-[#b0417a] text-[#fff8e8]"
                role="img"
                aria-label={profileMessages.supporter}
                title={profileMessages.supporter}
              >
                <Heart size={11} fill="currentColor" strokeWidth={0} aria-hidden />
              </span>
            )}
          </h2>
          <span className="text-xs font-bold tracking-[0.12em] text-ludo-accent-light uppercase">{profile.title}</span>
        </div>
        <div className="mt-1.5 flex w-full flex-col gap-[7px]">
          <div className="flex items-center justify-between gap-3">
            <span
              className="inline-flex h-[22px] items-center rounded-full bg-ludo-accent-light/14 px-[9px] text-xs font-bold
                  text-ludo-accent-light shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-ludo-accent-light)_55%,transparent)]"
            >
              {profileMessages.level(profile.level)}
            </span>
            <span className="text-xs text-ludo-on-page-muted">
              {profileMessages.xp(profile.xp, profile.xpForNextLevel, profile.level)}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded bg-ludo-on-page/14"
            role="img"
            aria-label={profileMessages.xpLabel(profile.xp, profile.xpForNextLevel, profile.level)}
          >
            <div
              className="h-full rounded bg-ludo-accent-light"
              style={{ width: `${(profile.xp / profile.xpForNextLevel) * 100}%` }}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-xs font-bold tracking-[0.12em] text-ludo-on-page-muted uppercase">
          {profileMessages.statsHeading}
        </h2>
        <div
          className="grid grid-cols-3 rounded-xl border border-ludo-row-line bg-ludo-row p-1"
          role="group"
          aria-label={profileMessages.statsModes}
        >
          {statsModes.map(({ mode, name }) => (
            <button
              key={mode}
              type="button"
              className={`h-9 cursor-pointer rounded-[9px] px-1 text-[13px] font-semibold ${
                  mode === statsMode ? "bg-ludo-card text-ludo-ink" : "text-ludo-on-page-muted"
                }`}
              aria-pressed={mode === statsMode}
              onClick={() => setStatsMode(mode)}
            >
              {name}
            </button>
          ))}
        </div>
        <dl className="m-0 grid grid-cols-2 gap-2.5">
          {([
            [profileMessages.played, stats.played],
            [profileMessages.won, stats.won],
            [profileMessages.captures, stats.captures],
            [profileMessages.tokensHome, stats.tokensHome],
          ] satisfies [string, number][]).map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse gap-0.5 rounded-[14px] bg-ludo-row px-3.5 py-3">
              <dt className="text-xs text-ludo-on-page-muted">{label}</dt>
              <dd className="m-0 font-ludo-display text-[28px] leading-[1.1]">{value.toLocaleString("en")}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-xs font-bold tracking-[0.12em] text-ludo-on-page-muted uppercase">
          {profileMessages.achievementsHeading(profile.achievementsEarned, profile.achievementsTotal)}
        </h2>
        <ul className="m-0 grid list-none grid-cols-4 gap-2 p-0">
          {profile.achievements.map(({ id, name, earned }) => {
            const AchievementIcon = achievementIcons[id];
            return (
              <li key={id} className="flex min-w-0 flex-col items-center gap-2 text-center">
                {earned && AchievementIcon
                  ? (
                      <span className="flex size-14 items-center justify-center rounded-full bg-ludo-accent-light text-ludo-ink">
                        <AchievementIcon size={26} strokeWidth={1.9} aria-hidden />
                      </span>
                    )
                  : (
                      <span
                        className="flex size-14 items-center justify-center rounded-full border-2 border-dashed
                        border-ludo-on-page/30 text-ludo-on-page/45"
                        role="img"
                        aria-label={profileMessages.notEarned}
                      >
                        <Lock size={22} aria-hidden />
                      </span>
                    )}
                <span className={`text-xs leading-[1.3] ${earned ? "" : "text-ludo-page-line"}`}>{name}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="m-0 text-xs font-bold tracking-[0.12em] text-ludo-on-page-muted uppercase">
          {profileMessages.rivalsHeading}
        </h2>
        <ul className="m-0 list-none rounded-[18px] border border-ludo-row-line bg-ludo-row px-4 py-1">
          {profile.rivals.map(({ playerName: rivalName, seat, wins, losses }) => {
            const colours = seatView(seat);
            return (
              <li
                key={rivalName}
                className="flex items-center gap-3 border-ludo-on-page/12 py-2.5 not-first:border-t"
              >
                <span
                  className="flex size-9 flex-none items-center justify-center rounded-full border-2 border-ludo-card
                      font-ludo-display text-[15px]"
                  style={{ background: colours.colour, color: colours.textColour }}
                  aria-hidden
                >
                  {initial(rivalName)}
                </span>
                <span className="min-w-0 flex-1 text-[15px] font-semibold wrap-anywhere">{rivalName}</span>
                <span className="flex-none text-[13px] text-ludo-on-page-muted">
                  {profileMessages.record(wins, losses)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex items-center gap-3.5 rounded-[18px] border border-ludo-row-line bg-ludo-row p-4">
        <span
          className="flex size-10 flex-none items-center justify-center rounded-xl bg-ludo-accent-light/14
              text-ludo-accent-light"
        >
          <Shirt size={22} strokeWidth={1.9} aria-hidden />
        </span>
        <span className="flex flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-bold">{profileMessages.locker}</span>
          <span className="text-[13px] text-ludo-on-page-muted">{profileMessages.lockerDetail(profile.cosmetics)}</span>
        </span>
      </div>

      <div className="flex flex-col items-start gap-2">
        <Button
          variant="icon"
          className="h-12 w-auto gap-2 px-5 text-base font-semibold text-ludo-on-page"
          disabled={signingOut}
          onClick={startSignOut}
        >
          <LogOut size={18} aria-hidden />
          {profileMessages.signOut}
        </Button>
        {signOutFailed && (
          <p className="m-0 flex items-start gap-2 text-[13px] leading-[1.4] text-ludo-on-page-muted" role="alert">
            <Icon name="error" size={16} strokeWidth={2.2} className="mt-px flex-none" />
            <span>{profileMessages.signOutFailed}</span>
          </p>
        )}
      </div>
    </div>
  );
}
