import type { SnapshotSeat } from "@ludo/shared";
import Avatar from "./Avatar";
import { boardMessages, commonMessages } from "./messages";
import { seatView } from "./seatView";
import Tag from "./Tag";

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
    if (left) return <Tag>{boardMessages.left}</Tag>;
    if (away) return <Tag icon="away">{commonMessages.away}</Tag>;
    const emphasis = isTurn ? "font-semibold text-ludo-accent-light" : "text-ludo-on-page-muted";
    return detail && <span className={`text-xs ${emphasis}`}>{detail}</span>;
  };

  if (playerName === null) {
    return (
      <div className={`flex h-16 min-w-0 flex-1 items-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed
        border-ludo-on-page/30 px-2.5 py-2 christmas:border-ludo-page-line christmas:bg-ludo-page ${direction}`}
      >
        <span
          className="size-9 flex-none rounded-full border-2 border-dashed border-ludo-on-page/45
            christmas:border-ludo-page-line"
          aria-hidden
        />
        <span className="text-sm text-ludo-on-page-muted">{boardMessages.emptySeat}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex h-16 min-w-0 flex-1 items-center gap-2.5 rounded-[14px] px-2.5 py-2 xl:flex-none ${direction} ${
        isTurn ? "border-2 border-ludo-accent bg-ludo-turn-card" : "border border-ludo-row-line bg-ludo-row"
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
