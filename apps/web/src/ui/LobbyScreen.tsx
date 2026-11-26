import { useEffect, useState } from "react";
import { classicRules, type GameSnapshot } from "@ludo/shared";
import { track } from "./analytics";
import Avatar from "./Avatar";
import Button from "./Button";
import ErrorMessage from "./ErrorMessage";
import Header from "./Header";
import Icon from "./Icon";
import { joinLinkFor } from "./joinLink";
import LeaveButton from "./LeaveButton";
import Notice from "./Notice";
import { commonMessages, leaveMessages, lobbyMessages, spacedGameCode } from "./messages";
import SnowCap from "./SnowCap";

interface Props {
  game: GameSnapshot;
  /** The viewer's Player name, to tell which Player is them. */
  playerName: string;
  disabled: boolean;
  /** Something that happened without the Player doing it, such as opening a Join link while in this Game. */
  notice: string | undefined;
  error: string | undefined;
  onStartGame: () => void;
  onLeaveGame: () => void;
}

/** What a Player can copy to share the Game. */
type Copyable = "joinLink" | "gameCode";

// What the link_copied and link_shared events call each: the names WZQ's link_copied uses, so the totals add up across
// games.
const copyableNames: Record<Copyable, string> = { joinLink: "join_link", gameCode: "code" };

// How long a share or copy button shows that it worked.
const copiedFor = 2000;

