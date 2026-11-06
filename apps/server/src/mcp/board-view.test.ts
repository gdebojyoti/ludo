import type { GameSnapshot, SnapshotSeat, TokenPosition } from "@ludo/shared";
import { describe, expect, it } from "vitest";

import { boardView } from "./board-view.js";

const yard: TokenPosition = { area: "yard" };
const home: TokenPosition = { area: "home" };
const track = (cell: number): TokenPosition => ({ area: "track", cell });

const seatOf = (playerName: string | null, tokens: TokenPosition[]): SnapshotSeat => {
  return { playerName, left: false, away: false, tokens };
};

/** A Classic Game between the AI in Seat 0 and Ginny in Seat 2, on the AI's Turn, once it has Rolled. */
const aiRolled = (roll: number, aiTokens: TokenPosition[], ginnysTokens: TokenPosition[], moves: number[]) => {
  const game: GameSnapshot = {
    mode: "classic",
    state: "playing",
    gameCode: null,
    isHost: true,
    players: [],
    board: {
      seat: 0,
      seats: [seatOf("Claude", aiTokens), seatOf(null, []), seatOf("Ginny", ginnysTokens), seatOf(null, [])],
      turn: 0,
      rolled: true,
      lastRoll: { seat: 0, number: roll, index: 0 },
      lastMove: null,
      moves,
      extraRoll: false,
      winner: null,
    },
  };
  return boardView(game);
};

describe("what the Board view says each Move would do", () => {
  it("warns of a Capture by a 6 and then the Roll it earns", () => {
    // Ginny's Token 1 on Track cell 50 reaches Track cell 5 by 7 Cells: a 6 to Track cell 4, then a 1.
    const view = aiRolled(2, [track(3), yard, yard, yard], [track(50), home, home, home], [0]);

    expect(view).toContain("- Token 1: Track cell 3 to Track cell 5; could be Captured there by Ginny's Token 1 " +
      "with a 6 then a 1.");
  });

  it("warns of a Capture by a Token that leaves the Yard with a 6 and then Moves by the next Roll", () => {
    // Ginny's Start cell is Track cell 26.
    const view = aiRolled(3, [track(25), yard, yard, yard], [yard, home, home, home], [0]);

    expect(view).toContain("- Token 1: Track cell 25 to Track cell 28; could be Captured there by Ginny's Token 1 " +
      "with a 6 then a 2.");
  });

  it("lists every way an opponent's Token could reach the Cell", () => {
    // Ginny's Token 1 on Track cell 1 reaches Track cell 7 with a 6, and her Token 2 on Track cell 51 with a 6 then a 2.
    const view = aiRolled(4, [track(3), yard, yard, yard], [track(1), track(51), home, home], [0]);

    expect(view).toContain("- Token 1: Track cell 3 to Track cell 7; could be Captured there by Ginny's Token 1 " +
      "with a 6, Ginny's Token 2 with a 6 then a 2.");
  });

  it("names an opponent's Tokens that could reach the Cell the same ways together", () => {
    const view = aiRolled(3, [track(25), yard, yard, yard], [yard, yard, yard, home], [0]);

    expect(view).toContain("could be Captured there by Ginny's Tokens 1, 2 and 3 with a 6 then a 2.");
  });

  it("warns when Moving a Token leaves the other of a pair alone, and who could Capture it", () => {
    const view = aiRolled(2, [track(3), track(3), yard, yard], [track(50), home, home, home], [0, 1]);

    expect(view).toContain("- Token 1: Track cell 3 to Track cell 5; could be Captured there by Ginny's Token 1 " +
      "with a 6 then a 1; leaves your Token 2 alone on Track cell 3, where it could be Captured by Ginny's Token 1 " +
      "with a 5.");
    expect(view).toContain("- Token 2: Track cell 3 to Track cell 5; could be Captured there by Ginny's Token 1 " +
      "with a 6 then a 1; leaves your Token 1 alone on Track cell 3, where it could be Captured by Ginny's Token 1 " +
      "with a 5.");
  });

  it("says a Token is left alone even when no opponent's Token could reach it", () => {
    const view = aiRolled(2, [track(3), track(3), yard, yard], [home, home, home, home], [0, 1]);

    expect(view).toContain("- Token 1: Track cell 3 to Track cell 5; leaves your Token 2 alone on Track cell 3.");
  });

  it("gives no warning when Moving one of three Tokens on a Cell, or off a Safe cell", () => {
    const fromThree = aiRolled(2, [track(3), track(3), track(3), yard], [home, home, home, home], [0, 1, 2]);
    const fromSafeCell = aiRolled(2, [track(8), track(8), yard, yard], [home, home, home, home], [0, 1]);

    expect(fromThree).toContain("- Token 1: Track cell 3 to Track cell 5.");
    expect(fromSafeCell).toContain("- Token 1: Track cell 8 to Track cell 10.");
  });
});
