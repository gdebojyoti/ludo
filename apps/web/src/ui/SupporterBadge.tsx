import { Heart } from "lucide-react";
import { profileMessages } from "./messages";

interface Props {
  /** Smaller, beside a smaller name, as in a Player's sheet. */
  small?: boolean;
}

// Beside the name of an Account that bought the Supporter pack: a solid heart in a pink circle.
export default function SupporterBadge({ small = false }: Props) {
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-full bg-[#b0417a] text-[#fff8e8] ${
        small ? "size-[18px]" : "size-5"
      }`}
      role="img"
      aria-label={profileMessages.supporter}
      title={profileMessages.supporter}
    >
      <Heart size={small ? 10 : 11} fill="currentColor" strokeWidth={0} aria-hidden />
    </span>
  );
}
