import { describe, expect, it } from "vitest";
import { selectDataGaps } from "./selectDataGaps";

const bar = (time: number, p = 100) => ({ time, open: p, close: p + 1 });
const run = (from: number, n: number) => Array.from({ length: n }, (_, i) => bar(from + i * 300));

describe("selectDataGaps", () => {
  it("refuses too few bars", () => {
    expect(selectDataGaps([bar(0)]).reason).toBe("TOO_FEW_BARS");
  });

  it("an unbroken series has no gaps", () => {
    expect(selectDataGaps(run(0, 50)).gaps).toEqual([]);
  });

  it("names a hole inside a session with the number of missing bars", () => {
    const bars = [...run(0, 20), ...run(20 * 300 + 2 * 300, 20)]; // two bars dropped
    const vm = selectDataGaps(bars);
    expect(vm.gaps).toHaveLength(1);
    expect(vm.gaps[0].missing).toBe(2);
    expect(vm.gaps[0].fromTime).toBe(19 * 300);
    expect(vm.gaps[0].toTime).toBe(22 * 300);
  });

  it("never calls a session break a data gap", () => {
    const bars = [...run(0, 20), ...run(100_000, 20)];
    expect(selectDataGaps(bars).gaps).toEqual([]);
  });
});
