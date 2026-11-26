import { useState, type CSSProperties, type FormEvent } from "react";
import { CircleAlert, RefreshCw } from "lucide-react";
import { gameCodeLength, type GameMode } from "@ludo/shared";
import Avatar from "./Avatar";
import Button from "./Button";
import CreateGameButton from "./CreateGameButton";
import { commonMessages, startMessages } from "./messages";
import ProfileButton from "./ProfileButton";
import { seatView } from "./seatView";
import SettingsButton from "./SettingsButton";
import SignIn from "./SignIn";
import SnowCap from "./SnowCap";
import SnowTrees from "./SnowTrees";
import Sparkles from "./Sparkles";

interface Props {
  /**
   * Whether the server is yet to say if the Player has an active Game. Until it does, only the logo shows, as this
   * may not be the screen they end up on.
   */
  waiting: boolean;
  playerName: string;
  /** Whether the Player is signed in to an Account; undefined until the server says. */
  signedIn: boolean | undefined;
  disabled: boolean;
  error: string | undefined;
  /** The code to fill in at first, from a Join link that didn't work. */
  initialGameCode: string;
  /** Picks a new Player name; undefined for a Player signed in to an Account, who plays by its own. */
  onNewPlayerName: (() => void) | undefined;
  onCreateGame: (mode: GameMode) => void;
  onJoinGame: (gameCode: string) => void;
}

// The four Yards, as on the Board, clockwise from the top-left, as a picture of the game.
const logoYards = [1, 2, 0, 3].map((seatsFromViewer) => seatView(seatsFromViewer).colour);

