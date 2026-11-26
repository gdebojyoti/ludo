import { Info } from "lucide-react";

// Something that happened without the Player doing it, such as opening a Join link while in a Game. Announced to
// screen readers politely, unlike an error.
export default function Notice({ notice }: { notice: string | undefined }) {
  if (!notice) return null;
  return (
    <p
      className="m-0 flex w-full items-start gap-3 rounded-2xl border-[1.5px] border-ludo-notice-line bg-ludo-notice p-4 text-sm
        leading-[1.45] text-ludo-ink"
      role="status"
    >
      <Info className="flex-none text-ludo-ink-muted" aria-hidden />
      <span>{notice}</span>
    </p>
  );
}
