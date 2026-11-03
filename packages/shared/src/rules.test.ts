import { describe, expect, it } from "vitest";

import { giveOutSeats, nextTakenSeat, seatsClockwise } from "./rules.js";

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
