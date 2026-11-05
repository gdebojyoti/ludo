import { describe, expect, it } from "vitest";

import {
  applyMove,
  earnsExtraRoll,
  giveOutSeats,
  hasWon,
  legalMoves,
  moveToken,
  nextTakenSeat,
  positionAfter,
  positionsAlong,
  seatsClockwise,
  startingTokens,
  tokensHome,
  wonByMove,
  type TokenPosition,
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
    expect(positionAfter("classic", seat, { area: "yard" }, 6)).toEqual({ area: "track", cell });
  });

  it.each([1, 2, 3, 4, 5])("can't leave the Yard on a %i", (roll) => {
    expect(positionAfter("classic", 1, { area: "yard" }, roll)).toBeNull();
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
    expect(positionAfter("classic", seat, from, roll)).toEqual(to);
  });

  it.each([
    ["overshoot Home from its Home column", 3, { area: "homeColumn", cell: 2 }, 4],
    ["overshoot Home from the start of its Home column", 1, { area: "homeColumn", cell: 0 }, 6],
    ["Move once it's Home", 0, { area: "home" }, 1],
  ] as const)("can't %s", (_, seat, from, roll) => {
    expect(positionAfter("classic", seat, from, roll)).toBeNull();
  });
});

describe("the places a Token stands on as it Moves", () => {
  it("is just its Start cell when it leaves the Yard", () => {
    expect(positionsAlong("classic", 1, { area: "yard" }, 6)).toEqual([{ area: "track", cell: 13 }]);
  });

  it("is each Cell along the Track, wrapping round past its last Cell", () => {
    expect(positionsAlong("classic", 1, { area: "track", cell: 50 }, 3)).toEqual([
      { area: "track", cell: 51 },
      { area: "track", cell: 0 },
      { area: "track", cell: 1 },
    ]);
  });

  it("turns into its Home column, skipping the Cell before its Start cell", () => {
    expect(positionsAlong("classic", 0, { area: "track", cell: 49 }, 3)).toEqual([
      { area: "track", cell: 50 },
      { area: "homeColumn", cell: 0 },
      { area: "homeColumn", cell: 1 },
    ]);
  });

  it("ends Home with an exact Roll", () => {
    expect(positionsAlong("classic", 3, { area: "homeColumn", cell: 2 }, 3)).toEqual([
      { area: "homeColumn", cell: 3 },
      { area: "homeColumn", cell: 4 },
      { area: "home" },
    ]);
  });

  it.each([
    ["can't leave the Yard", { area: "yard" }, 5],
    ["would overshoot Home", { area: "homeColumn", cell: 3 }, 3],
  ] as const)("is empty when the Token %s", (_, from, roll) => {
    expect(positionsAlong("classic", 2, from, roll)).toEqual([]);
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
    expect(legalMoves("classic", 0, [...tokens], roll)).toEqual(moves);
  });

  it("are none when every Token is in the Yard and the Roll isn't a 6", () => {
    expect(legalMoves("classic", 2, Array.from({ length: 4 }, () => ({ area: "yard" }) as const), 5)).toEqual([]);
  });
});

