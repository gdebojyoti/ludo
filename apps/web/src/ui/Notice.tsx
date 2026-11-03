import Icon from "./Icon";

// Something that happened without the Player doing it, such as opening a Join link while in a Game. Announced to
// screen readers politely, unlike an error.
export default function Notice({ notice }: { notice: string | undefined }) {
  if (!notice) return null;
  return (
    <p
      className="m-0 flex w-full items-start gap-3 rounded-2xl border-[1.5px] border-notice-line bg-notice p-4 text-sm
        leading-[1.45] text-maroon"
      role="status"
    >
      <Icon name="info" size={22} className="mt-px flex-none text-brown" />
      <span>{notice}</span>
    </p>
  );
}
