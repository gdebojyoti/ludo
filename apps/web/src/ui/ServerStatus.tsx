import { connectionMessages } from "./messages";
import type { ConnectionStatus } from "./useGameServer";

const dotColours: Record<ConnectionStatus, string> = {
  connecting: "bg-conn-wait",
  connected: "bg-conn-ok",
  disconnected: "bg-conn-down",
};

// For information only: nothing else on screen depends on it, as it can lag behind the real network state. Shown only
// while not connected, as being connected is the usual state.
export default function ServerStatus({ status }: { status: ConnectionStatus }) {
  return (
    <p
      className={`m-0 flex items-center justify-center gap-2 bg-maroon-deep py-1.5 text-[13px] text-tan ${
        status === "connected" ? "sr-only" : ""
      }`}
      role="status"
    >
      <span className={`size-2.5 rounded-full ${dotColours[status]}`} aria-hidden />
      {connectionMessages[status]}
    </p>
  );
}
