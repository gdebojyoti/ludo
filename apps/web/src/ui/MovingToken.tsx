import { useEffect, useEffectEvent, useState } from "react";
import { stepEvery } from "@ludo/shared";
import { slideStyle } from "./motion";
import type { Cell } from "./seatView";

interface Props {
  /**
   * Where the Token starts, then each place it stands on as it Moves, in Cells of the Board's grid. Places off the
   * grid's Cells, such as a slot in a Yard, are fractions of a Cell.
   */
  path: Cell[];
  colour: string;
  /** Called once the Token has reached the end of its path. */
  onArrived: () => void;
}

/**
 * A Token, drawn above the Board as it Moves: it slides from each place on its path to the next.
 * Each step sets the Token where it's going and slides it in from where it was, so nothing depends on it staying
 * mounted. The slide alternates between two identical animations, so a new step always restarts it.
 */
export default function MovingToken({ path, colour, onArrived }: Props) {
  const [step, setStep] = useState(1);
  const arrive = useEffectEvent(onArrived);

  useEffect(() => {
    const timeout = setTimeout(() => (step < path.length - 1 ? setStep(step + 1) : arrive()), stepEvery);
    return () => clearTimeout(timeout);
  }, [step, path.length]);

  const from = path[step - 1];
  const to = path[step];
  if (!from || !to) return null;
  const style = {
    ...slideStyle(from, to),
    animationName: step % 2 ? "ludo-step-a" : "ludo-step-b",
    backgroundColor: colour,
  };
  return <span className="ludo-token ludo-token-moving" style={style} aria-hidden />;
}
