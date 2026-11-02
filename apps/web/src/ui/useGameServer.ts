import { useEffect, useRef, useState } from "react";
import type { Acknowledgement, GameSnapshot } from "@ludo/shared";
import { rejectionMessages } from "./messages";
import { connectToServer, type GameSocket } from "./socket";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

// The connection to the server, and the latest snapshot of the Player's Game. The web app holds no game logic: it
// shows what the server last sent, and sends commands.
export const useGameServer = () => {
  const socketRef = useRef<GameSocket>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  // Undefined until the server has said whether the Player has an active Game; null if they don't.
  const [game, setGame] = useState<GameSnapshot | null>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const socket = connectToServer();
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("ping", () => setStatus("connected"));
    });
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("disconnected"));
    socket.on("game", setGame);
    socket.on("noActiveGame", () => setGame(null));

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
  }, []);

  const send = async <Result extends object>(command: (socket: GameSocket) => Promise<Acknowledgement<Result>>) => {
    const socket = socketRef.current;
    if (!socket) return;
    setBusy(true);
    setError(undefined);
    try {
      const reply = await command(socket);
      if (!reply.ok) setError(rejectionMessages[reply.reason]);
      return reply;
    } finally {
      setBusy(false);
    }
  };

  const createGame = async (playerName: string) => {
    const reply = await send((socket) => socket.emitWithAck("createGame", playerName));
    if (reply?.ok) setGame(reply.game);
  };

  // On success the server sends the cancelled Game, and the Host goes back to the start screen.
  const leaveGame = () => send((socket) => socket.emitWithAck("leaveGame"));

  return { status, game, error, busy, createGame, leaveGame };
};
