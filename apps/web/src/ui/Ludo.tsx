import { useState } from "react";
import BoardScreen from "./BoardScreen";
import LobbyScreen from "./LobbyScreen";
import ServerStatus from "./ServerStatus";
import StartScreen from "./StartScreen";
import { commonMessages, noticeMessages } from "./messages";
import { loadPlayerName } from "./playerName";
import { useGameServer } from "./useGameServer";
import "./ludo.css";

// The whole game, as one component: run standalone by ../bootstrap.tsx, and exposed to the host app as `ludo/Ludo`.
export default function Ludo() {
  const [playerName] = useState(loadPlayerName);
  const { status, game, error, notice, busy, gameCodeFromLink, createGame, joinGame, startGame, leaveGame } =
    useGameServer(playerName);
  const noticeMessage = notice && noticeMessages[notice];

  const screen = () => {
    // Nothing to show until the server says whether the Player has an active Game.
    if (game === undefined) return null;
    if (game?.state === "lobby") {
      return (
        <LobbyScreen
          game={game}
          disabled={busy}
          notice={noticeMessage}
          error={error}
          onStartGame={startGame}
          onLeaveGame={leaveGame}
        />
      );
    }
    if (game?.state === "playing") return <BoardScreen game={game} notice={noticeMessage} error={error} />;
    // No active Game, or one the Host just cancelled by Leaving.
    return (
      <StartScreen
        playerName={playerName}
        disabled={busy}
        notice={noticeMessage}
        error={error}
        initialGameCode={gameCodeFromLink}
        onCreateGame={createGame}
        onJoinGame={joinGame}
      />
    );
  };

  // The colours sit on this element, not the page, so the host app's page keeps its own.
  return (
    <div className="min-h-dvh bg-white text-black">
      <main className="flex min-h-dvh flex-col gap-6 p-4">
        <h1 className="m-0 text-2xl font-bold">{commonMessages.wordmark}</h1>
        <div className="flex-1">{screen()}</div>
        <footer>
          <ServerStatus status={status} />
        </footer>
      </main>
    </div>
  );
}
