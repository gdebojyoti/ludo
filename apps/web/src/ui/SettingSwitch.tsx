interface Props {
  /** Names its label and detail, which must be unique on the page. */
  id: string;
  label: string;
  detail: string;
  on: boolean;
  onToggle: () => void;
  className?: string;
}

// A setting that's on or off, in a row: its label and detail on the left, and the switch on the right.
export default function SettingSwitch({ id, label, detail, on, onToggle, className = "" }: Props) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span id={`${id}-label`} className="text-base font-semibold">{label}</span>
        <span id={`${id}-detail`} className="text-[13px] leading-snug text-ludo-ink-muted">{detail}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-detail`}
        className={`relative h-7 w-12 flex-none cursor-pointer rounded-full transition-colors ${
          on ? "bg-ludo-ink" : "bg-ludo-board-line"
        }`}
        onClick={onToggle}
      >
        <span
          className={`absolute top-1 left-1 size-5 rounded-full bg-ludo-card-raised shadow transition-transform ${
            on ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
