import { describe, expect, it } from "vitest";
import {
  MIN_DENSE_BUCKETS,
  selectLivingProfile,
} from "@/lib/marketData/viewModels/selectLivingProfile";
import { computeProfileFromBars, computeProfileFromTrades } from "@/lib/vpEngine";
import type { ProfileQuality, ProfileRow, ProfileSnapshot } from "@/lib/vpEngine";

/**
 * Snapshots are built by hand here rather than by running the engine, because
 * these tests are about how a SHAPE is read, and a hand-built shape is the only
 * way to assert that a specific trough was found for a specific reason.
 * The two engine-fed tests at the bottom prove the two paths still connect.
 */
function snap(
  totals: readonly number[],
  over: Partial<ProfileSnapshot> = {},
  base = 100,
): ProfileSnapshot {
  const tickSize = over.tickSize ?? 1;
  const rows: ProfileRow[] = totals
    .map((total, i) => ({ price: base + i * tickSize, up: total, down: 0, total }))
    .filter((r) => r.total > 0);
  const totalVolume = rows.reduce((s, r) => s + r.total, 0);
  let pocIdx = 0;
  for (let i = 1; i < rows.length; i++) if (rows[i].total > rows[pocIdx].total) pocIdx = i;
  return {
    rows,
    tickSize,
    poc: rows[pocIdx]?.price ?? 0,
    vah: rows[rows.length - 1]?.price ?? 0,
    val: rows[0]?.price ?? 0,
    totalVolume,
    delta: totalVolume,
    valueAreaPct: 0.7,
    quality: "trade-based" as ProfileQuality,
    populatedRows: rows.length,
    ...over,
  };
}

describe("the profile must be able to answer", () => {
  it("names NO_PROFILE when nothing has been distributed across price", () => {
    const vm = selectLivingProfile(snap([]));
    expect(vm.measured).toBe(false);
    expect(vm.missingInput).toBe("NO_PROFILE");
    expect(vm.missingInputNote).toContain("no profile to read");
    expect(vm.poc).toBeNull();
    expect(vm.vah).toBeNull();
    expect(vm.val).toBeNull();
  });

  it("is safe on null and undefined and still states its incapacity", () => {
    for (const input of [null, undefined]) {
      const vm = selectLivingProfile(input);
      expect(vm.measured).toBe(false);
      expect(vm.missingInput).toBe("NO_PROFILE");
    }
  });

  it("publishes NO LEVEL as null, never as zero — 0 is a price claim", () => {
    const vm = selectLivingProfile(snap([]));
    expect(vm.poc).not.toBe(0);
    expect(vm.locationNote).toBeNull();
  });

  it("names TOO_FEW_BUCKETS rather than drawing a value area across a handful", () => {
    const vm = selectLivingProfile(snap([5, 9, 4]));
    expect(vm.measured).toBe(false);
    expect(vm.missingInput).toBe("TOO_FEW_BUCKETS");
    expect(vm.missingInputNote).toContain("too few price buckets");
  });

  it("measures once the grid is wide enough", () => {
    const wide = Array.from({ length: MIN_DENSE_BUCKETS }, () => 5);
    expect(selectLivingProfile(snap(wide)).measured).toBe(true);
  });
});

describe("the candle-estimated path may not claim a node", () => {
  const shape = [2, 2, 9, 2, 1, 0, 1, 2, 9, 2, 2];

  it("withholds HVN and LVN entirely when the profile came from bars", () => {
    const vm = selectLivingProfile(snap(shape, { quality: "candle-estimated" }));
    expect(vm.measured).toBe(true);
    expect(vm.nodesMeasured).toBe(false);
    expect(vm.nodesMissingInput).toBe("CANDLE_ESTIMATED");
    expect(vm.hvn).toEqual([]);
    expect(vm.lvn).toEqual([]);
  });

  it("says WHY, in terms of what the estimate actually did", () => {
    const vm = selectLivingProfile(snap(shape, { quality: "candle-estimated" }));
    expect(vm.nodesNote).toContain("spread each bar's volume");
    expect(vm.nodesNote).toContain("candle geometry");
    expect(vm.qualityNote).toContain("ESTIMATED FROM CANDLES");
  });

  it("still publishes POC / VAH / VAL, because an aggregate survives the spread", () => {
    const vm = selectLivingProfile(snap(shape, { quality: "candle-estimated" }));
    expect(vm.poc).not.toBeNull();
    expect(vm.vah).not.toBeNull();
    expect(vm.val).not.toBeNull();
  });

  it("finds the same shape when the SAME numbers are trade-based", () => {
    const vm = selectLivingProfile(snap(shape));
    expect(vm.nodesMeasured).toBe(true);
    expect(vm.hvn.length).toBeGreaterThan(0);
    expect(vm.lvn.length).toBeGreaterThan(0);
  });
});

