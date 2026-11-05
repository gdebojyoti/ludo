import { useState, type CSSProperties, type FormEvent } from "react";
import { gameCodeLength } from "@ludo/shared";
import Avatar from "./Avatar";
import CreateGameButton from "./CreateGameButton";
import Icon from "./Icon";
import { commonMessages, startMessages } from "./messages";
import { seatView } from "./seatView";

interface Props {
  /**
   * Whether the server is yet to say if the Player has an active Game. Until it does, only the logo shows, as this
   * may not be the screen they end up on.
   */
  waiting: boolean;
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
  waiting,
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
    // Clipped, so the sheet sliding in from below the screen doesn't make the page scroll. Not hidden, which would
    // also make this a scroll container.
    <div className="flex min-h-full flex-1 flex-col overflow-clip text-ludo-maroon">
      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 pt-10 pb-8">
        <div
          className="grid size-[220px] grid-cols-2 gap-2.5 rounded-[26px] border-2 border-ludo-gold p-2.5"
          aria-hidden
        >
          {logoYards.map((colour) => (
            <div key={colour} className="flex items-center justify-center rounded-[18px]" style={{ background: colour }}>
              <span className="grid aspect-square w-[58%] grid-cols-2 gap-1.5 rounded-full bg-ludo-ivory p-3.5">
                {[0, 1, 2, 3].map((slot) => <i key={slot} className="block aspect-square rounded-full bg-ludo-parchment" />)}
              </span>
            </div>
          ))}
        </div>
        <div className="text-center">
          <h1 className="m-0 font-ludo-display text-[46px] font-normal tracking-[0.14em] text-ludo-gold-light uppercase">
            {commonMessages.wordmark}
          </h1>
          <p className="mt-1 mb-0 text-[15px] text-ludo-tan">{startMessages.tagline}</p>
        </div>
      </div>
      {/* Laid out but hidden while waiting, so the logo doesn't move when it slides in. */}
      <div
        className={`flex flex-col gap-5 rounded-t-[28px] bg-ludo-ivory px-6 pt-[26px] pb-9 ${
          waiting ? "invisible" : "motion-safe:animate-ludo-sheet-in"
        }`}
        inert={waiting}
      >
        <div className="flex items-center gap-3">
          {/* Ringed in the viewer's own colour, as their Seat is on every Board they see. */}
          <Avatar
            playerName={playerName}
            colours={seatView(0)}
            className="size-10 text-base shadow-[0_0_0_2px_var(--ludo-own-colour)] border-ludo-cream!"
            style={{ "--ludo-own-colour": seatView(0).colour } as CSSProperties}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="text-xs text-ludo-brown">{startMessages.playingAs}</span>
            <span className="text-[17px] font-bold wrap-anywhere" aria-live="polite">{playerName}</span>
          </span>
          <button
            type="button"
            className="ludo-button-icon border-ludo-tan-border text-ludo-maroon"
            aria-label={startMessages.newName}
            title={startMessages.newName}
            disabled={disabled}
            onClick={onNewPlayerName}
          >
            <Icon name="newName" />
          </button>
        </div>
        <CreateGameButton disabled={disabled} onCreateGame={onCreateGame} />
        <form className="flex flex-col gap-2" onSubmit={joinGame}>
          <label htmlFor="game-code" className="text-xs font-bold tracking-widest text-ludo-brown uppercase">
            {startMessages.gameCodeLabel}
          </label>
          <div className="flex gap-2.5">
            <input
              id="game-code"
              className={`h-[54px] min-w-0 flex-1 rounded-[14px] bg-white px-4 text-xl font-semibold tracking-[0.3em]
                text-ludo-maroon placeholder:text-[15px] placeholder:font-normal placeholder:tracking-[0.04em]
                placeholder:text-ludo-placeholder ${
                  error ? "border-2 border-ludo-danger-line" : "border-[1.5px] border-ludo-board-line"
                }`}
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
            <p
              id="start-error"
              className="mt-0.5 mb-0 flex items-start gap-2 text-[13px] leading-[1.45] text-ludo-danger"
              role="alert"
            >
              <Icon name="error" size={16} strokeWidth={2.2} className="mt-px flex-none" />
              <span>{error}</span>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
