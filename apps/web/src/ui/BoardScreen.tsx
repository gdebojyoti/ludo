import type { SnapshotBoard } from "@ludo/shared";
import Board from "./Board";
import ErrorMessage from "./ErrorMessage";
import Notice from "./Notice";
import { boardMessages } from "./messages";

interface Props {
  board: SnapshotBoard;
  disabled: boolean;
  /** Something that happened without the Player doing it, such as opening a Join link while in this Game. */
  notice: string | undefined;
  error: string | undefined;
  onRoll: () => void;
  onMove: (token: number) => void;
  /** Leaves the Board once the Game has been won. */
  onBackToStart: () => void;
}

export default function BoardScreen({ board, disabled, notice, error, onRoll, onMove, onBackToStart }: Props) {
  // Players are named by their Player name, never by colour, as each sees the Seats in different colours.
  const playerName = (seat: number) => board.seats[seat]?.playerName ?? "";
  const turnPlayerName = playerName(board.turn);
  const { lastRoll, lastMove, winner } = board;
  const isWon = winner !== null;
  const isOwnTurn = !isWon && board.turn === board.seat;

  const status = () => {
    if (isWon) {
      return winner === board.seat ? boardMessages.youWon(playerName(winner)) : boardMessages.won(playerName(winner));
    }
    return isOwnTurn ? boardMessages.yourTurn(turnPlayerName) : boardMessages.turnOf(turnPlayerName);
  };

  return (
    <section className="flex flex-col gap-4">
      <Notice notice={notice} />
      <p className="m-0" aria-live="polite">{status()}</p>
      {/* The Move first, as it came before the Roll it's shown with, unless a Roll with no legal Move followed. */}
      <div className="flex flex-col gap-1" aria-live="polite">
        {lastMove && <p className="m-0">{boardMessages.moved(playerName(lastMove.seat), lastMove)}</p>}
        {lastRoll && <p className="m-0">{boardMessages.rolled(playerName(lastRoll.seat), lastRoll.number)}</p>}
      </div>
      {isOwnTurn && !board.rolled && (
        <button type="button" className="self-start border px-4 py-2" disabled={disabled} onClick={onRoll}>
          {boardMessages.roll}
        </button>
      )}
      {isWon && (
        <button type="button" className="self-start border px-4 py-2" onClick={onBackToStart}>
          {boardMessages.backToStart}
        </button>
      )}
      {board.moves.length > 0 && <p className="m-0">{boardMessages.pickToken}</p>}
      <Board board={board} disabled={disabled} onMove={onMove} />
      <ErrorMessage error={error} />
    </section>
  );
}
