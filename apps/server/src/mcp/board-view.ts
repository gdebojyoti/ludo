// The Board view: a Game as an AI Player sees it, as text for an MCP tool result. The cross-shaped Board is described
// rather than drawn, as where each Token is, and what each Move open to the AI would do, is what it needs to choose.
import {
  applyMove,
  classicRules,
  dieFaces,
  earnsExtraRoll,
  hasWon,
  isSafeCell,
  isWonByCapture,
  positionAfter,
  stepsToHome,
  tokensReachHome,
  wonByMove,
  type GameMode,
  type GameSnapshot,
  type Seat,
  type SeatToken,
  type SnapshotBoard,
  type TokenPosition,
} from "@ludo/shared";

export const modeNames: Record<GameMode, string> = { classic: "Classic", oneKillWin: "One Kill Win" };

/** The Game in the snapshot as text: who's in it, where every Token is, and what the AI can do now. */
export const boardView = (game: GameSnapshot): string => {
  if (!game.board) return lobbyView(game);
  const { board } = game;
  const names = namesOf(board);
  return [
    `A ${modeNames[game.mode]} Game. The Seats, clockwise:`,
    ...board.seats.map((_, seat) => seatLine(game.mode, board, seat)),
    "",
    ...lastPlayLines(board, names),
    stageText(game, board, names),
  ].join("\n");
};

/** Who the AI is told a Seat's Player is, and whose its Tokens are. */
interface Names {
  who: (seat: Seat) => string;
  whose: (seat: Seat) => string;
}

const namesOf = (board: SnapshotBoard): Names => {
  const nameOf = (seat: Seat) => board.seats[seat]?.playerName ?? `the Player in Seat ${seat}`;
  return {
    who: (seat) => (seat === board.seat ? "you" : nameOf(seat)),
    whose: (seat) => (seat === board.seat ? "your" : `${nameOf(seat)}'s`),
  };
};

const lobbyView = (game: GameSnapshot) => {
  const players = game.players.map((player) => (player.isHost ? `${player.playerName} (the Host)` : player.playerName));
  const lines = [`A ${modeNames[game.mode]} Game, with ${players.length} of ${classicRules.maxPlayers} Players in: ` +
    `${players.join(", ")}.`];
  if (game.state === "cancelled") {
    lines.push("The Game is over: its Host Left the Lobby, so it was cancelled before it started.");
  } else if (game.isHost) {
    lines.push(`The Game is in the Lobby. Others can join with Game code ${game.gameCode}. You're the Host: call ` +
      `start_game once ${classicRules.minPlayers} or more Players are in, or the Game starts by itself when ` +
      `${classicRules.maxPlayers} are.`);
  } else {
    lines.push(`The Game is in the Lobby. Its Host starts it, or it starts by itself when ${classicRules.maxPlayers} ` +
      "Players are in.");
  }
  return lines.join("\n");
};

/** One Seat, with whoever is in it and where each of its Tokens is. */
const seatLine = (mode: GameMode, board: SnapshotBoard, seat: Seat) => {
  const emptySeat = { playerName: null, left: false, away: false, tokens: [] };
  const { playerName, left, away, tokens } = board.seats[seat] ?? emptySeat;
  if (left) return `- Seat ${seat}: empty, as ${playerName} Left the Game.`;
  if (playerName === null) return `- Seat ${seat}: empty.`;
  const who = seat === board.seat ? `you, ${playerName}` : playerName + (away ? ", who is Away" : "");
  const isOwn = seat === board.seat;
  const tokenTexts = tokens.map((position, token) => {
    const toGo = isOwn && tokensReachHome(mode) && position.area !== "yard" && position.area !== "home"
      ? ` (${stepsToHome(seat, position)} to go)`
      : "";
    return `Token ${token + 1} ${whereText(position)}${toGo}`;
  });
  return `- Seat ${seat} (${who}): ${tokenTexts.join(", ")}.`;
};

/** A place a Token can be, such as "Track cell 5", for saying where it Moves from and to. */
const positionText = (position: TokenPosition) => {
  switch (position.area) {
    case "yard":
      return "the Yard";
    case "track":
      return `Track cell ${position.cell}`;
    case "homeColumn":
      return `Home column cell ${position.cell + 1} of ${classicRules.homeColumnCells}`;
    case "home":
      return "Home";
  }
};

