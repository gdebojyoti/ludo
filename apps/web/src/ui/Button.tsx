import type { ComponentProps } from "react";
import Frost from "./Frost";

/** The buttons B1 to B6 from the design's style guide. */
type Variant = "accent" | "solid" | "outline" | "danger" | "icon";

interface Props extends ComponentProps<"button"> {
  variant: Variant;
}

// Each kind of button's utility in ludo.css, written out whole so Tailwind finds it, and its frost in the Christmas
// theme: three sparkling flakes at both ends, two small ones on the left only, or none.
const variants: Record<Variant, { className: string; frost: "full" | "light" | null }> = {
  accent: { className: "ludo-button-accent", frost: "full" },
  solid: { className: "ludo-button-solid", frost: "full" },
  outline: { className: "ludo-button-outline", frost: "light" },
  danger: { className: "ludo-button-danger", frost: null },
  icon: { className: "ludo-button-icon", frost: null },
};

// Every call to action, drawn as its variant, with the frost that goes with it. It's a plain button otherwise, and
// unless told, not one that submits a form. Its className adds to the variant's, for its size or colours where it is.
export default function Button({ variant, type = "button", className = "", children, ...props }: Props) {
  const { className: variantClassName, frost } = variants[variant];
  return (
    <button type={type} className={`${variantClassName} ${className}`} {...props}>
      {frost && <Frost light={frost === "light"} />}
      {children}
    </button>
  );
}
