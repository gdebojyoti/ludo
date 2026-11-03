import { useState } from "react";
import type { GameSnapshot } from "@ludo/shared";
import ErrorMessage from "./ErrorMessage";
import { lobbyMessages } from "./messages";

interface Props {
  game: GameSnapshot;
  disabled: boolean;
  error: string | undefined;
  onLeaveGame: () => void;
}

export default function LobbyScreen({ game, disabled, error, onLeaveGame }: Props) {
  // Leave always asks first, so a misclick can't cancel the Game.
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const host = game.players.find((player) => player.isHost);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="m-0 text-sm">{lobbyMessages.gameCodeHeading}</h2>
        <p className="m-0 font-mono text-3xl tracking-widest">{game.gameCode}</p>
        <p className="m-0 text-sm">{lobbyMessages.shareHint}</p>
      </div>
      <p className="m-0">
        {lobbyMessages.host}: <strong>{host?.playerName}</strong>
      </p>
      {confirmingLeave
        ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="m-0">{lobbyMessages.confirmLeave}</p>
              <button type="button" className="border px-4 py-2" disabled={disabled} onClick={onLeaveGame}>
                {lobbyMessages.confirmLeaveYes}
              </button>
              <button type="button" className="border px-4 py-2" onClick={() => setConfirmingLeave(false)}>
                {lobbyMessages.confirmLeaveNo}
              </button>
            </div>
          )
        : (
            <button type="button" className="self-start border px-4 py-2" onClick={() => setConfirmingLeave(true)}>
              {lobbyMessages.leave}
            </button>
          )}
      <ErrorMessage error={error} />
    </section>
  );
}
