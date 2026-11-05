import { useEffect, useEffectEvent, useLayoutEffect, useState } from "react";
import type { GameMode, Seat, SnapshotBoard } from "@ludo/shared";
import Board from "./Board";
import Die from "./Die";
import ErrorMessage from "./ErrorMessage";
import Header from "./Header";
import LeaveButton from "./LeaveButton";
import Notice from "./Notice";
import PlayerCard from "./PlayerCard";
import { homeCountAt, playerNameAt, seatAt } from "./boardView";
import { boardMessages, commonMessages, leaveMessages } from "./messages";
import { faceEvery, prefersReducedMotion, tumbleFaces, tumbleFor, tumbleForReducedMotion } from "./motion";
import { useBoardPlayback } from "./useBoardPlayback";

interface Props {
  mode: GameMode;
  board: SnapshotBoard;
  disabled: boolean;
  /** Something that happened without the Player doing it, such as opening a Join link while in this Game. */
  notice: string | undefined;
  error: string | undefined;
  /** Rolls, settling with the server's reply, or nothing if it never came. */
  onRoll: () => Promise<{ ok: boolean } | undefined>;
  /** Moves the Token, settling with the server's reply, or nothing if it never came. */
  onMove: (token: number) => Promise<{ ok: boolean } | undefined>;
  /** Leaves the Game during play, forfeiting it. */
  onLeaveGame: () => void;
  /** Called once a won Game has played out its last Move, so its result can be shown. */
  onPlayedOut: () => void;
}

/**
 * Where the viewer's own Roll is: the die tumbles once, then spins on if the server is yet to reply, and either lands
 * on the Roll or, if it didn't go through, waits to be tapped again.
 */
type RollState = "idle" | "tumbling" | "spinning" | "failed";

