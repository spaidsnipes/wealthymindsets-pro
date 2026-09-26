/**
 * F07B · BIG TRADE CLUSTERS — the pure owner (footprintCanon.clusterBigTrades).
 *
 * Serving, 2026-09-26 03:55 CDT (BTC-USD 1m, MID ≈43 bars): four gold discs
 * printed within one minute at ~84209–84211 were drawn on top of each other
 * at the live edge — an unreadable knot whose inscriptions overprinted.
 * GP12 §64: "Stagger bubbles… Suppress low-value labels when crowded. Merge
 * labels." These tests hold the rule the glass now draws by.
 */
import { describe, expect, it } from "vitest";
import {
  BIG_TRADE_BREATH,
  CLUSTER_GAP_PX,
  CLUSTER_KEY_PREFIX,
  bigTradeCalloutLines,
  bigTradeInscriptionLines,
  clusterAnchorKey,
  clusterBarDots,
  clusterBigTrades,
  clusterHolding,
  clusterRadius,
  countCircleOverlaps,
  discsTouch,
  fitBubbleInscription,
  type ClusterDiscInput,
} from "./footprintCanon";
import { BIG_TRADE_MAX_R } from "@/lib/bubbleDrawGeometry";

const MAX = BIG_TRADE_MAX_R;
const disc = (key: string, x: number, y: number, r: number, size: number, extra: Partial<ClusterDiscInput> = {}): ClusterDiscInput => ({
  key, x, y, r, size, timeSec: 1_000_000 + x, barTime: 1_000_000, price: 84_000 + y, bid: 0, ask: size, ...extra,
});
/** The widest gap at which two discs still touch. */
const touchAt = (ra: number, rb: number) => (ra + rb) * (1 + BIG_TRADE_BREATH) + CLUSTER_GAP_PX;

describe("the serving knot: four prints in one minute become ONE disc", () => {
  // Measured shape: one minute ≈ 36px at MID on a 1555px window; four prints
  // ~84209–84211 sit within a few px of each other in y.
  const knot = [
    disc("p1", 1150, 300, 14, 0.18, { timeSec: 1_000_005, price: 84209.1 }),
    disc("p2", 1160, 301, 34, 0.52, { timeSec: 1_000_020, price: 84210.4 }),
    disc("p3", 1170, 299, 22, 0.31, { timeSec: 1_000_040, price: 84211.0 }),
    disc("p4", 1178, 300, 18, 0.20, { timeSec: 1_000_055, price: 84210.2, ask: 0, bid: 0.20 }),
  ];
  const out = clusterBigTrades(knot, { maxR: MAX });

  it("merges every overlapping disc into one cluster that keeps all four members", () => {
    expect(out).toHaveLength(1);
    expect(out[0].members.map(m => m.key)).toEqual(["p1", "p2", "p3", "p4"]);
    expect(out[0].size).toBeCloseTo(1.21, 12);
    expect(out[0].key).toBe(`${CLUSTER_KEY_PREFIX}p2`);
    expect(out[0].anchor.key).toBe("p2");
    expect(out[0].bid).toBeCloseTo(0.2, 12);
    expect(out[0].ask).toBeCloseTo(1.01, 12);
  });

  it("leaves no two drawn discs intersecting (the bigTradeOverlaps receipt is 0)", () => {
    expect(countCircleOverlaps(knot)).toBeGreaterThan(0); // positive control: it WAS a knot
    expect(countCircleOverlaps(out)).toBe(0);
  });

  it("names the cluster, its total and its anchor price in the one callout", () => {
    const words = bigTradeCalloutLines({
      bid: out[0].bid, ask: out[0].ask, price: out[0].anchor.price, priceText: out[0].anchor.price.toFixed(2),
      pct: 0.9962, prints: 900, cluster: { n: out[0].members.length, total: out[0].size },
    });
    expect(words?.lines).toEqual(["CLUSTER ×4", "1.21 @ 84210.40", "99.6TH PERCENTILE"]);
    expect(words?.receipt).toBe("CLUSTER4:1.21@99.6");
  });
});

