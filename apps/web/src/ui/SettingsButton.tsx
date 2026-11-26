import { useRef } from "react";
import { Settings } from "lucide-react";
import { track } from "./analytics";
import Button from "./Button";
import DialogCard from "./DialogCard";
import { settingsMessages } from "./messages";
import SettingsList from "./SettingsList";

interface Props {
  /** Its colours, for what it's drawn on: ivory on the dark background by default. */
  colours?: string;
}

// On the right of the header, after Leave where there is one, and drawn the same way: only an icon on phones, and an
// icon and its text on desktop. It opens the settings in a card like Leave's question.
export default function SettingsButton({ colours = "text-ludo-on-page" }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = () => {
    dialogRef.current?.showModal();
    track("settings_open");
  };

  return (
    <>
      <Button
        variant="icon"
        className={`xl:h-12 xl:w-auto xl:gap-2 xl:px-5 xl:text-base xl:font-semibold ${colours}`}
        title={settingsMessages.label}
        onClick={open}
      >
        <Settings aria-hidden />
        <span className="sr-only xl:hidden">{settingsMessages.label}</span>
        <span className="hidden xl:inline">{settingsMessages.button}</span>
      </Button>
      <DialogCard ref={dialogRef} icon={Settings} title={settingsMessages.title}>
        <div className="mt-1.5 flex flex-col gap-7">
          <SettingsList idPrefix="settings-dialog" />
          <Button variant="solid" onClick={() => dialogRef.current?.close()}>
            {settingsMessages.done}
          </Button>
        </div>
      </DialogCard>
    </>
  );
}
