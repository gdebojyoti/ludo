import { CircleAlert, LogOut } from "lucide-react";
import { signOut } from "./accounts";
import Button from "./Button";
import { profileMessages } from "./messages";
import { useAccountsCall } from "./useAccountsCall";

// At the bottom of a signed-in Player's Profile: Sign out, and below it, if it didn't work, that it didn't. If it works,
// the page reloads.
export default function SignOut() {
  const { busy, failed, start } = useAccountsCall(signOut, "sign_out");

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Button
        variant="icon"
        className="h-12 w-auto gap-2 px-5 text-base font-semibold text-ludo-on-page"
        disabled={busy}
        onClick={start}
      >
        <LogOut aria-hidden />
        {profileMessages.signOut}
      </Button>
      {failed && (
        <p className="m-0 flex items-start gap-2 text-[13px] leading-[1.4] text-ludo-on-page-muted" role="alert">
          <CircleAlert className="flex-none" aria-hidden />
          <span>{profileMessages.signOutFailed}</span>
        </p>
      )}
    </div>
  );
}