/** Where a Token is, such as "on Track cell 5". */
const whereText = (position: TokenPosition) => {
  switch (position.area) {
    case "yard":
      return "in the Yard";
    case "home":
      return "Home";
    default:
      return `on ${positionText(position)}`;
  }
};

/** The latest Roll and Move, if there have been any. */
const lastPlayLines = (board: SnapshotBoard, names: Names) => {
  const lines = [];
  const { lastRoll, lastMove } = board;
  if (lastMove) {
    const captured = lastMove.captured.length > 0 ? `, Capturing ${capturedText(lastMove.captured, names)}` : "";
    lines.push(`The last Move: ${names.who(lastMove.seat)} Moved Token ${lastMove.token + 1} from ` +
      `${positionText(lastMove.from)} to ${positionText(lastMove.to)}${captured}.`);
  }
  if (lastRoll) lines.push(`The last Roll: ${names.who(lastRoll.seat)} Rolled a ${lastRoll.number}.`);
  return lines;
};

const capturedText = (captured: SeatToken[], names: Names) => {
  return captured.map(({ seat, token }) => `${names.whose(seat)} Token ${token + 1}`).join(" and ");
};

/** Whose Turn it is and what the AI can do, or how the Game ended. */
const stageText = (game: GameSnapshot, board: SnapshotBoard, names: Names) => {
  if (game.state === "won" && board.winner !== null) return `The Game is over: ${winText(game, board, names)}`;
  if (board.turn !== board.seat) return `It's ${names.who(board.turn)}'s Turn.`;
  if (!board.rolled || !board.lastRoll) return "It's your Turn: call wait_for_turn, which Rolls for you.";
  const roll = board.lastRoll.number;
  return [
    `It's your Turn, and you Rolled a ${roll}. Choose which Token to Move by it, and call move_token with its number:`,
    ...board.moves.map((token) => moveLine(game.mode, board, token, roll, names)),
  ].join("\n");
};

const winText = (game: GameSnapshot, board: SnapshotBoard, names: Names) => {
  const winner = board.winner as Seat;
  const won = winner === board.seat ? "you won" : `${names.who(winner)} won`;
  const othersLeft = board.seats.every((seat, index) => index === winner || seat.playerName === null || seat.left);
  if (othersLeft && !hasWon(board.seats[winner]?.tokens ?? [])) return `${won}, as every other Player Left.`;
  if (isWonByCapture(game.mode) && board.lastMove?.seat === winner) {
    return `${won}, by Capturing ${capturedText(board.lastMove.captured, names)}.`;
  }
  return `${won}, by bringing all ${classicRules.tokensPerSeat} Tokens Home.`;
};

/** What Moving this Token of the AI's by the Roll would do. */
const moveLine = (mode: GameMode, board: SnapshotBoard, token: number, roll: number, names: Names) => {
  const seat = board.seat;
  const from = board.seats[seat]?.tokens[token] as TokenPosition;
  const after = applyMove(mode, board.seats.map(({ tokens }) => tokens), seat, token, roll);
  const to = after.seats[seat]?.[token] as TokenPosition;
  const move = { tokens: after.seats[seat] ?? [], captured: after.captured, to };
  const effects = [];
  if (after.captured.length > 0) effects.push(`Captures ${capturedText(after.captured, names)}`);
  if (to.area === "home") effects.push("brings it Home");
  // A winning Move ends the Game, so what could happen after it doesn't matter.
  if (wonByMove(mode, move)) {
    effects.push("winning the Game");
  } else {
    if (to.area === "track") effects.push(...landingEffects(mode, after.seats, seat, token, to.cell, names));
    if (from.area === "track") effects.push(...leftBehindEffects(mode, after.seats, seat, from.cell, names));
    if (earnsExtraRoll(roll, move)) effects.push("earns you another Roll");
  }
  return `- Token ${token + 1}: ${positionText(from)} to ${positionText(to)}` +
    (effects.length > 0 ? `; ${effects.join("; ")}.` : ".");
};