export default function StartScreen({
  waiting,
  playerName,
  signedIn,
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

  // Fades in once the server has said, on phones. On desktop, it's already in place, so it only appears.
  const appear = waiting ? "" : "motion-safe:animate-ludo-fade-in xl:motion-safe:animate-none";

  return (
    // Clipped, so nothing in it makes the page scroll sideways. Not hidden, which would also make this a scroll
    // container. On phones, a column: the logo, and below it, the card and signing in. On desktop, the logo is on the
    // left and the card is a panel on the right, and this is a size container, so the panel can tell where the screen's
    // left edge is.
    <div
      className="relative flex min-h-full flex-1 flex-col overflow-clip px-4 pt-3.5 text-ludo-ink xl:@container
        xl:flex-row xl:p-0"
    >
      {/* Desktop only: on phones, Settings is a tab. Where it is in the header on the other screens, so it stays put
          when the Player goes on to the Lobby. That's over the panel, so it's coloured for the panel, and lifted above
          it, as the panel is positioned too. */}
      <div className="hidden xl:absolute xl:top-[18.5px] xl:right-8 xl:z-10 xl:block">
        <SettingsButton colours="border-ludo-line text-ludo-ink [--ludo-button-icon-fill:transparent]" />
      </div>
      <div className="flex items-center gap-3.5 xl:hidden">
        <div
          className="grid size-[52px] flex-none grid-cols-2 gap-[3px] rounded-[10px] border-[1.5px] border-ludo-accent
            p-[3px] christmas:border-ludo-card"
          aria-hidden
        >
          {logoYards.map((colour) => (
            <div key={colour} className="flex items-center justify-center rounded-[5px]" style={{ background: colour }}>
              <span className="aspect-square w-[56%] rounded-full bg-ludo-cell" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          <h1
            className="m-0 font-ludo-display text-[30px] leading-[33.5px] font-normal tracking-[0.12em]
              text-ludo-accent-light uppercase christmas:tracking-[0.04em] christmas:text-white"
          >
            {commonMessages.wordmark}
          </h1>
          <p className="m-0 text-[13px] text-ludo-on-page-muted">{startMessages.tagline}</p>
        </div>
      </div>
      <div className="relative hidden min-w-0 flex-1 flex-col items-center justify-center gap-9 p-12 xl:flex">
        <Sparkles />
        <div
          className="relative grid size-[300px] grid-cols-2 gap-3 rounded-[30px] border-2 border-ludo-accent p-3
            christmas:border-ludo-card"
          aria-hidden
        >
          <SnowCap logo />
          {logoYards.map((colour) => (
            <div
              key={colour}
              className="ludo-dots flex items-center justify-center rounded-[22px]"
              style={{ background: colour }}
            >
              <span className="grid aspect-square w-[58%] grid-cols-2 gap-2 rounded-full bg-ludo-cell p-[18px]">
                {[0, 1, 2, 3].map((slot) => <i key={slot} className="block aspect-square rounded-full bg-ludo-card-sunk" />)}
              </span>
            </div>
          ))}
        </div>
        <div className="text-center">
          <h1
            className="m-0 font-ludo-display text-[64px] font-normal tracking-[0.14em] text-ludo-accent-light uppercase
              christmas:tracking-[0.04em] christmas:text-white"
          >
            {commonMessages.wordmark}
          </h1>
          <p className="mt-1.5 text-[17px] text-ludo-on-page-muted">{startMessages.tagline}</p>
        </div>
      </div>
      {/* Laid out but hidden while waiting, so nothing moves when it appears. On phones, the card and signing in, 48px
          apart, in the middle of the space below the logo, with as much space above as below. On desktop, it's the
          panel, and in the Christmas theme it has trees along its bottom, behind what's on it, carrying on from the
          page's beside it, with the one on the edge half in each: they're laid out from the screen's left edge, as the
          page's are, and clipped to the panel. */}
      <div
        className={`flex flex-1 flex-col justify-center gap-12 py-5 xl:relative xl:isolate xl:w-[520px] xl:flex-none
          xl:overflow-clip xl:bg-ludo-card xl:px-16 xl:py-14 ${waiting ? "invisible" : ""}`}
        inert={waiting}
      >
        <SnowTrees
          light
          className="absolute bottom-0 -z-10 hidden xl:left-[calc(520px-100cqw)] xl:block xl:w-[100cqw]"
        />
        <div
          className={`relative flex flex-col gap-5 rounded-[28px] bg-ludo-card px-5 py-6 xl:gap-[22px] xl:rounded-none
            xl:bg-transparent xl:p-0 ${appear}`}
        >
          {/* On phones, snow on the card in the Christmas theme. */}
          <div className="contents xl:hidden">
            <SnowCap largeCorners />
          </div>
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
            {onNewPlayerName && (
              <Button
                variant="icon"
                className="border-ludo-line text-ludo-ink christmas:[--ludo-button-icon-fill:transparent]"
                aria-label={startMessages.newName}
                title={startMessages.newName}
                disabled={disabled}
                onClick={onNewPlayerName}
              >
                <RefreshCw aria-hidden />
              </Button>
            )}
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
                  text-ludo-ink christmas:rounded-full placeholder:text-[15px] placeholder:font-normal
                  placeholder:tracking-[0.04em] placeholder:text-ludo-placeholder ${
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
              <Button
                variant="outline"
                type="submit"
                className="h-[54px]"
                disabled={disabled || gameCode.length !== gameCodeLength}
              >
                {startMessages.joinGame}
              </Button>
            </div>
            {error && (
              <p
                id="start-error"
                className="mt-0.5 mb-0 flex items-start gap-2 text-[13px] leading-[1.45] text-ludo-danger"
                role="alert"
              >
                <CircleAlert className="flex-none" aria-hidden />
                <span>{error}</span>
              </p>
            )}
          </form>
        </div>
        {signedIn === false && <SignIn className={appear} />}
        {/* In its place once signed in, on desktop only, which has no Profile tab. */}
        {signedIn && (
          <div className="hidden xl:flex xl:justify-center">
            <ProfileButton playerName={playerName} />
          </div>
        )}
      </div>
    </div>
  );
}
