// Something that happened without the Player doing it, such as the Host cancelling their Game. Announced to screen
// readers politely, unlike an error.
export default function Notice({ notice }: { notice: string | undefined }) {
  if (!notice) return null;
  return <p className="m-0" role="status">{notice}</p>;
}
