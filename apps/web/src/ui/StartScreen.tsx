import { useState, type FormEvent } from "react";
import { gameCodeLength } from "@ludo/shared";
import ErrorMessage from "./ErrorMessage";
import Notice from "./Notice";
import { startMessages } from "./messages";

interface Props {
  playerName: string;
  disabled: boolean;
  notice: string | undefined;
  error: string | undefined;
  /** The code to fill in at first, from a join link that didn't work. */
  initialGameCode: string;
  onCreateGame: () => void;
  onJoinGame: (gameCode: string) => void;
}

export default function StartScreen({
  playerName,
  disabled,
  notice,
  error,
  initialGameCode,
  onCreateGame,
  onJoinGame,
}: Props) {
  const [gameCode, setGameCode] = useState(initialGameCode);

  const joinGame = (event: FormEvent) => {
    event.preventDefault();
    onJoinGame(gameCode);
  };

  return (
    <section className="flex flex-col gap-4">
      <Notice notice={notice} />
      <p className="m-0">
        {startMessages.playingAs} <strong>{playerName}</strong>
      </p>
      <button type="button" className="self-start border px-4 py-2" disabled={disabled} onClick={onCreateGame}>
        {startMessages.createGame}
      </button>
      <form className="flex flex-col gap-2" onSubmit={joinGame}>
        <label htmlFor="game-code">{startMessages.gameCodeLabel}</label>
        <div className="flex gap-2">
          <input
            id="game-code"
            className="w-32 border px-2 py-2 font-mono tracking-widest"
            inputMode="numeric"
            autoComplete="off"
            maxLength={gameCodeLength}
            placeholder={startMessages.gameCodePlaceholder}
            value={gameCode}
            // Kept as text, digits only, so leading zeros stay.
            onChange={(event) => setGameCode(event.target.value.replace(/\D/g, ""))}
          />
          <button
            type="submit"
            className="border px-4 py-2"
            disabled={disabled || gameCode.length !== gameCodeLength}
          >
            {startMessages.joinGame}
          </button>
        </div>
      </form>
      <ErrorMessage error={error} />
    </section>
  );
}