describe("area is additive and capped by the size owner's ceiling", () => {
  it("r = √Σr²", () => {
    expect(clusterRadius([10, 10], MAX)).toBeCloseTo(Math.sqrt(200), 12);
    expect(clusterRadius([3, 4], MAX)).toBeCloseTo(5, 12);
    const [c] = clusterBigTrades([disc("a", 100, 100, 10, 1), disc("b", 105, 100, 10, 1)], { maxR: MAX });
    expect(Math.PI * c.r * c.r).toBeCloseTo(2 * Math.PI * 100, 9);
  });

  it("never exceeds the ceiling, and never shrinks below its largest member", () => {
    const [c] = clusterBigTrades([disc("a", 100, 100, MAX, 5), disc("b", 110, 100, MAX, 5), disc("c", 120, 100, MAX, 5)], { maxR: MAX });
    expect(c.r).toBe(MAX);
    for (const rs of [[6, 30], [6, 6, 6], [34, 34]]) {
      const r = clusterRadius(rs, MAX);
      expect(r).toBeLessThanOrEqual(MAX);
      expect(r).toBeGreaterThanOrEqual(Math.max(...rs));
    }
  });
});

describe("the centre is the size-weighted time and price", () => {
  const [c] = clusterBigTrades([
    disc("small", 100, 200, 10, 1, { timeSec: 60, price: 100 }),
    disc("big", 110, 210, 10, 3, { timeSec: 100, price: 108 }),
  ], { maxR: MAX });
  it("in pixels", () => {
    expect(c.x).toBeCloseTo(107.5, 12);
    expect(c.y).toBeCloseTo(207.5, 12);
  });
  it("in time and price", () => {
    expect(c.timeSec).toBeCloseTo(90, 12);
    expect(c.price).toBeCloseTo(106, 12);
  });
});

describe("discs that do not touch stay separate, untouched", () => {
  it("apart by more than the touch distance → two lone discs at their exact places and keys", () => {
    const a = disc("a", 100, 100, 10, 1), b = disc("b", 100 + touchAt(10, 10) + 0.01, 100, 10, 2);
    const out = clusterBigTrades([a, b], { maxR: MAX });
    expect(out).toHaveLength(2);
    expect(out.map(c => c.key).sort()).toEqual(["a", "b"]);
    for (const c of out) {
      const src = c.key === "a" ? a : b;
      expect([c.x, c.y, c.r, c.timeSec, c.price]).toEqual([src.x, src.y, src.r, src.timeSec, src.price]);
      expect(c.members).toEqual([src]);
    }
  });

  it("the touch distance counts the membrane's breath and the hairline — just inside merges", () => {
    const a = disc("a", 100, 100, 10, 1);
    expect(discsTouch(a, disc("b", 100 + touchAt(10, 10) - 0.01, 100, 10, 1))).toBe(true);
    expect(discsTouch(a, disc("b", 100 + touchAt(10, 10) + 0.01, 100, 10, 1))).toBe(false);
    // A pair that only kisses while breathing (clear at rest) is still one knot.
    expect(discsTouch(a, disc("b", 100 + 20.5, 100, 10, 1))).toBe(true);
  });
});

describe("members are preserved and nothing is invented", () => {
  it("every input print is in exactly one cluster; sizes and sides are conserved", () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
    for (let trial = 0; trial < 40; trial++) {
      const discs = Array.from({ length: 30 }, (_, i) => {
        const size = 0.1 + rnd() * 3;
        const sell = rnd() < 0.4;
        return disc(`k${i}`, rnd() * 600, rnd() * 300, 6 + rnd() * 28, size, { bid: sell ? size : 0, ask: sell ? 0 : size, barTime: 60 * Math.floor(rnd() * 10) });
      });
      const out = clusterBigTrades(discs, { maxR: MAX });
      const keys = out.flatMap(c => c.members.map(m => m.key)).sort();
      expect(keys).toEqual(discs.map(d => d.key).sort());
      const sum = (f: (d: ClusterDiscInput) => number) => discs.reduce((s, d) => s + f(d), 0);
      expect(out.reduce((s, c) => s + c.size, 0)).toBeCloseTo(sum(d => d.size), 9);
      expect(out.reduce((s, c) => s + c.bid, 0)).toBeCloseTo(sum(d => d.bid), 9);
      expect(out.reduce((s, c) => s + c.ask, 0)).toBeCloseTo(sum(d => d.ask), 9);
      // The fixpoint: no two resulting discs touch, so none can intersect.
      for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) expect(discsTouch(out[i], out[j])).toBe(false);
      expect(countCircleOverlaps(out.map(c => ({ x: c.x, y: c.y, r: c.r * (1 + BIG_TRADE_BREATH) })))).toBe(0);
      // Members oldest first; the anchor is the largest; lone prints keep their key.
      for (const c of out) {
        for (let k = 1; k < c.members.length; k++) expect(c.members[k].timeSec).toBeGreaterThanOrEqual(c.members[k - 1].timeSec);
        expect(c.anchor.size).toBe(Math.max(...c.members.map(m => m.size)));
        expect(c.key).toBe(c.members.length === 1 ? c.members[0].key : CLUSTER_KEY_PREFIX + c.anchor.key);
        expect(c.barTimes).toEqual([...new Set(c.members.map(m => m.barTime))].sort((a, z) => a - z));
      }
    }
  });

  it("a merge that makes a new neighbour touch merges again, until nothing touches", () => {
    // a and b touch; c touches neither of them alone, but touches their
    // larger, recentred cluster disc.
    const a = disc("a", 100, 100, 20, 1), b = disc("b", 138, 100, 20, 1);
    const c = disc("c", 119, 140, 10, 1);
    expect(discsTouch(a, c) || discsTouch(b, c)).toBe(false);
    const out = clusterBigTrades([a, b, c], { maxR: MAX });
    expect(out).toHaveLength(1);
    expect(out[0].members).toHaveLength(3);
  });

  it("drops what is not on the glass: no position, no radius, no size", () => {
    const out = clusterBigTrades([disc("a", NaN, 1, 10, 1), disc("b", 1, 1, 0, 1), disc("c", 1, 1, 10, 0), disc("d", 500, 1, 10, 1)], { maxR: MAX });
    expect(out.map(c => c.key)).toEqual(["d"]);
  });
});

