import type { SnapshotBoard } from "@ludo/shared";
import Board from "./Board";
import ErrorMessage from "./ErrorMessage";
import Notice from "./Notice";
import { boardMessages } from "./messages";

interface Props {
  board: SnapshotBoard;
  /** Something that happened without the Player doing it, such as opening a Join link while in this Game. */
  notice: string | undefined;
  error: string | undefined;
}

export default function BoardScreen({ board, notice, error }: Props) {
  // Players are named by their Player name, never by colour, as each sees the Seats in different colours.
  const turnPlayerName = board.seats[board.turn]?.playerName ?? "";

  return (
    <section className="flex flex-col gap-4">
      <Notice notice={notice} />
      <p className="m-0" aria-live="polite">
        {board.turn === board.seat ? boardMessages.yourTurn(turnPlayerName) : boardMessages.turnOf(turnPlayerName)}
      </p>
      <Board board={board} />
      <ErrorMessage error={error} />
    </section>
  );
}
