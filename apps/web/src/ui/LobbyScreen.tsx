import { useEffect, useState } from "react";
import { classicRules, type GameSnapshot } from "@ludo/shared";
import Avatar from "./Avatar";
import AwayTag from "./AwayTag";
import ErrorMessage from "./ErrorMessage";
import Header from "./Header";
import Icon from "./Icon";
import { joinLinkFor } from "./joinLink";
import LeaveButton from "./LeaveButton";
import Notice from "./Notice";
import { commonMessages, leaveMessages, lobbyMessages, spacedGameCode } from "./messages";

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
        const matches = players.flatMap((player, index) => (!player.isHost && player.playerName === playerName ? [index] : []));
        return matches.length === 1 ? matches[0] : -1;
      })();

  const copy = async (what: Copyable, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      // The browser refused. The code is on screen to copy by hand, and either button can be tried again.
    }
  };

  // The phone's own share sheet, where there is one; otherwise the link is copied.
  const shareJoinLink = async () => {
    const url = joinLinkFor(gameCode);
    if (!navigator.share) return copy("joinLink", url);
    try {
      await navigator.share({ title: lobbyMessages.shareTitle, url });
    } catch {
      // Closed without sharing, which needs nothing.
    }
  };

  // Only the Host can start the Game, once someone else has joined. The fourth join starts it by itself.
  const startPrompt = () => {
    if (!isHost) {
      return (
        <div className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-dashed border-gold/60 px-[18px] py-4" role="status">
          <Icon name="waiting" size={26} strokeWidth={1.8} className="flex-none text-gold-light" />
          <div className="flex flex-col gap-[3px]">
            <span className="text-[15px] font-semibold">{lobbyMessages.waitingForHost(host?.playerName ?? "")}</span>
            <span className="text-[13px] text-tan">{lobbyMessages.orStartsByItself}</span>
          </div>
        </div>
      );
    }
    if (players.length < classicRules.minPlayers) {
      return <p className="m-0 text-center text-[13px] text-tan">{lobbyMessages.waitingForPlayers}</p>;
    }
    return (
      <div className="flex flex-col items-center gap-2.5">
        <button type="button" className="ludo-button-gold" disabled={disabled} onClick={onStartGame}>
          {lobbyMessages.start(players.length)}
        </button>
        <span className="text-center text-[13px] text-tan">{lobbyMessages.startsByItself}</span>
      </div>
    );
  };

  const otherNames = players.flatMap((player, index) => (index === viewerIndex ? [] : [player.playerName]));
  const openPlaces = Math.max(classicRules.maxPlayers - players.length, 0);

  return (
    <div className="flex flex-1 flex-col gap-[22px] px-5 pt-3.5 pb-8">
      <Header
        subtitle={lobbyMessages.subtitle}
        action={
          <LeaveButton
            disabled={disabled}
            text={isHost ? leaveMessages.asHostInLobby(otherNames) : leaveMessages.inLobby}
            onLeave={onLeaveGame}
          />
        }
      />
      <Notice notice={notice} />
      <div className="px-1">
        <h1 className="m-0 font-display text-[30px] font-normal">{lobbyMessages.heading}</h1>
        <p className="mt-1.5 mb-0 text-sm text-tan">{lobbyMessages.shareHint(isHost)}</p>
      </div>
      <section className="flex flex-col items-center gap-3.5 rounded-[22px] bg-ivory px-5 pt-6 pb-[22px] text-maroon">
        <h2 className="m-0 text-xs font-bold tracking-[0.12em] text-brown uppercase">{lobbyMessages.gameCodeHeading}</h2>
        {/* Plain numerals, not a box, so it doesn't look editable. */}
        <p
          className="m-0 pt-0.5 pb-1 font-display text-[50px] leading-none tracking-[0.14em] whitespace-nowrap"
          role="img"
          aria-label={lobbyMessages.gameCodeLabel(gameCode)}
        >
          {spacedGameCode(gameCode)}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" className="ludo-button-outline h-12" onClick={shareJoinLink}>
            <Icon name="share" size={18} />
            <span aria-live="polite">{copied === "joinLink" ? lobbyMessages.copied : lobbyMessages.shareJoinLink}</span>
          </button>
          <button
            type="button"
            className="inline-flex h-12 flex-none cursor-pointer items-center gap-1.5 px-1.5 text-[13px] font-medium
              text-brown underline underline-offset-[3px]"
            onClick={() => copy("gameCode", gameCode)}
          >
            <Icon name="copy" size={15} />
            <span aria-live="polite">{copied === "gameCode" ? lobbyMessages.copied : lobbyMessages.copyCode}</span>
          </button>
        </div>
      </section>
      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="m-0 text-xs font-semibold tracking-widest text-tan uppercase">{lobbyMessages.playersHeading}</h2>
          <span className="text-[13px] text-tan">{lobbyMessages.playerCount(players.length)}</span>
        </div>
        {/* In join order. Two Players can share a Player name, so they're told apart by their place. */}
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {players.map((player, index) => (
            <li
              key={index}
              className="flex items-center gap-3 rounded-[14px] border border-ivory/16 bg-ivory/7 px-3.5 py-3"
            >
              <Avatar playerName={player.playerName} ringed={index === viewerIndex} away={player.away} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] leading-tight font-semibold wrap-anywhere">{player.playerName}</span>
                {index === viewerIndex && <span className="text-xs text-tan">{commonMessages.you}</span>}
              </span>
              {player.away && <AwayTag size="lobby" />}
              {player.isHost && (
                <span className="flex h-[22px] flex-none items-center rounded-[11px] bg-gold px-[9px] text-xs font-bold text-maroon">
                  {lobbyMessages.host}
                </span>
              )}
            </li>
          ))}
          {Array.from({ length: openPlaces }, (_, index) => (
            <li
              key={`open-${index}`}
              className="flex items-center gap-3 rounded-[14px] border border-dashed border-ivory/30 px-3.5 py-3"
            >
              <span className="size-9 flex-none rounded-full border-2 border-dashed border-ivory/35" aria-hidden />
              <span className="text-[15px] text-tan">{lobbyMessages.openPlace}</span>
            </li>
          ))}
        </ol>
      </section>
      <div className="flex-1" />
      {startPrompt()}
      <ErrorMessage error={error} />
    </div>
  );
}
