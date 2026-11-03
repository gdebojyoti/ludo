import { describe, expect, it } from "vitest";

import {
  applyMove,
  giveOutSeats,
  hasWon,
  legalMoves,
  moveToken,
  nextTakenSeat,
  positionAfter,
  seatsClockwise,
} from "./rules.js";

describe("giving out Seats", () => {
  it.each([
    [2, [0, 2]],
    [3, [0, 2, 1]],
    [4, [0, 2, 1, 3]],
  ])("seats %i Players in join order: the 2nd opposite the 1st, then the rest clockwise", (playerCount, seats) => {
    expect(giveOutSeats(playerCount)).toEqual(seats);
  });
});

describe("the next taken Seat clockwise", () => {
  it.each([
    ["the Seat opposite, with 2 Players", 0, [0, 2], 2],
    ["back round to Seat 0 from the last Seat", 3, [0, 1, 2, 3], 0],
    ["the Seat after, skipping none, with 4 Players", 1, [0, 1, 2, 3], 2],
    ["the next taken Seat, skipping an empty one", 2, [0, 1, 2], 0],
    ["the next taken Seat, given in any order", 0, [2, 0, 1], 1],
    ["the next taken Seat after one that isn't taken", 1, [0, 2], 2],
    ["the Seat itself when it's the only one taken", 2, [2], 2],
  ])("is %s", (_, seat, takenSeats, next) => {
    expect(nextTakenSeat(seat, takenSeats)).toBe(next);
  });
});

describe("how many Seats clockwise one Seat is from another", () => {
  it.each([
    ["none, for the same Seat", 1, 1, 0],
    ["1, for the next Seat", 0, 1, 1],
    ["2, for the Seat opposite", 3, 1, 2],
    ["3, for the Seat just before, counting round past Seat 0", 2, 1, 3],
  ])("is %s", (_, from, to, seats) => {
    expect(seatsClockwise(from, to)).toBe(seats);
  });
});

describe("where a Token ends up after a Roll", () => {
  it.each([
    ["onto Seat 0's Start cell", 0, 0],
    ["onto Seat 2's Start cell, half way round the Track", 2, 26],
  ])("leaves the Yard on a 6, %s", (_, seat, cell) => {
    expect(positionAfter(seat, { area: "yard" }, 6)).toEqual({ area: "track", cell });
  });

  it.each([1, 2, 3, 4, 5])("can't leave the Yard on a %i", (roll) => {
    expect(positionAfter(1, { area: "yard" }, roll)).toBeNull();
  });
});

describe("a Token Moving along its journey", () => {
  it.each([
    ["moves clockwise along the Track", 0, { area: "track", cell: 10 }, 4, { area: "track", cell: 14 }],
    ["wraps round the Track past its last Cell", 1, { area: "track", cell: 50 }, 5, { area: "track", cell: 3 }],
    ["stops on the tip of its own arm", 2, { area: "track", cell: 20 }, 4, { area: "track", cell: 24 }],
    ["turns from the tip of its own arm into its Home column", 0, { area: "track", cell: 50 }, 1, {
      area: "homeColumn",
      cell: 0,
    }],
    ["skips the Cell before its Start cell to turn into its Home column", 0, { area: "track", cell: 48 }, 3, {
      area: "homeColumn",
      cell: 0,
    }],
    ["turns into its Home column after wrapping round the Track", 2, { area: "track", cell: 22 }, 4, {
      area: "homeColumn",
      cell: 1,
    }],
    ["passes another Seat's Home column, staying on the Track", 1, { area: "track", cell: 49 }, 4, {
      area: "track",
      cell: 1,
    }],
    ["moves up its Home column", 3, { area: "homeColumn", cell: 0 }, 3, { area: "homeColumn", cell: 3 }],
    ["reaches Home with an exact Roll from its Home column", 3, { area: "homeColumn", cell: 2 }, 3, { area: "home" }],
    ["reaches Home with an exact Roll from the tip of its own arm", 0, { area: "track", cell: 50 }, 6, {
      area: "home",
    }],
  ] as const)("%s", (_, seat, from, roll, to) => {
    expect(positionAfter(seat, from, roll)).toEqual(to);
  });

  it.each([
    ["overshoot Home from its Home column", 3, { area: "homeColumn", cell: 2 }, 4],
    ["overshoot Home from the start of its Home column", 1, { area: "homeColumn", cell: 0 }, 6],
    ["Move once it's Home", 0, { area: "home" }, 1],
  ] as const)("can't %s", (_, seat, from, roll) => {
    expect(positionAfter(seat, from, roll)).toBeNull();
  });
});