/** The Seat's Tokens on the Track cell, by their number, leaving out one of them. */
const tokensOn = (seats: TokenPosition[][], seat: Seat, cell: number, leavingOut?: number) => {
  return (seats[seat] ?? []).flatMap((position, token) => {
    return token !== leavingOut && position.area === "track" && position.cell === cell ? [token + 1] : [];
  });
};

/**
 * Whether the Track cell a Token lands on keeps it safe: a Safe cell, or shared with another of its Seat's Tokens. If
 * not, which opponents' Tokens could Capture it there on their next Turn.
 */
const landingEffects = (
  mode: GameMode,
  seats: TokenPosition[][],
  seat: Seat,
  token: number,
  cell: number,
  names: Names,
) => {
  if (isSafeCell(cell)) return ["a Safe cell"];
  const partners = tokensOn(seats, seat, cell, token);
  if (partners.length > 0) return [`joins your Token ${partners.join(" and ")}, so they protect each other`];
  const threats = threatsTo(mode, seats, seat, cell, names);
  return threats ? [`could be Captured there by ${threats}`] : [];
};

/**
 * Whether Moving a Token off a Track cell it shared with one other of its Seat's Tokens leaves that one alone there,
 * where they protected each other, and which opponents' Tokens could then Capture it.
 */
const leftBehindEffects = (mode: GameMode, seats: TokenPosition[][], seat: Seat, cell: number, names: Names) => {
  const left = tokensOn(seats, seat, cell);
  if (isSafeCell(cell) || left.length !== 1) return [];
  const threats = threatsTo(mode, seats, seat, cell, names);
  return [`leaves your Token ${left[0]} alone on Track cell ${cell}` +
    (threats ? `, where it could be Captured by ${threats}` : "")];
};

/**
 * Which opponents' Tokens could reach the Track cell on their next Turn, and how, or null if none could. A Seat's
 * Tokens that could reach it the same ways, such as those in its Yard, are named together.
 */
const threatsTo = (mode: GameMode, seats: TokenPosition[][], seat: Seat, cell: number, names: Names) => {
  const threats = seats.flatMap((tokens, owner) => {
    if (owner === seat) return [];
    const tokensByWays = new Map<string, number[]>();
    tokens.forEach((position, token) => {
      const ways = waysToReach(mode, owner, position, cell).join(" or ");
      if (ways) tokensByWays.set(ways, [...tokensByWays.get(ways) ?? [], token + 1]);
    });
    return [...tokensByWays].map(([ways, numbers]) => `${names.whose(owner)} ${tokensText(numbers)} with ${ways}`);
  });
  return threats.length > 0 ? threats.join(", ") : null;
};

/** Tokens by their numbers, such as "Token 2" or "Tokens 2, 3 and 4". */
const tokensText = (numbers: number[]) => {
  if (numbers.length === 1) return `Token ${numbers[0]}`;
  return `Tokens ${numbers.slice(0, -1).join(", ")} and ${numbers.at(-1)}`;
};

const rolls = Array.from({ length: dieFaces }, (_, index) => index + 1);

/**
 * The ways a Token of this Seat could Move from where it is onto the Track cell in one Turn, such as "a 2" or "a 6
 * then a 2": by one Roll, or by a 6, which earns another Roll, and then that Roll. Longer runs of 6s are left out, as
 * they're unlikely.
 */
const waysToReach = (mode: GameMode, seat: Seat, position: TokenPosition, cell: number) => {
  const isOnCell = (to: TokenPosition | null) => to?.area === "track" && to.cell === cell;
  const byOneRoll = rolls.filter((roll) => isOnCell(positionAfter(mode, seat, position, roll)));
  const afterSix = positionAfter(mode, seat, position, dieFaces);
  const bySixThenRoll = afterSix && !isOnCell(afterSix)
    ? rolls.filter((roll) => isOnCell(positionAfter(mode, seat, afterSix, roll)))
    : [];
  return [
    ...byOneRoll.map((roll) => `a ${roll}`),
    ...bySixThenRoll.map((roll) => `a ${dieFaces} then a ${roll}`),
  ];
};