describe("applying a Move", () => {
  it("moves only the chosen Token, by the Roll", () => {
    const tokens = [{ area: "track", cell: 30 }, { area: "track", cell: 30 }, { area: "yard" }] as const;

    expect(moveToken("classic", 1, [...tokens], 1, 6)).toEqual([
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

    expect(applyMove("classic", seats, 0, 0, 4)).toEqual({
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

    expect(applyMove("classic", seats, 0, 0, 3)).toEqual({
      seats: [[track(cell)], [track(cell)], [], []],
      captured: [],
    });
  });

  it("never takes Tokens of one Seat sharing a Cell, which protect each other", () => {
    const seats = [[track(30)], [track(33), yard, track(33)], [], []];

    expect(applyMove("classic", seats, 0, 0, 3)).toEqual({
      seats: [[track(33)], [track(33), yard, track(33)], [], []],
      captured: [],
    });
  });

  it("takes only the single Token on a Cell where another Seat has a protected pair", () => {
    const seats = [[track(30)], [track(33), track(33)], [], [yard, track(33)]];

    expect(applyMove("classic", seats, 0, 0, 3)).toEqual({
      seats: [[track(33)], [track(33), track(33)], [], [yard, yard]],
      captured: [{ seat: 3, token: 1 }],
    });
  });

  it("takes every single opponent's Token on the Cell, of each Seat there", () => {
    const seats = [[track(30)], [track(33), track(36)], [], [yard, track(33)]];

    expect(applyMove("classic", seats, 0, 0, 3)).toEqual({
      seats: [[track(33)], [yard, track(36)], [], [yard, yard]],
      captured: [{ seat: 1, token: 0 }, { seat: 3, token: 1 }],
    });
  });

  it("lets a Token pass protected Tokens", () => {
    // A pair on Cell 32, and a single Token on Cell 34, a Star cell.
    const seats = [[track(30)], [track(32), track(32)], [], [track(34)]];

    expect(legalMoves("classic", 0, seats[0] ?? [], 5)).toEqual([0]);
    expect(applyMove("classic", seats, 0, 0, 5)).toEqual({
      seats: [[track(35)], [track(32), track(32)], [], [track(34)]],
      captured: [],
    });
  });

  it("never takes a Token in its Home column", () => {
    const homeColumn = { area: "homeColumn", cell: 2 } as const;
    const seats = [[track(48)], [], [homeColumn], []];

    expect(applyMove("classic", seats, 0, 0, 5)).toEqual({ seats: [[homeColumn], [], [homeColumn], []], captured: [] });
  });
});

describe("an extra Roll", () => {
  const track = (cell: number) => ({ area: "track", cell }) as const;
  const home = { area: "home" } as const;
  const capture = [{ seat: 2, token: 1 }];

  it.each([
    ["used a 6", 6, track(6), []],
    ["brought a Token out of its Yard, on a 6", 6, track(0), []],
    ["made a Capture", 3, track(33), capture],
    ["made a Capture of more than one Token", 4, track(34), [{ seat: 1, token: 0 }, { seat: 3, token: 2 }]],
    ["brought a Token Home", 2, home, []],
    ["used a 6 and made a Capture", 6, track(36), capture],
    ["used a 6 and brought a Token Home", 6, home, []],
  ])("comes after a Move that %s", (_, roll, to, captured) => {
    expect(earnsExtraRoll(roll, { to, captured })).toBe(true);
  });

  it.each([1, 2, 3, 4, 5])("doesn't come after a Move by a %i that neither Captured nor reached Home", (roll) => {
    expect(earnsExtraRoll(roll, { to: track(20), captured: [] })).toBe(false);
  });

  it("doesn't come after a Move that reached its Home column, short of Home", () => {
    expect(earnsExtraRoll(5, { to: { area: "homeColumn", cell: 4 }, captured: [] })).toBe(false);
  });
});

describe("winning", () => {
  it("is a Move that brings the Seat's last Token Home", () => {
    const home = { area: "home" } as const;
    const seats: TokenPosition[][] = [[], [], [home, { area: "homeColumn", cell: 3 }, home, home], []];

    const after = applyMove("classic", seats, 2, 1, 2).seats[2] ?? [];

    expect(after).toEqual([home, home, home, home]);
    expect(tokensHome(after)).toBe(4);
    expect(hasWon(after)).toBe(true);
  });

  it("isn't a Move that brings a Token Home with another still out", () => {
    const seats: TokenPosition[][] = [[{ area: "homeColumn", cell: 4 }, { area: "track", cell: 7 }, { area: "home" }]];

    const after = applyMove("classic", seats, 0, 0, 1).seats[0] ?? [];

    expect(tokensHome(after)).toBe(2);
    expect(hasWon(after)).toBe(false);
  });

  it("isn't a Seat with no Tokens, such as an empty one", () => {
    expect(hasWon([])).toBe(false);
  });
});

describe("One Kill Win", () => {
  const yard = { area: "yard" } as const;
  const track = (cell: number) => ({ area: "track", cell }) as const;

  it("starts each Seat with 2 Tokens on its Start cell and 2 in its Yard", () => {
    expect(startingTokens("oneKillWin", 1)).toEqual([track(13), track(13), yard, yard]);
  });

  it.each([
    ["onto the Cell before its Start cell, where Classic turns into its Home column", 0, 50, 1, 51],
    ["past its own Start cell, round the Track again", 0, 49, 6, 3],
    ["onto its own Start cell", 2, 22, 4, 26],
    ["any distance, with no Home to overshoot", 3, 37, 6, 43],
  ])("moves a Token round the Track %s", (_, seat, from, roll, to) => {
    expect(positionAfter("oneKillWin", seat, track(from), roll)).toEqual(track(to));
  });

  it("has a Token stand on each Cell along the Track, through its own Start cell", () => {
    expect(positionsAlong("oneKillWin", 0, track(49), 3)).toEqual([track(50), track(51), track(0)]);
  });

  it("lets every Token on the Track Move, whatever the Roll, but only a 6 brings one out of the Yard", () => {
    const tokens = [track(50), track(10), yard, yard];

    expect(legalMoves("oneKillWin", 0, tokens, 5)).toEqual([0, 1]);
    expect(legalMoves("oneKillWin", 0, tokens, 6)).toEqual([0, 1, 2, 3]);
  });

  it("Captures as in Classic", () => {
    const seats = [[track(49), track(0)], [track(51)], [], []];

    expect(applyMove("oneKillWin", seats, 0, 0, 2)).toEqual({
      seats: [[track(51), track(0)], [yard], [], []],
      captured: [{ seat: 1, token: 0 }],
    });
  });

  it("is won by a Move that makes a Capture", () => {
    expect(wonByMove("oneKillWin", { tokens: [track(5), yard], captured: [{ seat: 2, token: 0 }] })).toBe(true);
  });

  it("isn't won by a Move that makes no Capture", () => {
    expect(wonByMove("oneKillWin", { tokens: [track(5), track(9)], captured: [] })).toBe(false);
  });
});

describe("Classic, beside One Kill Win", () => {
  const yard = { area: "yard" } as const;
  const home = { area: "home" } as const;

  it("starts each Seat with every Token in its Yard", () => {
    expect(startingTokens("classic", 1)).toEqual([yard, yard, yard, yard]);
  });

  it("is won by a Move that brings the Seat's last Token Home", () => {
    expect(wonByMove("classic", { tokens: [home, home, home, home], captured: [] })).toBe(true);
  });

  it("isn't won by a Move that makes a Capture, with Tokens still out", () => {
    const tokens = [home, { area: "track", cell: 9 } as const, home, home];

    expect(wonByMove("classic", { tokens, captured: [{ seat: 2, token: 0 }] })).toBe(false);
  });
});
