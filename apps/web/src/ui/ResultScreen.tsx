import { classicRules, seatsClockwise, tokensReachHome, type GameMode, type Seat, type SnapshotBoard } from "@ludo/shared";
import { homeCountAt, howWonAt, playerNameAt, seatViewOf, winnerAt } from "./boardView";
import BottomBar from "./BottomBar";
import Button from "./Button";
import Header from "./Header";
import { boardMessages, commonMessages, resultMessages } from "./messages";
import PlayerAvatar from "./PlayerAvatar";

interface Props {
  mode: GameMode;
  /** The Board of a won Game. */
  board: SnapshotBoard;
  onBackToStart: () => void;
}

const tokenSpots = Array.from({ length: classicRules.tokensPerSeat }, (_, spot) => spot);

export default function ResultScreen({ mode, board, onBackToStart }: Props) {
  const winner = winnerAt(board);
  const viewer = board.seat;
  const colours = (seat: Seat) => seatViewOf(board, seat);
  const winnerName = playerNameAt(board, winner);
  const homeCount = (seat: Seat) => homeCountAt(board, seat);
  // Everyone else, by Standing, so those who Left come last, and those who share one in Seat order from the viewer's.
  const others = board.seats
    .map((seat, index) => ({ ...seat, index }))
    .filter(({ playerName, index }) => playerName !== null && index !== winner)
    .sort((a, b) => {
      const byStanding = (a.standing ?? 0) - (b.standing ?? 0);
      return byStanding || seatsClockwise(viewer, a.index) - seatsClockwise(viewer, b.index);
    });
  // Whether it's the viewer, then where a Player finished, or that they Left, which puts them last.
  const notes = (seat: Seat, left: boolean, standing: number | null) => {
    const standingNote = standing === null ? "" : resultMessages.standing(standing);
    return [seat === viewer ? commonMessages.you : "", left ? boardMessages.left : standingNote]
      .filter(Boolean)
      .join(" · ");
  };

  const named = (seat: Seat) => ({ playerName: playerNameAt(board, seat), isOwn: seat === viewer });

  const howWon = () => {
    const { how, captured } = howWonAt(mode, board);
    if (how === "othersLeft") return resultMessages.othersLeft;
    if (how === "allHome") return resultMessages.allHome;
    return resultMessages.capture(named(winner), captured.map(({ seat }) => named(seat)));
  };

  // On desktop, the header is a bar across the window, and the rest is in a phone-width column down the middle. The
  // column is left out of the layout on phones.
  return (
    <div className="flex flex-1 flex-col gap-[22px] px-4 pt-3.5 pb-9 xl:gap-0 xl:p-0">
      <Header title={resultMessages.gameOver} subtitle={resultMessages.subtitle(mode)} settings="phones" />
      <div
        className="contents xl:mx-auto xl:flex xl:w-full xl:max-w-[430px] xl:flex-1 xl:flex-col xl:gap-[22px] xl:px-5
          xl:pt-10 xl:pb-12"
      >
        <section
          className="flex flex-col items-center gap-3 rounded-[22px] border-t-8 bg-ludo-card px-[22px] py-[26px]
            text-center text-ludo-ink"
          style={{ borderTopColor: colours(winner).colour }}
        >
          {/* Desktop only: on phones, the header says so. */}
          <h2 className="m-0 hidden text-xs font-bold tracking-[0.14em] text-ludo-ink-muted uppercase xl:block">
            {resultMessages.won}
          </h2>
          <PlayerAvatar
            playerName={winnerName}
            colours={colours(winner)}
            ringed
            className="size-[72px] border-[3px]! border-ludo-card-raised! text-[30px] font-normal!"
            signedIn={board.seats[winner]?.signedIn ?? false}
            isOwn={winner === viewer}
          />
          <h1 className="m-0 font-ludo-display text-[30px] leading-[1.15] font-normal wrap-anywhere" aria-live="polite">
            {resultMessages.winner(winnerName, winner === viewer)}
          </h1>
          <p className="m-0 text-sm text-ludo-ink-muted">{howWon()}</p>
        </section>
        {/* No Token reaches Home in a Game mode without it, so there's no count to show. */}
        {tokensReachHome(mode) && others.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <h2 className="m-0 text-xs font-semibold tracking-widest text-ludo-on-page-muted uppercase">
              {resultMessages.tokensHomeHeading}
            </h2>
            {others.map(({ playerName, left, standing, signedIn, index }) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-[14px] border border-ludo-row-line bg-ludo-row px-3.5 py-3"
              >
                <PlayerAvatar
                  playerName={playerName ?? ""}
                  colours={colours(index)}
                  signedIn={signedIn}
                  isOwn={index === viewer}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] leading-tight font-semibold wrap-anywhere">{playerName}</span>
                  <span className="text-xs text-ludo-on-page-muted">{notes(index, left, standing)}</span>
                </span>
                <span
                  className="flex flex-none gap-1"
                  role="img"
                  aria-label={resultMessages.tokensHome(homeCount(index))}
                >
                  {tokenSpots.map((spot) => (
                    <span
                      key={spot}
                      className={`size-3 rounded-full border-[1.5px] ${
                      spot < homeCount(index) ? "border-ludo-on-page" : "border-ludo-on-page/40"
                    }`}
                      style={spot < homeCount(index) ? { backgroundColor: colours(index).colour } : {}}
                    />
                  ))}
                </span>
              </div>
            ))}
          </section>
        )}
        <div className="flex-1 xl:hidden" />
        <BottomBar className="-mb-9">
          <Button variant="accent" onClick={onBackToStart}>
            {resultMessages.backToStart}
          </Button>
        </BottomBar>
      </div>
    </div>
  );
}
