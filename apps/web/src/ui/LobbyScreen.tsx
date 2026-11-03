import { useEffect, useState } from "react";
import type { GameSnapshot } from "@ludo/shared";
import ErrorMessage from "./ErrorMessage";
import { joinLinkFor } from "./joinLink";
import Notice from "./Notice";
import { lobbyMessages } from "./messages";

interface Props {
  game: GameSnapshot;
  disabled: boolean;
  /** Something that happened without the Player doing it, such as opening a Join link while in this Game. */
  notice: string | undefined;
  error: string | undefined;
  onLeaveGame: () => void;
}

/** What a Player can copy to share the Game. */
type Copyable = "joinLink" | "gameCode";

// How long a copy button shows that it worked.
const copiedFor = 2000;

export default function LobbyScreen({ game, disabled, notice, error, onLeaveGame }: Props) {
  const gameCode = game.gameCode ?? "";
  // Leave always asks first, so a misclick can't take the Player out, or cancel the Game.
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  // Which of the copy buttons last worked, while it shows that it did.
  const [copied, setCopied] = useState<Copyable>();

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(undefined), copiedFor);
    return () => clearTimeout(timeout);
  }, [copied]);

  const copy = async (what: Copyable, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      // The browser refused. The code is on screen to copy by hand, and either button can be tried again.
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <Notice notice={notice} />
      <div className="flex flex-col gap-2">
        <h2 className="m-0 text-sm">{lobbyMessages.gameCodeHeading}</h2>
        <p className="m-0 font-mono text-3xl tracking-widest">{gameCode}</p>
        <p className="m-0 text-sm">{lobbyMessages.shareHint}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="border px-4 py-2" onClick={() => copy("joinLink", joinLinkFor(gameCode))}>
            <span aria-live="polite">{copied === "joinLink" ? lobbyMessages.copied : lobbyMessages.copyJoinLink}</span>
          </button>
          <button type="button" className="border px-4 py-2" onClick={() => copy("gameCode", gameCode)}>
            <span aria-live="polite">{copied === "gameCode" ? lobbyMessages.copied : lobbyMessages.copyCode}</span>
          </button>
        </div>
      </div>
      <div>
        <h2 className="m-0 text-sm">{lobbyMessages.playersHeading}</h2>
        {/* In join order. Two Players can share a Player name, so they're told apart by their place. */}
        <ol className="m-0 list-decimal pl-6">
          {game.players.map((player, index) => (
            <li key={index}>
              {player.playerName}
              {player.isHost && ` · ${lobbyMessages.host}`}
            </li>
          ))}
        </ol>
      </div>
      {confirmingLeave
        ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="m-0">{game.isHost ? lobbyMessages.confirmLeaveAsHost : lobbyMessages.confirmLeave}</p>
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
