import { useEffect, useState } from "react";
import type { Seat, SnapshotBoard } from "@ludo/shared";
import Board from "./Board";
import Die from "./Die";
import ErrorMessage from "./ErrorMessage";
import Header from "./Header";
import LeaveButton from "./LeaveButton";
import Notice from "./Notice";
import PlayerCard from "./PlayerCard";
import { boardMessages, commonMessages, leaveMessages } from "./messages";

interface Props {
  board: SnapshotBoard;
  disabled: boolean;
  /** Something that happened without the Player doing it, such as opening a Join link while in this Game. */
  notice: string | undefined;
  error: string | undefined;
  /** Rolls, settling once the server has replied. */
  onRoll: () => Promise<unknown>;
  onMove: (token: number) => void;
  /** Leaves the Game during play, forfeiting it. */
  onLeaveGame: () => void;
}

// The die tumbles for at least this long, and on until the server replies with the Roll. Faces flick past in a fixed
// order: the server makes every random choice in a Game, and this one isn't even a choice.
const tumbleFor = 900;
const tumbleForReducedMotion = 300;
const faceEvery = 90;
const tumbleFaces = [3, 6, 2, 5, 1, 4];

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export default function BoardScreen({ board, disabled, notice, error, onRoll, onMove, onLeaveGame }: Props) {
  const [rolling, setRolling] = useState(false);
  const [tumbleFace, setTumbleFace] = useState(1);

  useEffect(() => {
    if (!rolling || prefersReducedMotion()) return;
    let flicks = 0;
    const interval = setInterval(() => setTumbleFace(tumbleFaces[flicks++ % tumbleFaces.length] as number), faceEvery);
    return () => clearInterval(interval);
  }, [rolling]);

  // Players are named by their Player name, never by colour, as each sees the Seats in different colours.
  const playerName = (seat: Seat) => board.seats[seat]?.playerName ?? "";
  const viewer = board.seat;
  const { turn, rolled, lastRoll, lastMove, moves } = board;
  const isOwnTurn = turn === viewer;
  const seatAt = (seatsFromViewer: number) => (viewer + seatsFromViewer) % board.seats.length;
  const homeCount = (seat: Seat) =>
    (board.seats[seat]?.tokens ?? []).filter((position) => position.area === "home").length;
  const playerCount = board.seats.filter((seat) => seat.playerName !== null).length;
  const otherNames = board.seats.flatMap((seat, index) =>
    index !== viewer && seat.playerName !== null && !seat.left ? [seat.playerName] : [],
  );
  // The places the viewer can Move a Token from: Tokens in the same place would all end up in the same place too.
  const placesToMoveFrom = new Set(moves.map((token) => JSON.stringify(board.seats[viewer]?.tokens[token]))).size;

  const rollDie = async () => {
    setTumbleFace(tumbleFaces[0] as number);
    setRolling(true);
    await Promise.all([onRoll(), wait(prefersReducedMotion() ? tumbleForReducedMotion : tumbleFor)]);
    setRolling(false);
  };

  const cardDetail = (seat: Seat) => {
    const home = homeCount(seat) > 0 ? boardMessages.home(homeCount(seat)) : "";
    if (seat === viewer) {
      // What the viewer should do now, if anything, takes the place of their count Home, so the line stays short.
      const now = !isOwnTurn
        ? ""
        : rolling ? boardMessages.rollingShort : moves.length ? boardMessages.pickToken : rolled ? "" : boardMessages.yourTurnShort;
      return [commonMessages.you, now || home].filter(Boolean).join(" · ");
    }
    const now = seat === turn && rolled && lastRoll?.seat === seat ? boardMessages.rolledShort(lastRoll.number) : "";
    return [now, home].filter(Boolean).join(" · ");
  };

  const card = (seatsFromViewer: number, mirrored: boolean) => {
    const seat = seatAt(seatsFromViewer);
    const snapshotSeat = board.seats[seat];
    if (!snapshotSeat) return null;
    return (
      <PlayerCard
        seat={snapshotSeat}
        seatsFromViewer={seatsFromViewer}
        mirrored={mirrored}
        isTurn={seat === turn}
        detail={cardDetail(seat)}
      />
    );
  };

  const lastMoveLine = lastMove && boardMessages.lastMove(playerName(lastMove.seat), lastMove);
  const lastRollLine = lastRoll && boardMessages.lastRoll(playerName(lastRoll.seat), lastRoll.number);

  // What's happening now, then what came before it.
  const status = (): { title: string; detail: string | null; before: string | null } => {
    if (rolling) return { title: boardMessages.rolling, detail: null, before: null };
    if (isOwnTurn && rolled && lastRoll) {
      return { title: boardMessages.youRolled(lastRoll.number), detail: boardMessages.tapToMove, before: null };
    }
    if (isOwnTurn) return { title: boardMessages.yourTurn, detail: lastRollLine ?? boardMessages.firstRoll, before: lastMoveLine };
    const title = boardMessages.turnOf(playerName(turn));
    if (rolled && lastRoll) return { title, detail: boardMessages.choosing(lastRoll.number), before: lastMoveLine };
    return { title, detail: lastRollLine ?? boardMessages.waitingToRoll, before: lastMoveLine };
  };
  const { title, detail, before } = status();

  const dieArea = () => {
    if (rolling) return <Die number={tumbleFace} ringed />;
    if (isOwnTurn && !rolled) {
      return (
        <button
          type="button"
          className="size-[88px] flex-none cursor-pointer rounded-[20px] bg-cream font-display text-2xl tracking-[0.06em]
            text-maroon uppercase shadow-[inset_0_-6px_0_var(--color-die-shade),0_0_0_3px_var(--color-gold),0_8px_16px_rgba(0,0,0,0.45)]"
          disabled={disabled}
          onClick={rollDie}
        >
          {boardMessages.roll}
        </button>
      );
    }
    if (!lastRoll) return null;
    const isOwn = lastRoll.seat === viewer;
    return (
      <div className="flex flex-none flex-col items-center gap-1.5">
        <Die
          number={lastRoll.number}
          label={isOwn
            ? boardMessages.dieShowing(lastRoll.number)
            : boardMessages.dieRolledBy(playerName(lastRoll.seat), lastRoll.number)}
          ringed={isOwn}
        />
        <span className="text-xs text-tan">{boardMessages.dieCaption(playerName(lastRoll.seat), isOwn)}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-3.5 px-[15px] pt-3.5 pb-7">
      <Header
        subtitle={boardMessages.subtitle(playerCount)}
        action={<LeaveButton disabled={disabled} text={leaveMessages.inPlay(otherNames)} onLeave={onLeaveGame} />}
      />
      <Notice notice={notice} />
      <div className="flex w-full gap-2.5">
        {card(1, false)}
        {card(2, true)}
      </div>
      <Board board={board} disabled={disabled} onMove={onMove} />
      <div className="flex w-full gap-2.5">
        {card(0, false)}
        {card(3, true)}
      </div>
      <div className="flex w-full flex-1 items-center justify-between gap-4 px-1.5">
        <div className="flex min-w-0 flex-col gap-1.5" aria-live="polite">
          <p className={`m-0 font-display leading-tight ${isOwnTurn ? "text-[26px]" : "text-2xl"}`}>{title}</p>
          {detail && <p className="m-0 text-sm leading-snug text-tan">{detail}</p>}
          {isOwnTurn && moves.length > 0 && !rolling && (
            <p className="m-0 mt-1 flex items-center gap-2 text-xs font-semibold text-gold-light">
              <span className="size-3.5 rounded bg-gold-light shadow-[inset_0_0_0_1.5px_#b8892b]" aria-hidden />
              {boardMessages.placesToMoveFrom(placesToMoveFrom)}
            </p>
          )}
          {before && (
            <p className="m-0 mt-1 border-t border-ivory/16 pt-2 text-xs leading-snug text-tan">{before}</p>
          )}
        </div>
        {dieArea()}
      </div>
      <ErrorMessage error={error} />
    </div>
  );
}
