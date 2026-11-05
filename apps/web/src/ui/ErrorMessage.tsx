import Icon from "./Icon";

// Why the server refused the Player's last command, if it did. Announced to screen readers as it appears.
export default function ErrorMessage({ error }: { error: string | undefined }) {
  if (!error) return null;
  return (
    <p
      className="m-0 flex w-full items-start gap-2 rounded-2xl bg-ludo-ivory px-4 py-3 text-[13px] leading-[1.45]
        text-ludo-danger"
      role="alert"
    >
      <Icon name="error" size={16} strokeWidth={2.2} className="mt-px flex-none" />
      <span>{error}</span>
    </p>
  );
}
