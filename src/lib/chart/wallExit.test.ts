import { describe, expect, it } from "vitest";
import { EMPTY_WALL_LEDGER, WALL_EXIT_SHOW_MS, stepWallExits, wallExitWords } from "./wallExit";

describe("a wall that leaves shows its exit (§20)", () => {
  const T0 = 1_000_000;
  it("a wall missing from the next compilation is named with the state it left in", () => {
    const a = stepWallExits(EMPTY_WALL_LEDGER, "NQ1!", [{ strike: 31250, life: "DEFENDED" }, { strike: 31500, life: "BORN" }], T0);
    expect(a.exits).toEqual([]);
    const b = stepWallExits(a, "NQ1!", [{ strike: 31500, life: "BORN" }], T0 + 60_000);
    expect(b.exits).toEqual([{ strike: 31250, lastLife: "DEFENDED", leftAtMs: T0 + 60_000 }]);
    expect(wallExitWords(b.exits[0], p => p.toFixed(0))).toBe("WALL 31250 · NO LONGER LISTED · WAS DEFENDED");
  });
  it("the exit holds for the show window, then is forgotten; a wall that returns clears it", () => {
    let l = stepWallExits(EMPTY_WALL_LEDGER, "K", [{ strike: 10, life: "TESTED" }], T0);
    l = stepWallExits(l, "K", [], T0 + 1);
    expect(stepWallExits(l, "K", [], T0 + WALL_EXIT_SHOW_MS - 1).exits).toHaveLength(1);
    expect(stepWallExits(l, "K", [], T0 + 1 + WALL_EXIT_SHOW_MS).exits).toHaveLength(0);
    expect(stepWallExits(l, "K", [{ strike: 10, life: "TESTED" }], T0 + 5).exits).toHaveLength(0);
  });
  it("another instrument inherits nothing", () => {
    const l = stepWallExits(stepWallExits(EMPTY_WALL_LEDGER, "A", [{ strike: 1, life: "BORN" }], T0), "B", [], T0 + 1);
    expect(l.exits).toEqual([]);
  });
});
