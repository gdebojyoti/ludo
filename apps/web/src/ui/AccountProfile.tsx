import { Heart, Lock, Shirt } from "lucide-react";
import { initial } from "./Avatar";
import { profileMessages, tabMessages } from "./messages";
import { achievementIcons, placeholderProfile, showPlaceholderProfile } from "./profilePlaceholder";
import { seatView } from "./seatView";
import SignOut from "./SignOut";
import StatsByMode from "./StatsByMode";

interface Props {
  playerName: string;
}

// The viewer's own colour, as their Seat is on every Board they see.
const ownColours = seatView(0);

// What's on a signed-in Player's Profile, below its title: on the Profile tab on phones, and in the Profile dialog on
// desktop. Made up, but for their Player name, when the placeholder is switched on (profilePlaceholder.ts); otherwise
// only that it's coming soon. Sign out is real either way.
export default function AccountProfile({ playerName }: Props) {
  const profile = placeholderProfile;

  if (!showPlaceholderProfile) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <p className="m-auto py-10 text-[15px] text-ludo-on-page-muted">{tabMessages.comingSoon}</p>
        <SignOut />
      </div>
    );
  }

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
        <StatsByMode stats={profile.stats} />
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

      <SignOut />
    </div>
  );
}
