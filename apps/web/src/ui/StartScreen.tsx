import { useState, type FormEvent } from "react";
import { gameCodeLength } from "@ludo/shared";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { commonMessages, startMessages } from "./messages";
import { seatView } from "./seatView";

interface Props {
  playerName: string;
  disabled: boolean;
  error: string | undefined;
  /** The code to fill in at first, from a Join link that didn't work. */
  initialGameCode: string;
  onNewPlayerName: () => void;
  onCreateGame: () => void;
  onJoinGame: (gameCode: string) => void;
}

// The four Yards, as on the Board, clockwise from the top-left, as a picture of the game.
const logoYards = [1, 2, 0, 3].map((seatsFromViewer) => seatView(seatsFromViewer).colour);

export default function StartScreen({
  playerName,
  disabled,
  error,
  initialGameCode,
  onNewPlayerName,
  onCreateGame,
  onJoinGame,
}: Props) {
  const [gameCode, setGameCode] = useState(initialGameCode);

  const joinGame = (event: FormEvent) => {
    event.preventDefault();
    onJoinGame(gameCode);
  };

  return (
    <div className="flex min-h-full flex-1 flex-col text-maroon">
      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 pt-10 pb-8">
        <div
          className="grid size-[220px] grid-cols-2 gap-2.5 rounded-[26px] border-2 border-gold p-2.5"
          aria-hidden
        >
          {logoYards.map((colour) => (
            <div key={colour} className="flex items-center justify-center rounded-[18px]" style={{ background: colour }}>
              <span className="grid aspect-square w-[58%] grid-cols-2 gap-1.5 rounded-full bg-ivory p-3.5">
                {[0, 1, 2, 3].map((slot) => <i key={slot} className="block aspect-square rounded-full bg-parchment" />)}
              </span>
            </div>
          ))}
        </div>
        <div className="text-center">
          <h1 className="m-0 font-display text-[46px] font-normal tracking-[0.14em] text-gold-light uppercase">
            {commonMessages.wordmark}
          </h1>
          <p className="mt-1 mb-0 text-[15px] text-tan">{startMessages.tagline}</p>
        </div>
      </div>
      <div className="flex flex-col gap-5 rounded-t-[28px] bg-ivory px-6 pt-[26px] pb-9">
        <div className="flex items-center gap-3">
          <Avatar
            playerName={playerName}
            colours={seatView(0)}
            className="size-10 text-base shadow-[0_0_0_2px_#d2462e] border-cream!"
          />
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="text-xs text-brown">{startMessages.playingAs}</span>
            <span className="text-[17px] font-bold wrap-anywhere" aria-live="polite">{playerName}</span>
          </span>
          <button
            type="button"
            className="ludo-button-icon border-tan-border text-maroon"
            aria-label={startMessages.newName}
            title={startMessages.newName}
            disabled={disabled}
            onClick={onNewPlayerName}
          >
            <Icon name="newName" />
          </button>
        </div>
        <button type="button" className="ludo-button-maroon" disabled={disabled} onClick={onCreateGame}>
          {startMessages.createGame}
        </button>
        <form className="flex flex-col gap-2" onSubmit={joinGame}>
          <label htmlFor="game-code" className="text-xs font-bold tracking-widest text-brown uppercase">
            {startMessages.gameCodeLabel}
          </label>
          <div className="flex gap-2.5">
            <input
              id="game-code"
              className={`h-[54px] min-w-0 flex-1 rounded-[14px] bg-white px-4 text-xl font-semibold tracking-[0.3em]
                text-maroon placeholder:text-[15px] placeholder:font-normal placeholder:tracking-[0.04em]
                placeholder:text-[#8c7458] ${error ? "border-2 border-danger-line" : "border-[1.5px] border-board-line"}`}
              inputMode="numeric"
              autoComplete="off"
              maxLength={gameCodeLength}
              placeholder={startMessages.gameCodePlaceholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "start-error" : undefined}
              value={gameCode}
              // Kept as text, digits only, so leading zeros stay.
              onChange={(event) => setGameCode(event.target.value.replace(/\D/g, ""))}
            />
            <button
              type="submit"
              className="ludo-button-outline h-[54px]"
              disabled={disabled || gameCode.length !== gameCodeLength}
            >
              {startMessages.joinGame}
            </button>
          </div>
          {error && (
            <p id="start-error" className="mt-0.5 mb-0 flex items-start gap-2 text-[13px] leading-[1.45] text-danger" role="alert">
              <Icon name="error" size={16} strokeWidth={2.2} className="mt-px flex-none" />
              <span>{error}</span>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
