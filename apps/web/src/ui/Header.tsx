import type { ReactNode } from "react";
import { commonMessages } from "./messages";
import SettingsButton from "./SettingsButton";

interface Props {
  /** On phones, the screen's title, on the left; none on the Game screen. Not shown on desktop. */
  title?: string;
  /** On desktop, what the screen is, beside the wordmark, such as the Game mode and how many Players it has. */
  subtitle?: string;
  /** Buttons on the right, such as Leave, before Settings. */
  action?: ReactNode;
  /**
   * Where Settings is, on the right: on phones and desktop; on phones only, where desktop's bar has no buttons; or
   * nowhere, on the tab screens, where Settings is a tab.
   */
  settings?: "always" | "phones" | "never";
}

// Every screen's header but the Start screen's. On phones, a row 44px tall, as tall as its buttons, with the screen's
// title, if it has one, on the left, and its buttons on the right. On desktop, a bar across the top of the window, with
// the wordmark and the subtitle on the left, the same height whether or not it has buttons.
export default function Header({ title, subtitle, action, settings = "always" }: Props) {
  const hasButtons = Boolean(action) || settings !== "never";
  // On desktop, Settings shows only beside another button, as it always has.
  const buttonsOnDesktop = Boolean(action) || settings === "always";
  return (
    <header
      className="flex h-11 w-full flex-none items-center gap-3 xl:h-[85px] xl:gap-4 xl:border-b xl:border-ludo-on-page/12
        xl:px-8"
    >
      {title && (
        <h1 className="m-0 min-w-0 truncate font-ludo-display text-[26px] leading-none font-normal xl:hidden">{title}</h1>
      )}
      <div className="hidden min-w-0 items-center gap-3.5 xl:flex">
        <span
          className="font-ludo-display text-2xl tracking-[0.08em] uppercase christmas:tracking-[0.04em]
            christmas:text-white"
        >
          {commonMessages.wordmark}
        </span>
        {subtitle && (
          <>
            <span className="h-[22px] w-px bg-ludo-divider" />
            <span className="truncate text-sm text-ludo-on-page-muted">{subtitle}</span>
          </>
        )}
      </div>
      {hasButtons && (
        <div className={`ml-auto flex flex-none items-center gap-2 xl:gap-3 ${buttonsOnDesktop ? "" : "xl:hidden"}`}>
          {action}
          {settings !== "never" && <SettingsButton />}
        </div>
      )}
    </header>
  );
}
