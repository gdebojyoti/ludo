import type { GameSnapshot } from "@ludo/shared";
import Frost from "./Frost";
import Header from "./Header";
import Icon from "./Icon";
import { resultMessages } from "./messages";

interface Props {
  /** A Game its Host cancelled by Leaving the Lobby. */
  game: GameSnapshot;
  onBackToStart: () => void;
}

export default function CancelledScreen({ game, onBackToStart }: Props) {
  const hostName = game.players.find((player) => player.isHost)?.playerName ?? "";

  // On desktop, the header is a bar across the window, and the rest is in a phone-width column down the middle, with
  // the button just below the message rather than at the bottom of the window. The column is left out of the layout on
  // phones.
  return (
    <div className="flex flex-1 flex-col items-center px-6 pt-3.5 pb-9 xl:p-0">
      <Header subtitle={resultMessages.cancelledSubtitle} />
      <div
        className="contents xl:mx-auto xl:flex xl:w-full xl:max-w-[430px] xl:flex-1 xl:flex-col xl:items-center
          xl:justify-center xl:gap-10 xl:px-6 xl:pt-10 xl:pb-12"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center xl:flex-none">
          <div
            className="flex size-[120px] items-center justify-center rounded-full border-2 border-ludo-accent
              text-ludo-accent-light"
          >
            <Icon name="closedDoor" size={52} strokeWidth={1.6} />
          </div>
          <div className="flex max-w-[300px] flex-col gap-2.5" role="status">
            <h1 className="m-0 font-ludo-display text-[32px] font-normal">{resultMessages.cancelled}</h1>
            <p className="m-0 text-[15px] leading-normal text-ludo-on-page-muted">{resultMessages.cancelledBy(hostName)}</p>
          </div>
        </div>
        <button type="button" className="ludo-button-accent" onClick={onBackToStart}>
          <Frost />
          {resultMessages.backToStart}
        </button>
      </div>
    </div>
  );
}
