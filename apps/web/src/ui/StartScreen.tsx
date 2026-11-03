import ErrorMessage from "./ErrorMessage";
import { startMessages } from "./messages";

interface Props {
  playerName: string;
  disabled: boolean;
  error: string | undefined;
  onCreateGame: () => void;
}

export default function StartScreen({ playerName, disabled, error, onCreateGame }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <p className="m-0">
        {startMessages.playingAs} <strong>{playerName}</strong>
      </p>
      <button type="button" className="self-start border px-4 py-2" disabled={disabled} onClick={onCreateGame}>
        {startMessages.createGame}
      </button>
      <ErrorMessage error={error} />
    </section>
  );
}
