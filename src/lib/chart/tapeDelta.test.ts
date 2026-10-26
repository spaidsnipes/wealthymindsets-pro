import { describe, expect, it } from "vitest";
import { retainRecentTicks, seedRecentTicks, type Tick } from "@/hooks/useWebSocket";
import { tapeDelta } from "./tapeDelta";

const tick = (i: number): Tick => ({ price: 100 + i / 100, size: 1, side: i % 2 ? "buy" : "sell", time: 1_700_000_000_000 + i, trade: true });

describe("tapeDelta — the prints a flush added, never the whole tape again", () => {
  it("a frame's prints in front of the ring are exactly what is fresh", () => {
    let ring: Tick[] = [];
    let n = 0;
    const seen = new Set<Tick>();
    for (let frame = 0; frame < 400; frame++) {
      const batch = Array.from({ length: 1 + (frame % 7) }, () => tick(n++));
      const next = retainRecentTicks(batch, ring, 500);
      const d = tapeDelta(ring, next);
      const fresh = d.full ? next : d.fresh;
      if (frame > 0) expect(d.full).toBe(false);
      expect(fresh).toEqual(batch);
      for (const t of fresh) { expect(seen.has(t)).toBe(false); seen.add(t); }
      ring = next;
    }
  });
  it("a history seed behind the ring is fresh too", () => {
    const ring = retainRecentTicks([tick(10), tick(11)], []);
    const seeded = seedRecentTicks(ring, [tick(1), tick(2)]);
    const d = tapeDelta(ring, seeded);
    expect(d.full).toBe(false);
    if (!d.full) expect(d.fresh.map(t => t.time)).toEqual([tick(2).time, tick(1).time]);
  });
  it("an unrelated ring (a new symbol, a reset) is walked whole", () => {
    expect(tapeDelta([tick(1)], [tick(2), tick(3)]).full).toBe(true);
    expect(tapeDelta(null, [tick(2)]).full).toBe(true);
    expect(tapeDelta([], [tick(2)]).full).toBe(true);
  });
  it("the same ring adds nothing", () => {
    const r = [tick(1), tick(2)];
    expect(tapeDelta(r, r)).toEqual({ full: false, fresh: [] });
  });
});
