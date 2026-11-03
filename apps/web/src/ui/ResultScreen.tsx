import { classicRules, hasWon, seatsClockwise, type Seat, type SnapshotBoard } from "@ludo/shared";
import Avatar from "./Avatar";
import Header from "./Header";
import { boardMessages, commonMessages, resultMessages } from "./messages";
import { seatView } from "./seatView";

interface Props {
  /** The Board of a won Game. */
  board: SnapshotBoard;
  onBackToStart: () => void;
}

const tokenSpots = Array.from({ length: classicRules.tokensPerSeat }, (_, spot) => spot);

export default function ResultScreen({ board, onBackToStart }: Props) {
  const winner = board.winner ?? board.turn;
  const viewer = board.seat;
  const colours = (seat: Seat) => seatView(seatsClockwise(viewer, seat));
  const winnerSeat = board.seats[winner];
  const winnerName = winnerSeat?.playerName ?? "";
  const homeCount = (seat: Seat) =>
    (board.seats[seat]?.tokens ?? []).filter((position) => position.area === "home").length;
  // Everyone else, in Seat order from the viewer's.
  const others = board.seats
    .map((seat, index) => ({ ...seat, index }))
    .filter(({ playerName, index }) => playerName !== null && index !== winner)
    .sort((a, b) => seatsClockwise(viewer, a.index) - seatsClockwise(viewer, b.index));

  return (
    <div className="flex flex-1 flex-col gap-[22px] px-5 pt-3.5 pb-9">
      <Header subtitle={resultMessages.subtitle} />
      <section
        className="flex flex-col items-center gap-3 rounded-[22px] border-t-8 bg-ivory px-[22px] py-[26px] text-center
          text-maroon"
        style={{ borderTopColor: colours(winner).colour }}
      >
        <h2 className="m-0 text-xs font-bold tracking-[0.14em] text-brown uppercase">{resultMessages.won}</h2>
        <Avatar
          playerName={winnerName}
          colours={colours(winner)}
          ringed
          className="size-[72px] border-[3px]! border-cream! text-[30px] font-normal!"
        />
        <h1 className="m-0 font-display text-[30px] leading-[1.15] font-normal wrap-anywhere" aria-live="polite">
          {resultMessages.winner(winnerName, winner === viewer)}
        </h1>
        <p className="m-0 text-sm text-brown">
          {hasWon(winnerSeat?.tokens ?? []) ? resultMessages.allHome : resultMessages.othersLeft}
        </p>
      </section>
      {others.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-xs font-semibold tracking-widest text-tan uppercase">{resultMessages.tokensHomeHeading}</h2>
          {others.map(({ playerName, left, index }) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-[14px] border border-ivory/16 bg-ivory/7 px-3.5 py-3"
            >
              <Avatar playerName={playerName ?? ""} colours={colours(index)} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] leading-tight font-semibold wrap-anywhere">{playerName}</span>
                {(index === viewer || left) && (
                  <span className="text-xs text-tan">{left ? boardMessages.left : commonMessages.you}</span>
                )}
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
                      spot < homeCount(index) ? "border-ivory" : "border-ivory/40"
                    }`}
                    style={spot < homeCount(index) ? { backgroundColor: colours(index).colour } : {}}
                  />
                ))}
              </span>
            </div>
          ))}
        </section>
      )}
      <div className="flex-1" />
      <button type="button" className="ludo-button-gold" onClick={onBackToStart}>{resultMessages.backToStart}</button>
    </div>
  );
}