describe("the legal Moves for a Roll", () => {
  const tokens = [
    { area: "yard" },
    { area: "track", cell: 5 },
    { area: "homeColumn", cell: 4 },
    { area: "home" },
  ] as const;

  it.each([
    ["the Tokens out of the Yard that wouldn't overshoot Home", 1, [1, 2]],
    ["only the Tokens that wouldn't overshoot Home", 2, [1]],
    ["every Token that isn't Home, but one that would overshoot it, on a 6", 6, [0, 1]],
  ])("are %s", (_, roll, moves) => {
    expect(legalMoves(0, [...tokens], roll)).toEqual(moves);
  });

  it("are none when every Token is in the Yard and the Roll isn't a 6", () => {
    expect(legalMoves(2, Array.from({ length: 4 }, () => ({ area: "yard" }) as const), 5)).toEqual([]);
  });
});

describe("applying a Move", () => {
  it("moves only the chosen Token, by the Roll", () => {
    const tokens = [{ area: "track", cell: 30 }, { area: "track", cell: 30 }, { area: "yard" }] as const;

    expect(moveToken(1, [...tokens], 1, 6)).toEqual([
      { area: "track", cell: 30 },
      { area: "track", cell: 36 },
      { area: "yard" },
    ]);
  });
});

describe("Capturing", () => {
  const yard = { area: "yard" } as const;
  const track = (cell: number) => ({ area: "track", cell }) as const;

  it("sends an opponent's Token on the Cell a Move ends on back to its Yard", () => {
    const seats = [[track(10), yard], [], [track(14), track(20)], []];

    expect(applyMove(seats, 0, 0, 4)).toEqual({
      seats: [[track(14), yard], [], [yard, track(20)], []],
      captured: [{ seat: 2, token: 0 }],
    });
  });

  it.each([
    ["Seat 1's Start cell", 13],
    ["Seat 3's Start cell", 39],
    ["the Star cell 8 Cells on from Seat 1's Start cell", 21],
    ["the Star cell 8 Cells on from Seat 3's Start cell", 47],
  ])("never happens on %s, a Safe cell, where the Tokens share the Cell", (_, cell) => {
    const seats = [[track(cell - 3)], [track(cell)], [], []];

    expect(applyMove(seats, 0, 0, 3)).toEqual({ seats: [[track(cell)], [track(cell)], [], []], captured: [] });
  });

  it("never takes Tokens of one Seat sharing a Cell, which protect each other", () => {
    const seats = [[track(30)], [track(33), yard, track(33)], [], []];

    expect(applyMove(seats, 0, 0, 3)).toEqual({
      seats: [[track(33)], [track(33), yard, track(33)], [], []],
      captured: [],
    });
  });

  it("takes only the single Token on a Cell where another Seat has a protected pair", () => {
    const seats = [[track(30)], [track(33), track(33)], [], [yard, track(33)]];

    expect(applyMove(seats, 0, 0, 3)).toEqual({
      seats: [[track(33)], [track(33), track(33)], [], [yard, yard]],
      captured: [{ seat: 3, token: 1 }],
    });
  });

  it("takes every single opponent's Token on the Cell, of each Seat there", () => {
    const seats = [[track(30)], [track(33), track(36)], [], [yard, track(33)]];

    expect(applyMove(seats, 0, 0, 3)).toEqual({
      seats: [[track(33)], [yard, track(36)], [], [yard, yard]],
      captured: [{ seat: 1, token: 0 }, { seat: 3, token: 1 }],
    });
  });

  it("lets a Token pass protected Tokens", () => {
    // A pair on Cell 32, and a single Token on Cell 34, a Star cell.
    const seats = [[track(30)], [track(32), track(32)], [], [track(34)]];

    expect(legalMoves(0, seats[0] ?? [], 5)).toEqual([0]);
    expect(applyMove(seats, 0, 0, 5)).toEqual({
      seats: [[track(35)], [track(32), track(32)], [], [track(34)]],
      captured: [],
    });
  });

  it("never takes a Token in its Home column", () => {
    const homeColumn = { area: "homeColumn", cell: 2 } as const;
    const seats = [[track(48)], [], [homeColumn], []];

    expect(applyMove(seats, 0, 0, 5)).toEqual({ seats: [[homeColumn], [], [homeColumn], []], captured: [] });
  });
});

describe("winning", () => {
  it("is a Move that brings the Seat's last Token Home", () => {
    const tokens = [{ area: "home" }, { area: "homeColumn", cell: 3 }, { area: "home" }, { area: "home" }] as const;

    const moved = moveToken(2, [...tokens], 1, 2);

    expect(moved).toEqual([{ area: "home" }, { area: "home" }, { area: "home" }, { area: "home" }]);
    expect(hasWon(moved)).toBe(true);
  });

  it("isn't a Move that brings a Token Home with another still out", () => {
    const tokens = [{ area: "homeColumn", cell: 4 }, { area: "track", cell: 7 }, { area: "home" }] as const;

    expect(hasWon(moveToken(0, [...tokens], 0, 1))).toBe(false);
  });

  it("isn't a Seat with no Tokens, such as an empty one", () => {
    expect(hasWon([])).toBe(false);
  });
});
