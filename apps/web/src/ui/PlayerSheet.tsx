import { useId, type RefObject } from "react";
import { Heart, Swords } from "lucide-react";
import { initial } from "./Avatar";
import { playerSheetMessages, profileMessages, tabMessages } from "./messages";
import {
  achievementIcons,
  placeholderOtherProfile,
  placeholderProfile,
  showPlaceholderProfile,
} from "./profilePlaceholder";
import StatsByMode from "./StatsByMode";

interface Props {
  /** For the avatar that opens it to call showModal() on. */
  ref: RefObject<HTMLDialogElement | null>;
  playerName: string;
  signedIn: boolean;
  /** Whether it's the viewer's own, which has no record against themselves. */
  isOwn: boolean;
}

// The Player's Profile, as anyone in their Game sees it, in a sheet that slides up from the bottom of the screen over a
// scrim, opened by tapping their avatar, on phones only. A tap on the scrim, above it, closes it, as does Escape. For a
// Player signed in to an Account, their stats, Achievements and the viewer's record against them, from placeholder data
// for now (profilePlaceholder.ts), or that they're coming soon; for a Guest, that they have none.
export default function PlayerSheet({ ref, playerName, signedIn, isOwn }: Props) {
  const nameId = useId();
  // Their Level, title and badge, and stats, which a Guest has none of.
  const profile = isOwn ? placeholderProfile : placeholderOtherProfile;
  const showProfile = signedIn && showPlaceholderProfile;

  const about = () => {
    if (!signedIn) return <span className="text-[13px] text-ludo-ink-muted">{playerSheetMessages.guest}</span>;
    if (!showProfile) return null;
    return (
      <>
        <span className="text-xs font-bold tracking-[0.12em] text-ludo-ink-muted uppercase">{profile.title}</span>
        <span
          className="mt-0.5 inline-flex h-[22px] items-center rounded-full bg-ludo-card-sunk px-[9px] text-xs font-bold
            shadow-[inset_0_0_0_1px_var(--color-ludo-accent-shade)]"
        >
          {profileMessages.level(profile.level)}
        </span>
      </>
    );
  };

  const details = () => {
    if (!signedIn) {
      return isOwn
        ? (
            <div className="flex flex-col gap-1.5 text-sm leading-normal">
              <p className="m-0 text-ludo-ink-muted">{playerSheetMessages.ownGuest}</p>
              <p className="m-0">{playerSheetMessages.ownGuestSignIn}</p>
            </div>
          )
        : (
            <div className="flex flex-col gap-1.5 text-sm leading-normal">
              <p className="m-0 text-ludo-ink-muted">{playerSheetMessages.guestNoProfile}</p>
              <p className="m-0">
                <strong className="font-bold">{playerSheetMessages.askToSignIn}</strong>
                {playerSheetMessages.askToSignInWhy}
              </p>
            </div>
          );
    }
    if (!showProfile) return <p className="m-0 py-6 text-center text-[15px] text-ludo-ink-muted">{tabMessages.comingSoon}</p>;
    const { wins, losses } = placeholderOtherProfile.record;
    return (
      <>
        <StatsByMode stats={profile.stats} onCard />
        <div className="flex items-center gap-2.5">
          {Object.entries(achievementIcons).map(([id, AchievementIcon]) => (
            <span
              key={id}
              className="flex size-7 flex-none items-center justify-center rounded-full bg-ludo-accent-light text-ludo-ink"
            >
              <AchievementIcon size={16} aria-hidden />
            </span>
          ))}
          <span className="text-sm text-ludo-ink-muted">
            {playerSheetMessages.achievements(profile.achievementsEarned, placeholderProfile.achievementsTotal)}
          </span>
        </div>
        {!isOwn && (
          <div
            className="flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-ludo-notice-line
              bg-ludo-notice px-4 py-3.5"
          >
            <div className="flex flex-col gap-[3px]">
              <span className="text-xs font-bold tracking-[0.12em] text-ludo-ink-muted uppercase">
                {playerSheetMessages.recordHeading}
              </span>
              <span className="font-ludo-display text-[22px]">{profileMessages.record(wins, losses)}</span>
            </div>
            <Swords size={28} strokeWidth={1.8} className="flex-none text-ludo-ink-muted" aria-hidden />
          </div>
        )}
      </>
    );
  };

  return (
    <dialog
      ref={ref}
      className="ludo-dialog mx-auto mt-auto mb-0 w-full max-w-[430px] rounded-t-[28px] bg-ludo-card px-4 pt-2.5 pb-7
        font-ludo-ui text-ludo-ink motion-safe:animate-ludo-sheet-in"
      aria-labelledby={nameId}
      onClick={(event) => event.target === ref.current && ref.current.close()}
    >
      <div className="flex flex-col gap-4">
        <span className="h-1 w-10 self-center rounded-sm bg-ludo-board-line" aria-hidden />
        <div className="flex items-center gap-3.5">
          {/* In ivory, as in the Lobby, not in a Seat's colour. Framed by a Cosmetic, here the placeholder's. */}
          <span className="relative flex size-20 flex-none items-center justify-center">
            {showProfile && (
              <svg className="absolute inset-0 size-full" viewBox="0 0 48 48" aria-hidden>
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  fill="none"
                  stroke="#8e97a3"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeDasharray="0.01 5.76"
                />
              </svg>
            )}
            <span
              className="flex size-[62px] items-center justify-center rounded-full border-2 border-ludo-board-line
                bg-ludo-card-raised font-ludo-display text-[26px]"
              aria-hidden
            >
              {initial(playerName)}
            </span>
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <h2 id={nameId} className="m-0 inline-flex items-center gap-2 font-ludo-display text-2xl leading-[1.15] font-normal wrap-anywhere">
              {playerName}
              {showProfile && profile.supporter && (
                <span
                  className="flex size-[18px] flex-none items-center justify-center rounded-full bg-[#b0417a] text-[#fff8e8]"
                  role="img"
                  aria-label={profileMessages.supporter}
                  title={profileMessages.supporter}
                >
                  <Heart size={10} fill="currentColor" strokeWidth={0} aria-hidden />
                </span>
              )}
            </h2>
            {about()}
          </div>
        </div>
        {details()}
      </div>
    </dialog>
  );
}
