import type { GameSnapshot } from "@ludo/shared";
import Board from "./Board";
import ErrorMessage from "./ErrorMessage";
import Notice from "./Notice";
import { boardMessages } from "./messages";

interface Props {
  /** A Game that has started. */
  game: GameSnapshot;
  /** Something that happened without the Player doing it, such as opening a Join link while in this Game. */
  notice: string | undefined;
  error: string | undefined;
}

export default function BoardScreen({ game, notice, error }: Props) {
  // Players are named by their Player name, never by colour, as each sees the Seats in different colours.
  const turnPlayerName = game.turn === null ? null : game.seats[game.turn]?.playerName;

  return (
    <section className="flex flex-col gap-4">
      <Notice notice={notice} />
      <p className="m-0" aria-live="polite">
        {game.turn === game.seat ? boardMessages.yourTurn : turnPlayerName && boardMessages.turnOf(turnPlayerName)}
      </p>
      {game.seat !== null && <Board game={game} viewerSeat={game.seat} />}
      <ErrorMessage error={error} />
    </section>
  );
}
