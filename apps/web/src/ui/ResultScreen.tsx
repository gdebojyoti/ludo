import {
  classicRules,
  isWonByCapture,
  seatsClockwise,
  tokensReachHome,
  wonByMove,
  type GameMode,
  type Seat,
  type SnapshotBoard,
} from "@ludo/shared";
import Avatar from "./Avatar";
import { homeCountAt, playerNameAt, seatViewOf } from "./boardView";
import Header from "./Header";
import { boardMessages, commonMessages, resultMessages } from "./messages";

interface Props {
  mode: GameMode;
  /** The Board of a won Game. */
  board: SnapshotBoard;
  onBackToStart: () => void;
}

const tokenSpots = Array.from({ length: classicRules.tokensPerSeat }, (_, spot) => spot);

export default function ResultScreen({ mode, board, onBackToStart }: Props) {
  const winner = board.winner ?? board.turn;
  const viewer = board.seat;
  const colours = (seat: Seat) => seatViewOf(board, seat);
  const winnerSeat = board.seats[winner];
  const winnerName = playerNameAt(board, winner);
  const homeCount = (seat: Seat) => homeCountAt(board, seat);
  // Everyone else, in Seat order from the viewer's.
  const others = board.seats
    .map((seat, index) => ({ ...seat, index }))
    .filter(({ playerName, index }) => playerName !== null && index !== winner)
    .sort((a, b) => seatsClockwise(viewer, a.index) - seatsClockwise(viewer, b.index));

  const named = (seat: Seat) => ({ playerName: playerNameAt(board, seat), isOwn: seat === viewer });

  // How the winner won: by their last Move, as the Game mode's rules say, or, if not, by everyone else Leaving.
  const howWon = () => {
    const { lastMove } = board;
    const captured = lastMove?.seat === winner ? lastMove.captured : [];
    if (!wonByMove(mode, { tokens: winnerSeat?.tokens ?? [], captured })) return resultMessages.othersLeft;
    if (!isWonByCapture(mode)) return resultMessages.allHome;
    return resultMessages.capture(named(winner), captured.map(({ seat }) => named(seat)));
  };

  return (
    <div className="flex flex-1 flex-col gap-[22px] px-5 pt-3.5 pb-9">
      <Header subtitle={resultMessages.subtitle} />
      <section
        className="flex flex-col items-center gap-3 rounded-[22px] border-t-8 bg-ludo-ivory px-[22px] py-[26px] text-center
          text-ludo-maroon"
        style={{ borderTopColor: colours(winner).colour }}
      >
        <h2 className="m-0 text-xs font-bold tracking-[0.14em] text-ludo-brown uppercase">{resultMessages.won}</h2>
        <Avatar
          playerName={winnerName}
          colours={colours(winner)}
          ringed
          className="size-[72px] border-[3px]! border-ludo-cream! text-[30px] font-normal!"
        />
        <h1 className="m-0 font-ludo-display text-[30px] leading-[1.15] font-normal wrap-anywhere" aria-live="polite">
          {resultMessages.winner(winnerName, winner === viewer)}
        </h1>
        <p className="m-0 text-sm text-ludo-brown">{howWon()}</p>
      </section>
      {/* No Token reaches Home in a Game mode without it, so there's no count to show. */}
      {tokensReachHome(mode) && others.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="m-0 text-xs font-semibold tracking-widest text-ludo-tan uppercase">
            {resultMessages.tokensHomeHeading}
          </h2>
          {others.map(({ playerName, left, index }) => (
            <div
              key={index}
              className="flex items-center gap-3 rounded-[14px] border border-ludo-ivory/16 bg-ludo-ivory/7 px-3.5 py-3"
            >
              <Avatar playerName={playerName ?? ""} colours={colours(index)} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] leading-tight font-semibold wrap-anywhere">{playerName}</span>
                {(index === viewer || left) && (
                  <span className="text-xs text-ludo-tan">{left ? boardMessages.left : commonMessages.you}</span>
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
                      spot < homeCount(index) ? "border-ludo-ivory" : "border-ludo-ivory/40"
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
