import { useEffect, useRef, useState } from "react";
import { gameCodeLength, type Acknowledgement, type GameSnapshot } from "@ludo/shared";
import { gameCodeInAddress, isGameCode, removeJoinLinkFromAddress } from "./joinLink";
import { rejectionMessages, startMessages } from "./messages";
import { connectToServer, type GameSocket } from "./socket";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

/**
 * Something that happened without the Player doing it, shown until they act again: the Host cancelled their Game, or
 * they opened a join link while already in a Game.
 */
export type Notice = "hostCancelled" | "alreadyInGame";

// The connection to the server, and the latest snapshot of the Player's Game. The web app holds no game logic: it
// shows what the server last sent, and sends commands, with this Player name where they need one.
export const useGameServer = (playerName: string) => {
  const socketRef = useRef<GameSocket>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  // Undefined until the server has said whether the Player has an active Game; null if they don't.
  const [game, setGame] = useState<GameSnapshot | null>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<Notice>();
  const [busy, setBusy] = useState(false);
  // The code from a join link that didn't work, filled in on the start screen so it can be fixed by hand.
  const [gameCodeFromLink, setGameCodeFromLink] = useState("");

  useEffect(() => {
    const socket = connectToServer();
    socketRef.current = socket;
    // How many snapshots of the Player's Game the server has sent, so a reply that arrives after one can tell it's
    // out of date.
    let gamesReceived = 0;
    socket.on("connect", () => {
      socket.emit("ping", () => setStatus("connected"));
    });
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("disconnected"));
    socket.on("game", (game) => {
      gamesReceived++;
      // A join link still in the address hasn't been used, as it's taken out before joining.
      if (gameCodeInAddress() !== null) {
        setNotice("alreadyInGame");
        removeJoinLinkFromAddress();
      }
      // The Host chose to cancel it; everyone else is told why they're back on the start screen.
      if (game.state === "cancelled" && !game.isHost) setNotice("hostCancelled");
      setGame(game);
    });
    socket.on("noActiveGame", async () => {
      // A join link is used once. The start screen waits for the reply, so it doesn't flash up before the Lobby.
      const gameCode = gameCodeInAddress();
      if (gameCode === null) return setGame(null);
      removeJoinLinkFromAddress();
      if (isGameCode(gameCode)) {
        const gamesBefore = gamesReceived;
        // No reply if the connection drops first. If the server joined the Game anyway, it sends it when the
        // connection comes back.
        const reply = await socket.emitWithAck("joinGame", gameCode, playerName).catch(() => undefined);
        if (reply?.ok) return setGame(reply.game);
        // A Game of the Player's own arrived meanwhile, such as one they created in another tab.
        if (gamesReceived !== gamesBefore) return;
        setError(reply ? rejectionMessages[reply.reason] : startMessages.joinLinkNoReply);
      } else setError(startMessages.invalidJoinLink);
      setGameCodeFromLink(gameCode.replace(/\D/g, "").slice(0, gameCodeLength));
      setGame(null);
    });

    // A Player who navigates away from the game counts as gone until they come back; one who only switches tabs
    // does not. The browser may keep the page in its back/forward cache with the connection frozen but not closed,
    // so without this the other Players would see them as online until they returned.
    const leavePage = () => socket.disconnect();
    const returnToPage = (event: PageTransitionEvent) => {
      // Only a page restored from the back/forward cache comes back with its old, closed connection.
      if (!event.persisted) return;
      setStatus("connecting");
      socket.connect();
    };
    window.addEventListener("pagehide", leavePage);
    window.addEventListener("pageshow", returnToPage);

    return () => {
      window.removeEventListener("pagehide", leavePage);
      window.removeEventListener("pageshow", returnToPage);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [playerName]);

  const send = async <Result extends object>(command: (socket: GameSocket) => Promise<Acknowledgement<Result>>) => {
    const socket = socketRef.current;
    if (!socket) return;
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    setGameCodeFromLink("");
    try {
      const reply = await command(socket);
      if (!reply.ok) setError(rejectionMessages[reply.reason]);
      return reply;
    } finally {
      setBusy(false);
    }
  };

  // Sends a command that puts the Player in a Game, and shows the Game from its reply.
  const enterGame = async (command: (socket: GameSocket) => Promise<Acknowledgement<{ game: GameSnapshot }>>) => {
    const reply = await send(command);
    if (reply?.ok) setGame(reply.game);
  };

  const createGame = () => enterGame((socket) => socket.emitWithAck("createGame", playerName));

  const joinGame = (gameCode: string) => enterGame((socket) => socket.emitWithAck("joinGame", gameCode, playerName));

  // On success the server sends the Host the cancelled Game, or any other Player that they have no active Game, and
  // either goes back to the start screen.
  const leaveGame = () => send((socket) => socket.emitWithAck("leaveGame"));

  return { status, game, error, notice, busy, gameCodeFromLink, createGame, joinGame, leaveGame };
};
