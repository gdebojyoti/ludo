import { connectionMessages } from "./messages";
import type { ConnectionStatus } from "./useGameServer";

const dotColours: Record<ConnectionStatus, string> = {
  connecting: "bg-ludo-conn-wait",
  connected: "bg-ludo-conn-ok",
  disconnected: "bg-ludo-conn-down",
};

// For information only: nothing else on screen depends on it, as it can lag behind the real network state. Shown only
// while not connected, as being connected is the usual state: fixed to the top of the channel, over the screen, so the
// screen doesn't move when it goes.
export default function ServerStatus({ status }: { status: ConnectionStatus }) {
  return (
    <p
      className={status === "connected"
        ? "sr-only"
        : `fixed top-0 left-1/2 z-10 m-0 flex w-full max-w-[430px] -translate-x-1/2 items-center justify-center gap-2
          bg-ludo-maroon-deep/95 py-1.5 text-[13px] text-ludo-tan`}
      role="status"
    >
      <span className={`size-2.5 rounded-full ${dotColours[status]}`} aria-hidden />
      {connectionMessages[status]}
    </p>
  );
}
