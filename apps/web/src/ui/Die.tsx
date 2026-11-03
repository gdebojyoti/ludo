interface Props {
  number: number;
  /** What the die shows, for screen readers; while it's tumbling there's nothing to say. */
  label?: string;
  /** A gold ring, marking the viewer's own Roll. */
  ringed?: boolean;
  className?: string;
}

// Which of the 3 × 3 spots on a face have a pip, for each number.
const pipSpots: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const spots = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export default function Die({ number, label, ringed = false, className = "" }: Props) {
  return (
    <div
      className={`grid size-20 flex-none grid-cols-3 grid-rows-3 gap-0.5 rounded-[18px] bg-cream p-3.5 ${
        ringed
          ? "shadow-[inset_0_-5px_0_var(--color-die-shade),0_0_0_3px_var(--color-gold),0_6px_14px_rgba(0,0,0,0.4)]"
          : "shadow-[inset_0_-5px_0_var(--color-die-shade),0_6px_14px_rgba(0,0,0,0.4)]"
      } ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {spots.map((spot) => (
        <span
          key={spot}
          className={`size-3 place-self-center rounded-full bg-maroon ${
            pipSpots[number]?.includes(spot) ? "" : "invisible"
          }`}
        />
      ))}
    </div>
  );
}