// After this long without a reply, the Player is told the die is still waiting for it.
const slowAfter = 1500;

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export default function BoardScreen({
  mode,
  board: latestBoard,
  disabled,
  notice,
  error,
  onRoll,
  onMove,
  onLeaveGame,
  onPlayedOut,
}: Props) {
  const playback = useBoardPlayback(latestBoard);
  const { playedRoll, moving } = playback;
  // The Board as it was when the viewer tapped the die, shown until it lands, as what came after would give the Roll
  // away: whose Turn it is, and which Tokens can Move.
  const [heldBoard, setHeldBoard] = useState<SnapshotBoard>();
  const board = heldBoard ?? playback.board;
  const [rollState, setRollState] = useState<RollState>("idle");
  // Whether the server is taking a while to reply to the Roll.
  const [slow, setSlow] = useState(false);
  // Whether the viewer's last Roll came back, so its die lands rather than just appearing.
  const [landed, setLanded] = useState(false);
  const [tumbleFace, setTumbleFace] = useState(1);
  const rolling = rollState === "tumbling" || rollState === "spinning";
  const viewer = board.seat;
  const tumbling = rolling || (playedRoll !== undefined && !playedRoll.landed);

  useEffect(() => {
    if (!tumbling || prefersReducedMotion()) return;
    let flicks = 0;
    const interval = setInterval(() => setTumbleFace(tumbleFaces[flicks++ % tumbleFaces.length] as number), faceEvery);
    return () => clearInterval(interval);
  }, [tumbling]);

  // A won Game shows its result once the Board has nothing left to play out. Before the screen is painted, so the
  // Board never flashes up as it was left.
  const playedOut = !heldBoard && playback.playedOut;
  const showResult = useEffectEvent(onPlayedOut);
  useLayoutEffect(() => {
    if (playedOut && latestBoard.winner !== null) showResult();
  }, [playedOut, latestBoard.winner]);

  const playerName = (seat: Seat) => playerNameAt(board, seat);
  const { turn, rolled, lastRoll, moves, extraRoll } = board;
  const isOwnTurn = turn === viewer;
  // A Roll that didn't go through, while the viewer can still Roll again.
  const failed = rollState === "failed" && isOwnTurn && !rolled;
  const playerCount = board.seats.filter((seat) => seat.playerName !== null).length;
  const otherNames = board.seats.flatMap((seat, index) =>
    index !== viewer && seat.playerName !== null && !seat.left ? [seat.playerName] : [],
  );

  const rollDie = async () => {
    let replied = false;
    const before = latestBoard;
    setTumbleFace(tumbleFaces[0] as number);
    setLanded(false);
    setSlow(false);
    setRollState("tumbling");
    setHeldBoard(before);
    playback.startOwnRoll();
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
    playback.ownRollLanded(before, Boolean(reply?.ok));
    setHeldBoard(undefined);
  };

  // The Move is sent at once, and the Token starts sliding at once, a Cell at a time, unless motion is reduced.
  const moveToken = async (token: number) => {
    playback.startOwnMove(token);
    const reply = await onMove(token).catch(() => undefined);
    playback.ownMoveAnswered(Boolean(reply?.ok));
  };

  // What the viewer should do now, if anything.
  const viewerNow = () => {
    if (playedRoll?.seat === viewer) return playedRoll.landed ? "" : boardMessages.rollingShort;
    if (!isOwnTurn) return "";
    if (rolling) return boardMessages.rollingShort;
    if (moves.length) return boardMessages.pickToken;
    if (rolled) return "";
    return extraRoll ? boardMessages.rollAgainShort : boardMessages.yourTurnShort;
  };

  // What another Seat's Player is doing now, if anything.
  const otherNow = (seat: Seat) => {
    if (playedRoll?.seat === seat) {
      return playedRoll.landed ? boardMessages.rolledShort(playedRoll.number) : boardMessages.rollingShort;
    }
    if (seat !== turn) return "";
    if (rolled && lastRoll?.seat === seat) return boardMessages.rolledShort(lastRoll.number);
    return extraRoll ? boardMessages.rollsAgainShort : "";
  };

  const cardDetail = (seat: Seat) => {
    const homeCount = homeCountAt(board, seat);
    const home = homeCount > 0 ? boardMessages.home(homeCount) : "";
    // What the viewer should do now, if anything, takes the place of their count Home, so the line stays short.
    if (seat === viewer) return [commonMessages.you, viewerNow() || home].filter(Boolean).join(" · ");
    return [otherNow(seat), home].filter(Boolean).join(" · ");
  };

  const card = (seatsFromViewer: number, mirrored: boolean) => {
    const seat = seatAt(board, seatsFromViewer);
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

  // The Turn status: whose Turn the Board shows, and on the viewer's own, what they need to know to take it. Whose
  // Turn it is follows the Board, so it changes only once a Roll or Move has played out. The detail doesn't wait for
  // the Board to say the server is slow with the viewer's Roll, or that it didn't go through.
  const status = (): { title: string; detail: string | null } => {
    if (!isOwnTurn) {
      // The Game waits for a Player who is Away on their Turn, however long they're gone.
      const detail = board.seats[turn]?.away ? boardMessages.isAway(playerName(turn)) : null;
      return { title: boardMessages.waitingForTurn, detail };
    }
    const title = boardMessages.yourTurn;
    if (rolling && slow) return { title, detail: boardMessages.stillRolling };
    if (failed) return { title, detail: boardMessages.rollFailed };
    if (rolled) return { title, detail: boardMessages.tapToMove };
    if (extraRoll) return { title, detail: boardMessages.rollAgain };
    return { title, detail: boardMessages.rollToStart };
  };
  const { title, detail } = status();

  const dieArea = () => {
    if (rolling) {
      return (
        <Die
          number={tumbleFace}
          label={boardMessages.rollingDie}
          ringed
          className={rollState === "tumbling" ? "motion-safe:animate-ludo-die-tumble" : "motion-safe:animate-ludo-die-spin"}
        />
      );
    }
    if (playedRoll) {
      const { seat, number } = playedRoll;
      const isOwn = seat === viewer;
      if (!playedRoll.landed) {
        return (
          <Die
            number={tumbleFace}
            label={boardMessages.rollingDie}
            ringed={isOwn}
            className="motion-safe:animate-ludo-die-tumble"
          />
        );
      }
      return (
        <Die
          number={number}
          label={isOwn ? boardMessages.dieShowing(number) : boardMessages.dieRolledBy(playerName(seat), number)}
          ringed={isOwn}
          className="motion-safe:animate-ludo-die-land"
        />
      );
    }
    if (failed) {
      return (
        <button
          type="button"
          className="ludo-die flex cursor-pointer items-center justify-center font-ludo-display text-[40px] leading-none
            text-ludo-danger [--ludo-die-ring:var(--color-ludo-danger-line)] motion-safe:animate-ludo-die-shake"
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
          className="ludo-die cursor-pointer font-ludo-display text-2xl tracking-[0.06em] text-ludo-maroon uppercase
            [--ludo-die-ring:var(--color-ludo-gold)]"
          disabled={disabled}
          onClick={() => rollDie()}
        >
          {boardMessages.roll}
        </button>
      );
    }
    // Before the first Roll, the die shows how many Players the Game started with: a small Easter egg.
    if (!lastRoll) return <Die number={playerCount} />;
    const isOwn = lastRoll.seat === viewer;
    return (
      <Die
        number={lastRoll.number}
        label={isOwn
          ? boardMessages.dieShowing(lastRoll.number)
          : boardMessages.dieRolledBy(playerName(lastRoll.seat), lastRoll.number)}
        ringed={isOwn}
        className={isOwn && landed ? "motion-safe:animate-ludo-die-land" : ""}
      />
    );
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-3.5 px-[15px] pt-3.5 pb-7">
      <Header
        subtitle={boardMessages.subtitle(mode, playerCount)}
        action={<LeaveButton disabled={disabled} text={leaveMessages.inPlay(otherNames)} onLeave={onLeaveGame} />}
      />
      <Notice notice={notice} />
      <div className="flex w-full gap-2.5">
        {card(1, false)}
        {card(2, true)}
      </div>
      <Board
        mode={mode}
        board={board}
        disabled={disabled}
        onMove={moveToken}
        moving={moving}
        onArrived={playback.tokenArrived}
      />
      <div className="flex w-full gap-2.5">
        {card(0, false)}
        {card(3, true)}
      </div>
      {/*
        The Turn status, beside the die. The same height whatever it says, so nothing on the screen shifts as the Turn
        moves on. The text and the die both start at the top, and the title and the detail are each cut short at two
        lines, so they always fit. On another Player's Turn, both are dimmed.
      */}
      <div className="flex h-36 w-full flex-none items-start justify-between gap-4 px-1.5 pt-2">
        <div
          className={`flex min-w-0 flex-1 flex-col gap-1.5 ${isOwnTurn ? "" : "opacity-75"}`}
          aria-live="polite"
        >
          <p className="m-0 line-clamp-2 font-ludo-display text-2xl leading-tight">{title}</p>
          {detail && <p className="m-0 line-clamp-2 text-sm leading-snug text-ludo-tan">{detail}</p>}
        </div>
        {/* A fixed slot, the size of the die and the Roll button, so they and the text never resize each other. */}
        <div className={`size-20 flex-none ${isOwnTurn ? "" : "opacity-85"}`}>
          {dieArea()}
        </div>
      </div>
      <ErrorMessage error={error} />
    </div>
  );
}
