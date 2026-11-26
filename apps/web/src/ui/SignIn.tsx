import { useState } from "react";
import { signIn } from "./accounts";
import { track } from "./analytics";
import Icon from "./Icon";
import { startMessages } from "./messages";

// Google's "G", in its own colours, as its sign-in branding asks.
const googleLogo = [
  ["#ea4335", "M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 " +
    "6.19C12.43 13.72 17.74 9.5 24 9.5z"],
  ["#4285f4", "M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 " +
    "7.09-10.36 7.09-17.65z"],
  ["#fbbc05", "M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 " +
    "7.54 2.56 10.78l7.97-6.19z"],
  ["#34a853", "M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 " +
    "6.19C6.51 42.62 14.62 48 24 48z"],
] as const;

interface Props {
  /** Below the button: why to sign in. */
  pitch?: string;
  /** On a card, on phones too; otherwise on the page on phones, and on the Start screen's panel on desktop. */
  onCard?: boolean;
  className?: string;
}

// For a Guest: Google's sign-in button, in Google's own light colours in every theme, and below it, why to sign in, or
// that it didn't work: on the Start screen, and on a Guest's Profile tab.
export default function SignIn({ pitch = startMessages.signInPitch, onCard = false, className = "" }: Props) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const start = async () => {
    setBusy(true);
    setFailed(false);
    track("sign_in_start");
    try {
      // The page goes to Google, so it stays busy.
      await signIn();
    } catch {
      setBusy(false);
      setFailed(true);
    }
  };

  // The text below the button, and the error in its place, in the colours for what they're on.
  const textColour = onCard ? "text-ludo-ink-muted" : "text-ludo-on-page-muted xl:text-ludo-ink-muted";
  const errorColour = onCard ? "text-ludo-danger" : "text-ludo-on-page-muted xl:text-ludo-danger";

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        type="button"
        className="flex h-12 cursor-pointer self-center touch-manipulation items-center justify-center gap-3 rounded-xl border
          border-[#747775] bg-white px-[18px] text-[15px] font-medium text-[#1f1f1f] select-none christmas:rounded-full
          disabled:cursor-default disabled:opacity-60"
        disabled={busy}
        onClick={start}
      >
        <svg className="size-5 flex-none" viewBox="0 0 48 48" aria-hidden>
          {googleLogo.map(([fill, path]) => <path key={fill} fill={fill} d={path} />)}
        </svg>
        {startMessages.signIn}
      </button>
      {failed
        ? (
            <p
              className={`m-0 flex items-start justify-center gap-2 px-8 text-[13px] leading-[1.4] ${errorColour}`}
              role="alert"
            >
              <Icon name="error" size={16} strokeWidth={2.2} className="mt-px flex-none" />
              <span>{startMessages.signInFailed}</span>
            </p>
          )
        : (
            <p className={`m-0 px-8 text-center text-[13px] leading-[1.4] ${textColour}`}>
              {pitch}
            </p>
          )}
    </div>
  );
}
