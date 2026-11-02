import ServerStatus from "./ServerStatus";
import { commonMessages } from "./messages";
import { useGameServer } from "./useGameServer";
import "./ludo.css";

// The whole game, as one component: run standalone by ../bootstrap.tsx, and exposed to a host as `ludo/Ludo`.
export default function Ludo() {
  const { status } = useGameServer();

  // The colours sit on this element, not the page, so a host's page keeps its own.
  return (
    <div className="min-h-dvh bg-white text-black">
      <main className="mx-auto flex min-h-dvh w-full max-w-107.5 flex-col p-4">
        <h1 className="flex-1 text-2xl font-bold">{commonMessages.wordmark}</h1>
        <footer>
          <ServerStatus status={status} />
        </footer>
      </main>
    </div>
  );
}
