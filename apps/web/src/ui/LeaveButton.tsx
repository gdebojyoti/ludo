import { useState } from "react";
import { leaveMessages } from "./messages";

interface Props {
  disabled: boolean;
  /** The question asked before Leaving, saying what Leaving does here. */
  confirmMessage: string;
  onLeave: () => void;
}

// Leave always asks first, so a misclick can't take the Player out, cancel the Game, or forfeit it.
export default function LeaveButton({ disabled, confirmMessage, onLeave }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" className="self-start border px-4 py-2" onClick={() => setConfirming(true)}>
        {leaveMessages.leave}
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="m-0">{confirmMessage}</p>
      <button type="button" className="border px-4 py-2" disabled={disabled} onClick={onLeave}>
        {leaveMessages.confirmYes}
      </button>
      <button type="button" className="border px-4 py-2" onClick={() => setConfirming(false)}>
        {leaveMessages.confirmNo}
      </button>
    </div>
  );
}
