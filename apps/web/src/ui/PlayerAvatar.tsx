import { useRef, type ComponentProps } from "react";
import Avatar from "./Avatar";
import { usePhoneLayout } from "./layout";
import { playerSheetMessages } from "./messages";
import PlayerSheet from "./PlayerSheet";

interface Props extends ComponentProps<typeof Avatar> {
  /** Whether the Player is signed in to an Account, which decides what their sheet shows. */
  signedIn: boolean;
  /** Whether it's the viewer's own avatar. */
  isOwn: boolean;
}

// A Player's avatar in a Game, from the Lobby to its result. On phones, tapping it opens their sheet (PlayerSheet.tsx),
// and it reaches a little past its edge, so it's easier to hit. On desktop, it's only the avatar, for now.
export default function PlayerAvatar({ signedIn, isOwn, ...avatar }: Props) {
  const sheetRef = useRef<HTMLDialogElement>(null);
  const isPhone = usePhoneLayout();
  if (!isPhone) return <Avatar {...avatar} />;
  return (
    <>
      <button
        type="button"
        className="relative flex-none cursor-pointer touch-manipulation rounded-full before:absolute before:-inset-1
          before:content-['']"
        aria-label={playerSheetMessages.open(avatar.playerName, isOwn)}
        onClick={() => sheetRef.current?.showModal()}
      >
        <Avatar {...avatar} />
      </button>
      <PlayerSheet ref={sheetRef} playerName={avatar.playerName} signedIn={signedIn} isOwn={isOwn} />
    </>
  );
}
