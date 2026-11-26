import type { MouseEvent } from "react";

/**
 * A modal dialog's click handler: it closes the dialog when the tap is on the scrim around it, which only the dialog
 * itself gets, and not on what's in it.
 */
export const closeOnScrimTap = (event: MouseEvent<HTMLDialogElement>) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
};