describe("the holes the engine dropped are restored before shape is read", () => {
  it("finds an UNTRADED price as a low-volume node", () => {
    // Bucket 105 takes no volume at all, so vpEngine omits the row entirely.
    // In the sparse array 104 and 106 sit adjacent and the void is invisible.
    const vm = selectLivingProfile(snap([4, 4, 5, 4, 4, 0, 4, 4, 5, 4, 4]));
    const hole = vm.lvn.find((n) => n.untraded);
    expect(hole, "the untraded bucket must surface as an LVN").toBeDefined();
    expect(hole!.price).toBe(105);
    expect(hole!.volume).toBe(0);
  });

  it("the sparse snapshot genuinely omitted that bucket", () => {
    const s = snap([4, 4, 5, 4, 4, 0, 4, 4, 5, 4, 4]);
    expect(s.rows.some((r) => r.price === 105)).toBe(false);
    expect(s.populatedRows).toBe(10);
  });

  it("ranks the emptiest price first — an untraded bucket outranks a thin one", () => {
    const vm = selectLivingProfile(snap([4, 4, 5, 4, 4, 0, 4, 4, 5, 1, 4, 4, 5, 4, 4]));
    expect(vm.lvn[0].volume).toBe(0);
  });
});

describe("an edge is a tail, not a refusal", () => {
  it("does not call the thin bottom of the distribution an LVN", () => {
    const vm = selectLivingProfile(snap([1, 2, 4, 8, 12, 8, 4, 2, 1]));
    expect(vm.nodesMeasured).toBe(true);
    expect(vm.lvn).toEqual([]);
  });

  it("requires volume BOTH above and below before naming a trough", () => {
    const vm = selectLivingProfile(snap([9, 9, 9, 9, 1, 9, 9, 9, 9]));
    expect(vm.lvn).toHaveLength(1);
    expect(vm.lvn[0].price).toBe(104);
  });

  it("finds the peak of a clean unimodal profile as an HVN", () => {
    const vm = selectLivingProfile(snap([1, 2, 4, 8, 20, 8, 4, 2, 1]));
    expect(vm.hvn).toHaveLength(1);
    expect(vm.hvn[0].price).toBe(104);
    expect(vm.hvn[0].volume).toBe(20);
  });
});

describe("every node carries its context", () => {
  const vm = selectLivingProfile(
    snap([2, 2, 9, 2, 1, 0, 1, 2, 9, 2, 2], { vah: 108, val: 102, poc: 102 }),
  );

  it("states whether the node sits inside the value area", () => {
    const inside = vm.hvn.find((n) => n.price === 102);
    const alsoInside = vm.hvn.find((n) => n.price === 108);
    expect(inside?.insideValueArea).toBe(true);
    expect(alsoInside?.insideValueArea).toBe(true);
    const below = vm.lvn.find((n) => n.price === 105);
    expect(below?.insideValueArea).toBe(true);
  });

  it("states the SIGNED distance from the POC", () => {
    const above = vm.hvn.find((n) => n.price === 108);
    expect(above?.distanceFromPoc).toBe(6);
    const at = vm.hvn.find((n) => n.price === 102);
    expect(at?.distanceFromPoc).toBe(0);
  });

  it("states the node's share of the whole distribution", () => {
    const node = vm.hvn[0];
    expect(node.shareOfTotal).toBeCloseTo(node.volume / vm.totalVolume, 12);
    expect(node.shareOfTotal).toBeGreaterThan(0);
  });

  it("orders HVN by volume and LVN by emptiness, with price breaking ties", () => {
    const twin = selectLivingProfile(snap([2, 2, 9, 2, 2, 2, 2, 2, 9, 2, 2]));
    expect(twin.hvn.map((n) => n.price)).toEqual([102, 108]);
  });

  it("caps the rail — a rail of forty nodes is a histogram, not a read", () => {
    const sawtooth = Array.from({ length: 60 }, (_, i) => (i % 2 === 0 ? 10 : 1));
    const vmCapped = selectLivingProfile(snap(sawtooth), { maxNodes: 3 });
    expect(vmCapped.hvn.length).toBeLessThanOrEqual(3);
    expect(vmCapped.lvn.length).toBeLessThanOrEqual(3);
  });
});

