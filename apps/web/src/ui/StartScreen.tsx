import { useState, type CSSProperties, type FormEvent } from "react";
import { gameCodeLength, type GameMode } from "@ludo/shared";
import Avatar from "./Avatar";
import CreateGameButton from "./CreateGameButton";
import Frost from "./Frost";
import Icon from "./Icon";
import { commonMessages, startMessages } from "./messages";
import { seatView } from "./seatView";
import SettingsButton from "./SettingsButton";
import SnowCap from "./SnowCap";
import SnowHills from "./SnowHills";
import SnowTrees from "./SnowTrees";
import Sparkles from "./Sparkles";

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
  onCreateGame: (mode: GameMode) => void;
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
    // also make this a scroll container. On desktop, the logo is on the left and the sheet is a panel on the right, and
    // this is a size container, so the panel can tell where the screen's left edge is.
    <div className="relative flex min-h-full flex-1 flex-col overflow-clip text-ludo-ink xl:@container xl:flex-row">
      {/* Where it is in the header on the other screens, so it stays put when the Player goes on to the Lobby. On
          desktop, that's over the panel, so it's coloured for the panel, and lifted above it, as the panel is
          positioned too. */}
      <div className="flex justify-end px-5 pt-3.5 xl:absolute xl:top-[18.5px] xl:right-8 xl:z-10 xl:p-0">
        <SettingsButton
          colours="text-ludo-on-page xl:border-ludo-line xl:text-ludo-ink xl:[--ludo-button-icon-fill:transparent]"
        />
      </div>
      <div
        className="relative flex flex-1 flex-col items-center justify-center gap-6 px-6 pt-6 pb-8 xl:min-w-0 xl:gap-9
          xl:p-12"
      >
        <Sparkles />
        <div
          className="relative grid size-[180px] grid-cols-2 gap-2 rounded-[22px] border-2 border-ludo-accent p-2
            christmas:border-ludo-card xl:size-[300px] xl:gap-3 xl:rounded-[30px] xl:p-3"
          aria-hidden
        >
          <SnowCap logo />
          {logoYards.map((colour) => (
            <div
              key={colour}
              className="ludo-dots flex items-center justify-center rounded-[15px] xl:rounded-[22px]"
              style={{ background: colour }}
            >
              <span
                className="grid aspect-square w-[58%] grid-cols-2 gap-1 rounded-full bg-ludo-cell p-3 xl:gap-2
                  xl:p-[18px]"
              >
                {[0, 1, 2, 3].map((slot) => <i key={slot} className="block aspect-square rounded-full bg-ludo-card-sunk" />)}
              </span>
            </div>
          ))}
        </div>
        <div className="text-center">
          <h1
            className="m-0 font-ludo-display text-[40px] font-normal tracking-[0.14em] text-ludo-accent-light uppercase
              christmas:tracking-[0.04em] christmas:text-white xl:text-[64px]"
          >
            {commonMessages.wordmark}
          </h1>
          <p className="text-[15px] text-ludo-on-page-muted xl:mt-1.5 xl:text-[17px]">{startMessages.tagline}</p>
        </div>
      </div>
      {/* Laid out but hidden while waiting, so the logo doesn't move when it slides in. On desktop, it's already in
          place, so it only appears. In the Christmas theme, it rises out of snowy hills rather than having a rounded top,
          and has trees along its bottom, behind what's on it. On desktop, its trees carry on from the page's beside it,
          with the one on the edge half in each: they're laid out from the screen's left edge, as the page's are, and
          clipped to the panel. */}
      <div
        className={`relative isolate flex flex-col gap-5 rounded-t-[28px] bg-ludo-card px-6 pt-[26px] pb-9
          christmas:rounded-none xl:w-[520px] xl:flex-none xl:justify-center xl:gap-[22px] xl:overflow-clip
          xl:rounded-none xl:px-16 xl:py-14 ${
          waiting ? "invisible" : "motion-safe:animate-ludo-sheet-in xl:motion-safe:animate-none"
        }`}
        inert={waiting}
      >
        <SnowHills />
        <SnowTrees light className="absolute bottom-0 left-0 -z-10 xl:left-[calc(520px-100cqw)] xl:w-[100cqw]" />
        <div className="flex items-center gap-3">
          {/* Ringed in the viewer's own colour, as their Seat is on every Board they see. */}
          <Avatar
            playerName={playerName}
            colours={seatView(0)}
            className="size-10 text-base shadow-[0_0_0_2px_var(--ludo-own-colour)] border-ludo-card-raised!"
            style={{ "--ludo-own-colour": seatView(0).colour } as CSSProperties}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="text-xs text-ludo-ink-muted">{startMessages.playingAs}</span>
            <span className="text-[17px] font-bold wrap-anywhere" aria-live="polite">{playerName}</span>
          </span>
          <button
            type="button"
            className="ludo-button-icon border-ludo-line text-ludo-ink christmas:[--ludo-button-icon-fill:transparent]"
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
          <label htmlFor="game-code" className="text-xs font-bold tracking-widest text-ludo-ink-muted uppercase">
            {startMessages.gameCodeLabel}
          </label>
          <div className="flex gap-2.5">
            <input
              id="game-code"
              className={`h-[54px] min-w-0 flex-1 rounded-[14px] bg-white px-4 text-xl font-semibold tracking-[0.3em]
                text-ludo-ink christmas:rounded-full placeholder:text-[15px] placeholder:font-normal placeholder:tracking-[0.04em]
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
              <Frost light />
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
