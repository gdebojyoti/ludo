import type { SnapshotSeat } from "@ludo/shared";
import Avatar from "./Avatar";
import AwayTag from "./AwayTag";
import { boardMessages } from "./messages";
import { seatView } from "./seatView";

interface Props {
  seat: SnapshotSeat;
  /** How many Seats clockwise from the viewer's this Seat is, which sets its colour. */
  seatsFromViewer: number;
  /** Cards on the right mirror those on the left, with the avatar on the right. */
  mirrored: boolean;
  isTurn: boolean;
  /** What's under the Player name, such as whether it's the viewer and how many of their Tokens are Home. */
  detail: string;
}

export default function PlayerCard({ seat, seatsFromViewer, mirrored, isTurn, detail }: Props) {
  const { playerName, left, away } = seat;
  const direction = mirrored ? "flex-row-reverse text-right" : "";

  // What's under the Player name: whether they Left or are Away, which matters more than the detail it replaces.
  const belowName = () => {
    if (left) {
      return (
        <span className="flex h-[18px] items-center rounded-[9px] bg-tan px-[7px] text-[11px] font-bold text-maroon">
          {boardMessages.left}
        </span>
      );
    }
    if (away) return <AwayTag size="card" />;
    const emphasis = isTurn ? "font-semibold text-gold-light" : "text-tan";
    return detail && <span className={`text-xs ${emphasis}`}>{detail}</span>;
  };

  if (playerName === null) {
    return (
      <div className={`flex h-16 min-w-0 flex-1 items-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed
        border-ivory/30 px-2.5 py-2 ${direction}`}
      >
        <span className="size-9 flex-none rounded-full border-2 border-dashed border-ivory/45" aria-hidden />
        <span className="text-sm text-tan">{boardMessages.emptySeat}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex h-16 min-w-0 flex-1 items-center gap-2.5 rounded-[14px] px-2.5 py-2 ${direction} ${
        isTurn ? "border-2 border-gold bg-gold/14" : "border border-ivory/16 bg-ivory/7"
      }`}
    >
      <Avatar playerName={playerName} colours={seatView(seatsFromViewer)} ringed={isTurn} away={away} />
      <span className={`flex min-w-0 flex-col gap-0.5 ${mirrored ? "items-end" : ""}`}>
        <span className="line-clamp-2 text-sm leading-tight font-semibold wrap-anywhere">{playerName}</span>
        {belowName()}
      </span>
    </div>
  );
}
