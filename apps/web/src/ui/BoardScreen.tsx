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
  /** Rolls, settling with the server's reply, or nothing if it never came. */
  onRoll: () => Promise<{ ok: boolean } | undefined>;
  onMove: (token: number) => void;
  /** Leaves the Game during play, forfeiting it. */
  onLeaveGame: () => void;
}

/**
 * Where the viewer's own Roll is: the die tumbles once, then spins on if the server is yet to reply, and either lands
 * on the Roll or, if it didn't go through, waits to be tapped again.
 */
type RollState = "idle" | "tumbling" | "spinning" | "failed";

// The die tumbles for at least this long, and on until the server replies with the Roll. Faces flick past in a fixed
// order: the server makes every random choice in a Game, and this one isn't even a choice.
const tumbleFor = 900;
const tumbleForReducedMotion = 300;
const faceEvery = 90;
const tumbleFaces = [3, 6, 2, 5, 1, 4];

// After this long without a reply, the Player is told the die is still waiting for it.
const slowAfter = 1500;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export default function BoardScreen({
  board: latestBoard,
  disabled,
  notice,
  error,
  onRoll,
  onMove,
  onLeaveGame,
}: Props) {
  // The Board as it was when the viewer tapped the die, shown until it lands, as what came after would give the Roll
  // away: whose Turn it is, and which Tokens can Move.
  const [heldBoard, setHeldBoard] = useState<SnapshotBoard>();
  const board = heldBoard ?? latestBoard;
  const [rollState, setRollState] = useState<RollState>("idle");
  // Whether the server is taking a while to reply to the Roll.
  const [slow, setSlow] = useState(false);
  // Whether the viewer's last Roll came back, so its die lands rather than just appearing.
  const [landed, setLanded] = useState(false);
  const [tumbleFace, setTumbleFace] = useState(1);
  const rolling = rollState === "tumbling" || rollState === "spinning";

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
  // A Roll that didn't go through, while the viewer can still Roll again.
  const failed = rollState === "failed" && isOwnTurn && !rolled;
  const seatAt = (seatsFromViewer: number) => (viewer + seatsFromViewer) % board.seats.length;
  const homeCount = (seat: Seat) =>
    (board.seats[seat]?.tokens ?? []).filter((position) => position.area === "home").length;
  const playerCount = board.seats.filter((seat) => seat.playerName !== null).length;
  const otherNames = board.seats.flatMap((seat, index) =>
    index !== viewer && seat.playerName !== null && !seat.left ? [seat.playerName] : [],
  );

  const rollDie = async () => {
    let replied = false;
    setTumbleFace(tumbleFaces[0] as number);
    setLanded(false);
    setSlow(false);
    setRollState("tumbling");
    setHeldBoard(latestBoard);
    const slowTimeout = setTimeout(() => setSlow(true), slowAfter);
    // Once it's tumbled, it spins until the reply comes.
    const tumbled = wait(prefersReducedMotion() ? tumbleForReducedMotion : tumbleFor)
      .then(() => !replied && setRollState("spinning"));
    const reply = await onRoll().catch(() => undefined);
    replied = true;
    await tumbled;
    clearTimeout(slowTimeout);
    setSlow(false);
    setLanded(Boolean(reply?.ok));
    setRollState(reply?.ok ? "idle" : "failed");
    setHeldBoard(undefined);
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

  const lastMoveLine = lastMove && boardMessages.lastMove(
    playerName(lastMove.seat),
    lastMove,
    lastMove.captured.map(({ seat }) => ({ playerName: playerName(seat), isOwn: seat === viewer })),
  );
  const lastRollLine = lastRoll && boardMessages.lastRoll(playerName(lastRoll.seat), lastRoll.number);

  // What's happening now, then what came before it.
  const status = (): { title: string; detail: string | null; before: string | null } => {
    if (rolling) {
      return { title: boardMessages.rolling, detail: slow ? boardMessages.stillRolling : boardMessages.everyoneSees, before: null };
    }
    if (failed) return { title: boardMessages.rollFailed, detail: boardMessages.tapToRetry, before: null };
    if (isOwnTurn && rolled && lastRoll) {
      return { title: boardMessages.youRolled(lastRoll.number), detail: boardMessages.tapToMove, before: null };
    }
    if (isOwnTurn) return { title: boardMessages.yourTurn, detail: lastRollLine ?? boardMessages.firstRoll, before: lastMoveLine };
    const title = boardMessages.turnOf(playerName(turn));
    if (rolled && lastRoll) return { title, detail: boardMessages.choosing(lastRoll.number), before: lastMoveLine };
    return { title, detail: lastRollLine ?? boardMessages.waitingToRoll, before: lastMoveLine };
  };
  const { title, detail, before } = status();

  // The result, as it comes in, fades up.
  const titleArrives = failed || (landed && isOwnTurn && rolled);

  const dieArea = () => {
    if (rolling) {
      return (
        <Die
          number={tumbleFace}
          label={boardMessages.rollingDie}
          ringed
          className={rollState === "tumbling" ? "motion-safe:animate-die-tumble" : "motion-safe:animate-die-spin"}
        />
      );
    }
    if (failed) {
      return (
        <button
          type="button"
          className="flex size-20 flex-none cursor-pointer items-center justify-center rounded-[18px] bg-cream font-display
            text-[40px] leading-none text-danger motion-safe:animate-die-shake
            shadow-[inset_0_-6px_0_var(--color-die-shade),0_0_0_3px_var(--color-danger-line),0_8px_16px_rgba(0,0,0,0.45)]"
          aria-label={boardMessages.retryRoll}
          disabled={disabled}
          onClick={() => rollDie()}
        >
          <span aria-hidden>?</span>
        </button>
      );
    }
    if (isOwnTurn && !rolled) {
      return (
        <button
          type="button"
          className="size-20 flex-none cursor-pointer rounded-[18px] bg-cream font-display text-2xl tracking-[0.06em]
            text-maroon uppercase shadow-[inset_0_-6px_0_var(--color-die-shade),0_0_0_3px_var(--color-gold),0_8px_16px_rgba(0,0,0,0.45)]"
          disabled={disabled}
          onClick={() => rollDie()}
        >
          {boardMessages.roll}
        </button>
      );
    }
    if (!lastRoll) return <div className="size-20" />;
    const isOwn = lastRoll.seat === viewer;
    return (
      <Die
        number={lastRoll.number}
        label={isOwn
          ? boardMessages.dieShowing(lastRoll.number)
          : boardMessages.dieRolledBy(playerName(lastRoll.seat), lastRoll.number)}
        ringed={isOwn}
        className={isOwn && landed ? "motion-safe:animate-die-land" : ""}
      />
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
      {/*
        The same height whatever it says, so nothing on the screen shifts as the Turn moves on. The text and the die
        both start at the top, and each line is cut short at its most, so it always fits.
      */}
      <div className="flex h-36 w-full flex-none items-start justify-between gap-4 px-1.5 pt-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5" aria-live="polite">
          <p
            key={title}
            className={`m-0 truncate font-display leading-tight ${isOwnTurn ? "text-[26px]" : "text-2xl"} ${
              titleArrives ? "motion-safe:animate-fade-up" : ""
            }`}
          >
            {title}
          </p>
          {detail && <p className="m-0 line-clamp-2 text-sm leading-snug text-tan">{detail}</p>}
          {isOwnTurn && moves.length > 0 && !rolling && (
            <p className="m-0 mt-1 flex items-center gap-2 text-xs font-semibold text-gold-light">
              <span className="size-3.5 rounded bg-gold-light shadow-[inset_0_0_0_1.5px_#b8892b]" aria-hidden />
              {boardMessages.tokensCanMove(moves.length)}
            </p>
          )}
          {before && (
            <p className="m-0 mt-1 line-clamp-2 border-t border-ivory/16 pt-2 text-xs leading-snug text-tan">{before}</p>
          )}
        </div>
        {/* A fixed slot, the size of the die and the Roll button, so they and the text never resize each other. */}
        <div className="size-20 flex-none">{dieArea()}</div>
      </div>
      <ErrorMessage error={error} />
    </div>
  );
}
