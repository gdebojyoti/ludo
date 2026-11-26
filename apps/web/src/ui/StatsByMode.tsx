import { useState } from "react";
import { modeMessages, profileMessages } from "./messages";
import type { ModeStats, StatsMode } from "./profilePlaceholder";

interface Props {
  stats: Record<StatsMode, ModeStats>;
  /** On a card, as in a Player's sheet; otherwise on the page, as on the Profile. */
  onCard?: boolean;
}

const statsModes: { mode: StatsMode; name: string }[] = [
  { mode: "classic", name: modeMessages.modes.classic.name },
  { mode: "oneKillWin", name: modeMessages.modes.oneKillWin.name },
  { mode: "houseRules", name: profileMessages.houseRules },
];

// A Player's stats, for one Game mode at a time, chosen above them: Classic at first.
export default function StatsByMode({ stats, onCard = false }: Props) {
  const [mode, setMode] = useState<StatsMode>("classic");
  const shown = stats[mode];
  const look = onCard
    ? {
        modes: "border-ludo-ink/14 bg-ludo-ink/5",
        chosen: "bg-ludo-solid text-ludo-on-solid",
        other: "text-ludo-ink-muted",
        stat: "border border-ludo-notice-line bg-ludo-card-raised px-3 py-2.5",
        label: "text-ludo-ink-muted",
        value: "text-2xl",
      }
    : {
        modes: "border-ludo-row-line bg-ludo-row",
        chosen: "bg-ludo-card text-ludo-ink",
        other: "text-ludo-on-page-muted",
        stat: "bg-ludo-row px-3.5 py-3",
        label: "text-ludo-on-page-muted",
        value: "text-[28px]",
      };

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className={`grid grid-cols-3 rounded-xl border p-1 ${look.modes}`}
        role="group"
        aria-label={profileMessages.statsModes}
      >
        {statsModes.map(({ mode: option, name }) => (
          <button
            key={option}
            type="button"
            className={`h-9 cursor-pointer rounded-[9px] px-1 text-[13px] font-semibold ${
              option === mode ? look.chosen : look.other
            }`}
            aria-pressed={option === mode}
            onClick={() => setMode(option)}
          >
            {name}
          </button>
        ))}
      </div>
      <dl className="m-0 grid grid-cols-2 gap-2.5">
        {([
          [profileMessages.played, shown.played],
          [profileMessages.won, shown.won],
          [profileMessages.captures, shown.captures],
          [profileMessages.tokensHome, shown.tokensHome],
        ] satisfies [string, number][]).map(([label, value]) => (
          <div key={label} className={`flex flex-col-reverse gap-0.5 rounded-[14px] ${look.stat}`}>
            <dt className={`text-xs ${look.label}`}>{label}</dt>
            <dd className={`m-0 font-ludo-display leading-[1.1] ${look.value}`}>{value.toLocaleString("en")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
