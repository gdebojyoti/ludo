import { useEffect, useState } from "react";
import { connectToServer } from "./socket";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

// The connection to the server. The web app holds no game logic: once there are Games, this also keeps the latest
// snapshot the server sent, and sends commands.
export const useGameServer = () => {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    const socket = connectToServer();
    socket.on("connect", () => {
      socket.emit("ping", () => setStatus("connected"));
    });
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("disconnected"));

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
    };
  }, []);

  return { status };
};