export default function LobbyScreen({ game, playerName, disabled, notice, error, onStartGame, onLeaveGame }: Props) {
  const gameCode = game.gameCode ?? "";
  const { players, isHost } = game;
  const host = players.find((player) => player.isHost);
  // Which of the buttons last copied, while it shows that it did.
  const [copied, setCopied] = useState<Copyable>();

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(undefined), copiedFor);
    return () => clearTimeout(timeout);
  }, [copied]);

  // The snapshot doesn't say which Player is the viewer. The Host knows they're the Host; anyone else is the Player
  // with their Player name, unless another has it too.
  const viewerIndex = isHost
    ? players.findIndex((player) => player.isHost)
    : (() => {
        const matches = players.flatMap((player, index) =>
          !player.isHost && player.playerName === playerName ? [index] : [],
        );
        return matches.length === 1 ? matches[0] : -1;
      })();

  const copy = async (what: Copyable, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      track("link_copied", { what: copyableNames[what] });
    } catch {
      // The browser refused. The code is on screen to copy by hand, and either button can be tried again.
    }
  };

  // The phone's own share sheet, where there is one; otherwise the link is copied. Sharing it is sent as link_shared,
  // not link_copied, as nothing is copied, unless the Player picks Copy in the sheet, which it doesn't say.
  const shareJoinLink = async () => {
    const url = joinLinkFor(gameCode);
    if (!navigator.share) return copy("joinLink", url);
    try {
      await navigator.share({ title: lobbyMessages.shareTitle, url });
      track("link_shared", { what: copyableNames.joinLink });
    } catch {
      // Closed without sharing, which needs nothing.
    }
  };

  // Only the Host can start the Game, once someone else has joined. The fourth join starts it by itself.
  const canStart = isHost && players.length >= classicRules.minPlayers;

  const startPrompt = () => {
    if (!isHost) {
      return (
        <div
          className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-dashed border-ludo-accent/60 px-[18px] py-4
            christmas:border-ludo-page-line"
          role="status"
        >
          <Icon
            name="waiting"
            size={26}
            strokeWidth={1.8}
            className="flex-none text-ludo-accent-light christmas:text-ludo-on-page-muted"
          />
          <div className="flex flex-col gap-[3px]">
            <span className="text-[15px] font-semibold">{lobbyMessages.waitingForHost(host?.playerName ?? "")}</span>
            <span className="text-[13px] text-ludo-on-page-muted">{lobbyMessages.orStartsByItself}</span>
          </div>
        </div>
      );
    }
    if (players.length < classicRules.minPlayers) {
      return <p className="m-0 text-center text-[13px] text-ludo-on-page-muted">{lobbyMessages.waitingForPlayers}</p>;
    }
    // On phones, it stays in view at the bottom of the screen while the list above it scrolls, in a bar across the
    // screen that blurs what scrolls under it, with the same space all round the button. It takes the screen's bottom
    // padding into itself, so it reaches the bottom edge. Any error is shown in it, above the button, where the button
    // doesn't cover it.
    return (
      <div
        className="sticky bottom-0 -mx-5 -mb-8 flex flex-col gap-2.5 bg-ludo-page/60 p-5 backdrop-blur-md xl:static
          xl:m-0 xl:bg-transparent xl:p-0 xl:backdrop-blur-none"
      >
        <ErrorMessage error={error} />
        <Button variant="accent" disabled={disabled} onClick={onStartGame}>
          {lobbyMessages.start(players.length)}
        </Button>
      </div>
    );
  };

  // Each Player with their place in join order, the viewer moved to the top, unless it can't be told which is them.
  const inJoinOrder = players.map((player, index) => ({ player, index }));
  const viewerFirst = [
    ...inJoinOrder.filter(({ index }) => index === viewerIndex),
    ...inJoinOrder.filter(({ index }) => index !== viewerIndex),
  ];

  const otherNames = players.flatMap((player, index) => (index === viewerIndex ? [] : [player.playerName]));
  const openPlaces = Math.max(classicRules.maxPlayers - players.length, 0);

  const gameCodeCard = () => (
    <section
      className="relative flex flex-col items-center gap-3.5 rounded-[22px] bg-ludo-card px-5 pt-6 pb-[22px]
        text-ludo-ink xl:px-6 xl:pt-7 xl:pb-6"
    >
      <SnowCap />
      <h2 className="m-0 text-xs font-bold tracking-[0.12em] text-ludo-ink-muted uppercase">
        {lobbyMessages.mode(game.mode)}
      </h2>
      {/* Plain numerals, not a box, so it doesn't look editable. */}
      <p
        className="m-0 pt-0.5 pb-1 font-ludo-display text-[50px] leading-none tracking-[0.14em] whitespace-nowrap
          xl:text-[56px]"
        role="img"
        aria-label={lobbyMessages.gameCodeLabel(gameCode)}
      >
        {spacedGameCode(gameCode)}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" className="h-12" onClick={shareJoinLink}>
          <Icon name="share" size={18} />
          <span aria-live="polite">{copied === "joinLink" ? lobbyMessages.copied : lobbyMessages.shareJoinLink}</span>
        </Button>
        <button
          type="button"
          className="inline-flex h-12 flex-none cursor-pointer items-center gap-1.5 px-1.5 text-[13px] font-medium
            text-ludo-ink-muted underline underline-offset-[3px]"
          onClick={() => copy("gameCode", gameCode)}
        >
          <Icon name="copy" size={15} />
          <span aria-live="polite">{copied === "gameCode" ? lobbyMessages.copied : lobbyMessages.copyCode}</span>
        </button>
      </div>
    </section>
  );

  const playerList = () => (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-xs font-semibold tracking-widest text-ludo-on-page-muted uppercase">
          {lobbyMessages.playersHeading}
        </h2>
        <span className="text-[13px] text-ludo-on-page-muted">{lobbyMessages.playerCount(players.length)}</span>
      </div>
      {/* The viewer first, Host or not, then the others in join order. Two Players can share a Player name, so they're
          told apart by their place. */}
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {viewerFirst.map(({ player, index }) => {
          const isViewer = index === viewerIndex;
          // The line under the name, if any, as one phrase: "You" or "You are the host" for the viewer, who is never
          // away, and "Host", "Away" or "The host is away" for the others.
          const about = isViewer
            ? (player.isHost ? lobbyMessages.youAreHost : commonMessages.you)
            : player.isHost
              ? (player.away ? lobbyMessages.hostAway : lobbyMessages.host)
              : player.away && commonMessages.away;
          // The viewer's own row stands out, outlined in ivory and named in gold. Its edge is thicker, so it has less
          // padding, to stay the same size.
          return (
            <li
              key={index}
              className={`flex items-center gap-3 rounded-[14px] ${
                isViewer
                  ? "border-[1.5px] border-ludo-on-page bg-ludo-on-page/13 px-[13.5px] py-[11.5px]"
                  : "border border-ludo-row-line bg-ludo-row px-3.5 py-3"
              }`}
            >
              <Avatar playerName={player.playerName} absent={player.away} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={`text-[15px] leading-tight wrap-anywhere ${
                    isViewer ? "font-bold text-ludo-accent-light" : "font-semibold"
                  }`}
                >
                  {player.playerName}
                </span>
                {about && (
                  <span
                    className={`text-xs ${isViewer ? "font-semibold text-ludo-accent-light" : "text-ludo-on-page-muted"}`}
                  >
                    {about}
                  </span>
                )}
              </span>
            </li>
          );
        })}
        {Array.from({ length: openPlaces }, (_, index) => (
          <li
            key={`open-${index}`}
            className="flex items-center gap-3 rounded-[14px] border border-dashed border-ludo-on-page/30 px-3.5 py-3
              christmas:border-ludo-page-line christmas:bg-ludo-page"
          >
            <span
              className="size-9 flex-none rounded-full border-2 border-dashed border-ludo-on-page/35
                christmas:border-ludo-page-line"
              aria-hidden
            />
            <span className="text-[15px] text-ludo-on-page-muted">{lobbyMessages.openPlace}</span>
          </li>
        ))}
      </ol>
    </section>
  );

  // On desktop, the header is a bar across the window, and below it the Game code is on the left and the Players on the
  // right. The wrappers that make those columns are left out of the layout on phones, where it's one column.
  return (
    <div className="flex flex-1 flex-col gap-[22px] px-5 pt-3.5 pb-8 xl:gap-0 xl:p-0">
      <Header
        action={
          <LeaveButton
            disabled={disabled}
            text={isHost ? leaveMessages.asHostInLobby(otherNames) : leaveMessages.inLobby}
            onLeave={onLeaveGame}
          />
        }
      />
      <div className="contents xl:flex xl:flex-1 xl:items-center xl:justify-center xl:p-10">
        <div className="contents xl:grid xl:w-full xl:max-w-[1000px] xl:grid-cols-2 xl:items-start xl:gap-14">
          <div className="contents xl:flex xl:flex-col xl:gap-7">
            <Notice notice={notice} />
            <div className="px-1 xl:p-0">
              <h1 className="m-0 font-ludo-display text-[30px] font-normal xl:text-4xl">{lobbyMessages.heading}</h1>
              <p className="mt-1.5 mb-0 text-sm text-ludo-on-page-muted xl:mt-2 xl:text-[15px]">
                {lobbyMessages.shareHint}
              </p>
            </div>
            {gameCodeCard()}
          </div>
          <div className="contents xl:flex xl:flex-col xl:gap-7">
            {playerList()}
            <div className="flex-1 xl:hidden" />
            {startPrompt()}
            {!canStart && <ErrorMessage error={error} />}
          </div>
        </div>
      </div>
    </div>
  );
}
