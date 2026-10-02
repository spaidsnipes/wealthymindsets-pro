import { describe, expect, it } from "vitest";
import { mergeValueCandleBars } from "./mergeValueCandleBars";

const bar = (time: number, tag: string) => ({ time, reading: { tag } as never, partial: false });
const ring = (bars: ReturnType<typeof bar>[], reason = "PER_BAR") => ({ version: 1, intervalSec: 60, reason, bars, newestBarTime: 300 }) as never;

describe("mergeValueCandleBars", () => {
  it("adds the store's bars the ring does not hold, in time order; the ring wins its own bars", () => {
    const out = mergeValueCandleBars(ring([bar(240, "ring"), bar(300, "ring")]), [bar(60, "store"), bar(120, "store"), bar(240, "store")])!;
    expect(out.bars.map(b => [b.time, (b.reading as unknown as { tag: string }).tag])).toEqual([[60, "store"], [120, "store"], [240, "ring"], [300, "ring"]]);
  });
  it("never adds bars when the ring is not PER_BAR (no sided tape law)", () => {
    const r = ring([], "UNMEASURED");
    expect(mergeValueCandleBars(r, [bar(60, "store")])).toBe(r);
  });
});
