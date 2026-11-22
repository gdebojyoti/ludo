import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { allMovesAlike, tumbleFor, type GameMode, type Seat, type SnapshotBoard } from "@ludo/shared";
import Board from "./Board";
import Die from "./Die";
import ErrorMessage from "./ErrorMessage";
import Header from "./Header";
import LeaveButton from "./LeaveButton";
import Notice from "./Notice";
import PlayerCard from "./PlayerCard";
import { homeCountAt, playerNameAt, seatAt } from "./boardView";
import { boardMessages, commonMessages, leaveMessages } from "./messages";
import { faceEvery, prefersReducedMotion, tumbleFaces, tumbleForReducedMotion } from "./motion";
import { useSettings } from "./settings";
import { playSound } from "./sound";
import { useBoardPlayback } from "./useBoardPlayback";

interface Props {
  mode: GameMode;
  board: SnapshotBoard;
  /** Whether the Game is still in play, not over in any way. */
  playing: boolean;
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

// With autoplay on, how long after the Board is ready for a Move one is made by itself, so the Player sees their Roll.
const autoplayAfter = 200;

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export default function BoardScreen({
  mode,
  board: latestBoard,
  playing,
  disabled,
  notice,
  error,
  onRoll,
  onMove,
  onLeaveGame,
  onPlayedOut,
}: Props) {
  const playback = useBoardPlayback(latestBoard);
  const { playedRoll, moving, returning } = playback;
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

  // Every Player hears the die as it starts tumbling, whoever Rolled.
  useEffect(() => {
    if (tumbling) playSound("dieRoll");
  }, [tumbling]);

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

  // The viewer hears their Turn start as the Board shows it, once what came before has played out. That's when the
  // Game starts, too, if they go first, but not when they Roll again in the same Turn. Never once the Game is over,
  // however it ended: as when the only other Player Leaves and the Turn passes to the viewer, the winner.
  const turnStarts = isOwnTurn && playing;
  useEffect(() => {
    if (turnStarts) playSound("notifyTurn");
  }, [turnStarts]);

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

  // The index of the last Roll the viewer Moved a Token by, whether they picked it or autoplay did.
  const movedByRoll = useRef<number>(undefined);

  // The Move is sent at once, and the Token starts sliding at once, a Cell at a time, unless motion is reduced.
  const moveToken = async (token: number) => {
    movedByRoll.current = lastRoll?.index;
    playback.startOwnMove(token);
    const reply = await onMove(token).catch(() => undefined);
    playback.ownMoveAnswered(Boolean(reply?.ok));
  };

  // With autoplay on, when every Token the viewer can Move is in the same place, so there's no choice to make, one of
  // them, picked at random, Moves by itself soon after the Board is ready for it. The Player can still pick one first.
  // It's never made for a Roll the viewer has already Moved by, so a Move the server refused, whoever picked it, is left
  // to the Player.
  const { diceOnLeft, autoplay } = useSettings();
  const ownTokens = board.seats[viewer]?.tokens ?? [];
  const rollToAutoplay = autoplay && playing && !disabled && isOwnTurn && rolled && allMovesAlike(ownTokens, moves)
    ? lastRoll?.index
    : undefined;
  const autoplayMove = useEffectEvent(() => moveToken(moves[Math.floor(Math.random() * moves.length)] as number));
  useEffect(() => {
    if (rollToAutoplay === undefined || movedByRoll.current === rollToAutoplay) return;
    const timeout = setTimeout(autoplayMove, autoplayAfter);
    return () => clearTimeout(timeout);
  }, [rollToAutoplay]);

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
        key={seatsFromViewer}
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
          className="ludo-die flex cursor-pointer touch-manipulation items-center justify-center font-ludo-display
            text-[40px] leading-none text-ludo-danger select-none [-webkit-touch-callout:none]
            [--ludo-die-ring:var(--color-ludo-danger-line)] motion-safe:animate-ludo-die-shake"
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
          className="ludo-die cursor-pointer touch-manipulation font-ludo-display text-2xl tracking-[0.06em]
            text-ludo-ink uppercase select-none [-webkit-touch-callout:none] [--ludo-die-ring:var(--color-ludo-accent)]
            motion-safe:animate-ludo-die-wiggle"
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

  // On phones, the Player cards are in a row above the Board and a row below it, by where their Seats are on it. On
  // desktop, they're in a list on the left, the viewer's first and then clockwise, and the Seats nobody has are left
  // out, as the list doesn't stand for the Board. Each layout has its own cards, hidden in the other.
  const desktopCards = [0, 1, 2, 3].map((seatsFromViewer) =>
    board.seats[seatAt(board, seatsFromViewer)]?.playerName === null ? null : card(seatsFromViewer, false),
  );

  // On desktop, the header is a bar across the window, and below it the Players, the Board and the Turn status are in
  // three columns, top-aligned. The Board is as big as the window's height allows, less the header, the space round the
  // columns and its own frame, or as wide as is left once the side columns have their least width (250px for the
  // Players, 300px for the Turn status) and the 56px gaps between columns, whichever is smaller, and never more than
  // 750px across, so it doesn't fill large screens. The Players column then takes what's left, up to 300px.
  //
  // The columns sit in the middle of the height below the header, unless that would leave more than 150px above them,
  // besides the 32px padding: then they're 150px down, and the rest of the space is below them. The Board is always the
  // tallest column, so the space to share is the window's height less the header (85px), the padding above and below
  // the columns (32px and 40px) and the Board.
  //
  // The Board's size uses the screen's width in cqw, as it's a size container, not %: in the padding, % would mean a
  // different width than in the columns, and the gap above would be worked out for the wrong size of Board. The width
  // left for the Board is the screen's width less the padding at the sides (40px each) and the other columns and gaps.
  //
  // The wrappers that make those columns are left out of the layout on phones, where it's one column, and the Notice,
  // above the cards there, is above the Turn status on desktop.
  return (
    <div className="flex flex-1 flex-col items-center gap-3.5 px-[15px] pt-3.5 pb-7 xl:@container xl:gap-0 xl:p-0">
      <Header
        subtitle={boardMessages.subtitle(mode, playerCount)}
        action={<LeaveButton disabled={disabled} text={leaveMessages.inPlay(otherNames)} onLeave={onLeaveGame} />}
      />
      <div
        className="contents xl:grid xl:w-full xl:flex-1 xl:content-start xl:items-start xl:justify-center xl:gap-14
          xl:px-10 xl:pb-10 xl:grid-cols-[minmax(250px,300px)_var(--ludo-board-size)_300px]
          xl:[--ludo-board-size:min(max(320px,calc(100dvh-170px)),calc(100cqw-742px),750px)]
          xl:pt-[calc(32px+clamp(0px,calc((100dvh-157px-var(--ludo-board-size))/2),150px))]"
      >
        <section className="hidden xl:flex xl:flex-col xl:gap-2.5" aria-labelledby="players-heading">
          <h2 id="players-heading" className="m-0 mb-1 text-xs font-semibold tracking-widest text-ludo-on-page-muted uppercase">
            {boardMessages.playersHeading}
          </h2>
          {desktopCards}
        </section>
        <div className="contents xl:block">
          <div className="contents xl:hidden">
            <Notice notice={notice} />
          </div>
          <div className="flex w-full gap-2.5 xl:hidden">
            {card(1, false)}
            {card(2, true)}
          </div>
          <Board
            mode={mode}
            board={board}
            disabled={disabled}
            onMove={moveToken}
            moving={moving}
            returning={returning}
            onArrived={playback.tokenArrived}
          />
          <div className="flex w-full gap-2.5 xl:hidden">
            {card(0, false)}
            {card(3, true)}
          </div>
        </div>
        <div className="contents xl:flex xl:flex-col xl:gap-7">
          <div className="hidden xl:contents">
            <Notice notice={notice} />
          </div>
          {/*
            The Turn status, beside the die, or on desktop above it. The same height whatever it says, so nothing on
            the screen shifts as the Turn moves on. The text and the die both start at the top, and the title and the
            detail are each cut short at two lines, so they always fit. On desktop, the text is always at least as tall
            as a line of title and two of detail, so the die below it stays put. On another Player's Turn, both are
            dimmed.
          */}
          <div
            className={`flex ${diceOnLeft ? "flex-row-reverse" : ""} h-36 w-full flex-none items-start justify-between
              gap-4 px-1.5 pt-2 xl:h-auto xl:flex-col xl:justify-start xl:gap-7 xl:p-0`}
          >
            <div
              className={`flex min-w-0 flex-1 flex-col gap-1.5 ${isOwnTurn ? "" : "opacity-75"} ${
                diceOnLeft ? "items-end text-right" : ""
              } xl:min-h-[85px] xl:w-full xl:flex-none xl:items-start xl:text-left`}
              aria-live="polite"
            >
              <p className="m-0 line-clamp-2 font-ludo-display text-2xl leading-tight xl:text-[30px]">{title}</p>
              {detail && <p className="m-0 line-clamp-2 text-sm leading-snug text-ludo-on-page-muted xl:text-[15px]">{detail}</p>}
            </div>

            {/* A fixed slot, the size of the die and the Roll button, so they and the text never resize each other. */}
            <div className={`size-20 flex-none ${isOwnTurn ? "" : "opacity-85"}`}>
              {dieArea()}
            </div>
          </div>
          <ErrorMessage error={error} />
        </div>
      </div>
    </div>
  );
}
