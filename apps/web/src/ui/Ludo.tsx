import { useState } from "react";
import type { SnapshotBoard } from "@ludo/shared";
import { track } from "./analytics";
import BoardScreen from "./BoardScreen";
import CancelledScreen from "./CancelledScreen";
import ComingSoonScreen from "./ComingSoonScreen";
import LobbyScreen from "./LobbyScreen";
import NavBar, { type Tab } from "./NavBar";
import ProfileScreen from "./ProfileScreen";
import SettingsScreen from "./SettingsScreen";
import ResultScreen from "./ResultScreen";
import ServerStatus from "./ServerStatus";
import { useSettings } from "./settings";
import Snowfall from "./Snowfall";
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
    account,
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
  // A Player signed in to an Account plays by its Player name, from Google, which the server enters them by.
  const shownName = account?.playerName ?? playerName;
  // Undefined until the server says.
  const signedIn = account === undefined ? undefined : account !== null;
  // The won Game's Board, once its last Move has played out, so its result can be shown.
  const [playedOutBoard, setPlayedOutBoard] = useState<SnapshotBoard>();
  const { theme } = useSettings();
  // The tab open outside a Game. It's not in the address, which stays as it is.
  const [tab, setTab] = useState<Tab>("play");

  const openTab = (opened: Tab) => {
    setTab(opened);
    track("tab_open", { tab: opened });
  };

  const screen = () => {
    if (game?.state === "lobby") {
      return (
        <LobbyScreen
          game={game}
          playerName={shownName}
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
          playing={game.state === "playing"}
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
    // Outside a Game, the tabs, and the open one's screen. The Start screen is shown, logo only, while the server is
    // yet to say whether the Player has an active Game, and the tabs are hidden. It's mounted afresh once it has, so a
    // code from a Join link that didn't work is filled in.
    return (
      <>
        {tabScreen()}
        <NavBar open={tab} hidden={game === undefined} onOpen={openTab} />
      </>
    );
  };

  const tabScreen = () => {
    const back = () => setTab("play");
    if (tab === "settings") return <SettingsScreen signedIn={signedIn} onBack={back} />;
    if (tab === "profile") return <ProfileScreen playerName={shownName} signedIn={signedIn} onBack={back} />;
    if (tab !== "play") return <ComingSoonScreen tab={tab} onBack={back} />;
    return (
      <StartScreen
        key={game === undefined ? "waiting" : "ready"}
        waiting={game === undefined}
        playerName={shownName}
        signedIn={signedIn}
        disabled={busy}
        error={error}
        initialGameCode={gameCodeFromLink}
        onNewPlayerName={account?.playerName ? undefined : () => setPlayerName(newPlayerName())}
        onCreateGame={createGame}
        onJoinGame={joinGame}
      />
    );
  };

  // The colours and the theme sit on this element, not the page, so the host app's page keeps its own. On screens wider
  // than a phone but narrower than desktop, the game keeps its phone layout, in a channel down the middle. From desktop
  // width (Tailwind's xl, 1280px) on, each screen has its own desktop layout, across the whole window. The Christmas
  // theme's snow falls behind the screen, which is positioned to stay in front of it.
  return (
    <div className="min-h-dvh bg-ludo-page-deep font-ludo-ui text-ludo-on-page" data-ludo-theme={theme}>
      <main className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-ludo-page xl:max-w-none">
        <Snowfall />
        <ServerStatus status={status} />
        <div className="relative flex flex-1 flex-col">{screen()}</div>
      </main>
    </div>
  );
}
