// Why the server refused the Player's last command, if it did. Announced to screen readers as it appears.
export default function ErrorMessage({ error }: { error: string | undefined }) {
  if (!error) return null;
  return <p className="m-0 text-sm" role="alert">{error}</p>;
}