describe("location is owned here, so two surfaces cannot word it differently", () => {
  const base = snap(Array.from({ length: 11 }, () => 5), { vah: 108, val: 102 });

  it("says nothing at all when no live price was handed in", () => {
    expect(selectLivingProfile(base).locationNote).toBeNull();
    expect(selectLivingProfile(base).livePrice).toBeNull();
  });

  it("reads ABOVE, INSIDE and BELOW the value area", () => {
    expect(selectLivingProfile(base, { livePrice: 109 }).locationNote).toContain("ABOVE");
    expect(selectLivingProfile(base, { livePrice: 105 }).locationNote).toContain("INSIDE");
    expect(selectLivingProfile(base, { livePrice: 101 }).locationNote).toContain("BELOW");
  });

  it("treats the value-area edges as inside, matching how the levels are drawn", () => {
    expect(selectLivingProfile(base, { livePrice: 108 }).locationNote).toContain("INSIDE");
    expect(selectLivingProfile(base, { livePrice: 102 }).locationNote).toContain("INSIDE");
  });

  it("ignores a non-finite live price rather than rendering NaN", () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const vm = selectLivingProfile(base, { livePrice: bad });
      expect(vm.livePrice).toBeNull();
      expect(vm.locationNote).toBeNull();
    }
  });
});

describe("it connects to the engine that owns the distribution", () => {
  it("reads a trade-built profile and computes nodes", () => {
    const trades = [];
    for (let i = 0; i < 40; i++) {
      // A dense shelf at 100 and a second at 130, with a thin middle.
      trades.push({ price: 100 + (i % 4), size: 50, side: "buy" as const });
      trades.push({ price: 130 + (i % 4), size: 50, side: "sell" as const });
    }
    trades.push({ price: 115, size: 1, side: "buy" as const });
    const vm = selectLivingProfile(computeProfileFromTrades(trades, { tickSize: 1 }));
    expect(vm.quality).toBe("trade-based");
    expect(vm.measured).toBe(true);
    expect(vm.nodesMeasured).toBe(true);
  });

  it("reads a bar-built profile and REFUSES nodes, by the engine's own label", () => {
    const bars = Array.from({ length: 30 }, (_, i) => ({
      time: i,
      open: 100 + i,
      high: 105 + i,
      low: 99 + i,
      close: 104 + i,
      volume: 1_000,
    }));
    const vm = selectLivingProfile(computeProfileFromBars(bars, { tickSize: 1 }));
    expect(vm.quality).toBe("candle-estimated");
    expect(vm.measured).toBe(true);
    expect(vm.nodesMeasured).toBe(false);
    expect(vm.nodesMissingInput).toBe("CANDLE_ESTIMATED");
  });

  it("never rounds a price the engine keyed", () => {
    const s = snap(
      Array.from({ length: 11 }, (_, i) => (i === 5 ? 40 : 4)),
      { tickSize: 0.01 },
      60_123.4587,
    );
    const vm = selectLivingProfile(s);
    expect(vm.hvn[0]?.price).toBeCloseTo(60_123.4587 + 5 * 0.01, 10);
  });
});
