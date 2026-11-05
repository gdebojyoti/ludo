import { useState } from "react";
import type { SnapshotBoard } from "@ludo/shared";
import BoardScreen from "./BoardScreen";
import CancelledScreen from "./CancelledScreen";
import LobbyScreen from "./LobbyScreen";
import ResultScreen from "./ResultScreen";
import ServerStatus from "./ServerStatus";
import StartScreen from "./StartScreen";
import { noticeMessages } from "./messages";
import { loadPlayerName, newPlayerName } from "./playerName";
import { useGameServer } from "./useGameServer";
import "./ludo.css";

// The whole game, as one component: run standalone by ../bootstrap.tsx, and exposed to the host app as `ludo/Ludo`.
export default function Ludo() {
  const [playerName, setPlayerName] = useState(loadPlayerName);
  const {
    status,
    game,
    error,
    notice,
    busy,
    gameCodeFromLink,
    createGame,
    joinGame,
    startGame,
    leaveGame,
    roll,
    move,
    backToStart,
  } = useGameServer(playerName);
  const noticeMessage = notice && noticeMessages[notice];
  // The won Game's Board, once its last Move has played out, so its result can be shown.
  const [playedOutBoard, setPlayedOutBoard] = useState<SnapshotBoard>();

  const screen = () => {
    if (game?.state === "lobby") {
      return (
        <LobbyScreen
          game={game}
          playerName={playerName}
          disabled={busy}
          notice={noticeMessage}
          error={error}
          onStartGame={startGame}
          onLeaveGame={leaveGame}
        />
      );
    }
    if (game?.state === "won" && game.board && game.board === playedOutBoard) {
      return <ResultScreen mode={game.mode} board={game.board} onBackToStart={backToStart} />;
    }
    if (game?.board) {
      return (
        <BoardScreen
          mode={game.mode}
          board={game.board}
          disabled={busy}
          notice={noticeMessage}
          error={error}
          onRoll={roll}
          onMove={move}
          onLeaveGame={leaveGame}
          onPlayedOut={() => setPlayedOutBoard(game.board ?? undefined)}
        />
      );
    }
    // Everyone but the Host, who chose it, is told why their Game ended.
    if (game?.state === "cancelled" && !game.isHost) {
      return <CancelledScreen game={game} onBackToStart={backToStart} />;
    }
    // Shown, logo only, while the server is yet to say whether the Player has an active Game. Mounted afresh once it
    // has, so a code from a Join link that didn't work is filled in.
    return (
      <StartScreen
        key={game === undefined ? "waiting" : "ready"}
        waiting={game === undefined}
        playerName={playerName}
        disabled={busy}
        error={error}
        initialGameCode={gameCodeFromLink}
        onNewPlayerName={() => setPlayerName(newPlayerName())}
        onCreateGame={createGame}
        onJoinGame={joinGame}
      />
    );
  };

  // The colours sit on this element, not the page, so the host app's page keeps its own. On wider screens the game
  // keeps its phone layout, in a channel down the middle.
  return (
    <div className="min-h-dvh bg-ludo-maroon-deep font-ludo-ui text-ludo-ivory">
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-ludo-maroon">
        <ServerStatus status={status} />
        <div className="flex flex-1 flex-col">{screen()}</div>
      </main>
    </div>
  );
}