describe("one selection finds its cluster", () => {
  const out = clusterBigTrades([disc("a", 100, 100, 20, 1), disc("b", 110, 100, 20, 2), disc("z", 400, 100, 10, 1)], { maxR: MAX });
  it("by the cluster's key, a member's key, or a lone disc's key", () => {
    expect(clusterHolding(out, "cluster:b")?.members.map(m => m.key)).toEqual(["a", "b"]);
    expect(clusterHolding(out, "a")?.key).toBe("cluster:b");
    expect(clusterHolding(out, "z")?.key).toBe("z");
    expect(clusterHolding(out, "nope")).toBeNull();
    expect(clusterHolding(out, null)).toBeNull();
  });
  it("a cluster key made at another zoom still finds the cluster its anchor is in", () => {
    expect(clusterHolding(out, "cluster:a")?.key).toBe("cluster:b");
    expect(clusterAnchorKey("cluster:b")).toBe("b");
    expect(clusterAnchorKey("bt:1:2")).toBe("bt:1:2");
  });
});

describe("the overlap receipt counts intersecting pairs", () => {
  it("counts pairs, not discs; touching at exactly r1 + r2 is not an intersection", () => {
    expect(countCircleOverlaps([])).toBe(0);
    expect(countCircleOverlaps([{ x: 0, y: 0, r: 5 }, { x: 10, y: 0, r: 5 }])).toBe(0);
    expect(countCircleOverlaps([{ x: 0, y: 0, r: 5 }, { x: 9, y: 0, r: 5 }])).toBe(1);
    expect(countCircleOverlaps([{ x: 0, y: 0, r: 5 }, { x: 1, y: 0, r: 5 }, { x: 2, y: 0, r: 5 }])).toBe(3);
  });
});

describe("F07B BARS TOUCHED dots", () => {
  it("one dot per bar from first to last, filled where a member printed", () => {
    expect(clusterBarDots([60, 120, 240], 60)).toEqual([true, true, false, true]);
    expect(clusterBarDots([60], 60)).toEqual([true]);
    expect(clusterBarDots([], 60)).toEqual([]);
  });
  it("capped, with the last dot still the cluster's final bar", () => {
    const dots = clusterBarDots([0, 60 * 30], 60, 12);
    expect(dots).toHaveLength(12);
    expect(dots[0]).toBe(true);
    expect(dots[11]).toBe(true);
  });
});

describe("a cluster disc's inscription: TOTAL ×n and the anchor price, never one member's time", () => {
  const inter = (t: string, px: number) => t.length * px * 0.55;
  it("the loudest cluster writes both lines; no time line is ever offered", () => {
    const cands = bigTradeInscriptionLines(MAX, "1.21", "03:55:12 AM", "↑ 84210.40", 4);
    expect(cands.every(set => set.every(l => l.text !== "03:55:12 AM"))).toBe(true);
    expect(fitBubbleInscription(MAX, cands, inter).map(l => l.text)).toEqual(["1.21 ×4", "↑ 84210.40"]);
  });
  it("a lone print is unchanged: SIZE / TIME / ↑PRICE", () => {
    expect(bigTradeInscriptionLines(MAX, "0.25", "t", "p")[0].map(l => l.text)).toEqual(["0.25", "t", "p"]);
    expect(bigTradeInscriptionLines(MAX, "0.25", "t", "p", 1)).toEqual(bigTradeInscriptionLines(MAX, "0.25", "t", "p"));
  });
});
