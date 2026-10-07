import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import type { MarketStructureVM } from "@/lib/marketData/viewModels/selectMarketStructure";
import type { DerivativesPressureVM } from "@/lib/marketData/viewModels/selectDerivativesPressure";
import type { LiquidityLifecycleVM } from "@/lib/marketData/viewModels/selectLiquidityLifecycle";
import { detectFvgs } from "./fvgEngine";
import {
  derivativesSource,
  fvgRelationshipFamilies,
  fvgRelationshipRows,
  fvgRelationshipsFor,
  liquiditySource,
  profileSource,
  structureSource,
} from "./fvgRelationships";
import { FVG_CONTEXT_PROFILE_BARS, fvgBarContext, fvgBarOnlyRelationships } from "./fvgBarContext";

type Row = readonly [number, number, number, number];
const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 6, 10, 0, 0);
const SYM = "BTC-USD";
function series(rows: readonly Row[]): CanonicalBar[] {
  return rows.map(([o, h, l, c], i) => {
    const asOf = T0 + i * MIN;
    return {
      barId: `${SYM}|1m|${asOf}|e0`, symbolId: SYM, sessionId: "SESSION_CONTINUOUS", timeframe: "1m",
      open: o, high: h, low: l, close: c, volume: 10, asOf, receivedAt: asOf + MIN,
      fidelity: "INDICATIVE", source: "fixture", provenance: "REST_BACKFILL", truthEpoch: 0,
    };
  });
}
const FLAT: Row[] = Array.from({ length: 15 }, () => [100, 101, 99, 100] as Row);
// b1 dips to 98.5 (below a 99 swing low) and closes 100.5; b2 closes 103.8 above a 103 swing high.
const BULL: Row[] = [[100, 101, 98.5, 100.5], [100.5, 104, 100.3, 103.8], [103.8, 105, 102, 104.5]];
const AWAY: Row = [104.5, 105, 103.5, 104.5];
const bars = series([...FLAT, ...BULL, AWAY, AWAY]);
const obj = detectFvgs(bars, { symbolId: SYM, timeframe: "1m" }).objects.find(o => o.direction === "BULLISH")!;
const sec = (i: number) => bars[i].asOf / 1000;

const vm = (over: Partial<MarketStructureVM>): MarketStructureVM => ({
  measured: true, lookback: 2, barCount: bars.length, unconfirmedBars: 2, confirmationLagNote: "lag note",
  swingHighs: [], swingLows: [], lastSwingHigh: null, lastSwingLow: null, bias: "RANGE", biasNote: "", insufficientNote: null, ...over,
});

describe("FVG relationships — owner readings by reference, never upgraded", () => {
  it("STRUCTURE: broke the confirmed swing high, reclaimed the confirmed swing low, swing inside", () => {
    const s = { vm: vm({ swingHighs: [{ time: sec(5), price: 103 }], swingLows: [{ time: sec(6), price: 99 }, { time: sec(8), price: 101.5 }] }), barSec: 60 };
    const r = fvgRelationshipsFor(obj, { structure: s }, bars);
    const kinds = r.relationships.filter(x => x.family === "STRUCTURE").map(x => `${x.kind}@${x.price}`);
    expect(kinds).toContain("BROKE_SWING@103");
    expect(kinds).toContain("SWING_INSIDE@101.5");
    // RECLAIMED uses the LAST confirmed opposite swing (101.5): b1 low 98.5 < 101.5 and b2 closed 103.8 > it.
    expect(kinds).toContain("RECLAIMED_SWING@101.5");
    expect(r.relationships.every(x => x.tag === "DERIVED MEASUREMENT")).toBe(true);
    expect(r.sources[0]).toMatchObject({ owner: "selectMarketStructure", evidence: "FULL" });
  });

  it("STRUCTURE never uses a swing not yet CONFIRMED when b2 opened (no hindsight)", () => {
    const b2 = 16;
    // Pivot at b2-1 with lookback 2: confirmed only 2 bars later → after b2 opened → ignored.
    const s = { vm: vm({ swingHighs: [{ time: sec(b2 - 1), price: 103 }] }), barSec: 60 };
    expect(fvgRelationshipsFor(obj, { structure: s }, bars).relationships.filter(x => x.kind === "BROKE_SWING")).toEqual([]);
  });

  it("PROFILE: POC inside, VAH near, VAL far; evidence follows the owner's quality", () => {
    const p = { owner: "selectLivingProfile", label: "Living Profile", drawn: true, quality: "candle-estimated", poc: 101.5, vah: 102.3, val: 90, hvn: [101.2], lvn: [] };
    const r = fvgRelationshipsFor(obj, { profiles: [p] });
    expect(r.relationships.map(x => `${x.kind}:${x.relation}`)).toEqual(["VAH:NEAR", "POC:INSIDE", "HVN:INSIDE"]);
    expect(profileSource(p)).toMatchObject({ evidence: "PARTIAL", provenance: expect.stringMatching(/CANDLE-EST/) });
    expect(profileSource({ ...p, quality: "trade-based" }).evidence).toBe("FULL");
    expect(profileSource({ ...p, drawn: false, reason: "NO_VOLUME" })).toMatchObject({ evidence: "SILENCE", provenance: "NO_VOLUME" });
  });

  it("WALLS: options walls by the owner's own OI and life word; DELAYED → DEGRADED; liquidity pools overlap", () => {
    const d = {
      drawn: true, version: 1, underlying: SYM, spot: 104, climate: "PINNED", climateRatio: 0, netAtSpot: 0, gross: 1, geography: [],
      zeroGamma: 102.4, walls: [{ strike: 101.5, exposure: 1, share: 0.4, callOi: 10, putOi: 50, side: "ABOVE", life: "TESTED", tests: 1, closesBeyond: 0, firstTestTime: null, testTimes: [] }],
      testSpanSec: 0, pockets: [], envelope: null, contracts: 40, clocks: { chainAsOf: null, underlyingAsOf: null, oiAsOf: "PRIOR_SESSION", modelAsOf: 0 },
      source: "CBOE", fidelity: "DELAYED", epistemic: { exposure: "INFERRED", envelope: "DERIVED", tests: "OBSERVED" }, assumption: "", receipt: "",
    } as unknown as DerivativesPressureVM;
    const l = { version: 1, drawn: true, reason: "DRAWN", pools: [{ price: 101.8, low: 101.6, high: 102.6, stage: "PERSISTED", events: [], volume: 5 }], step: 4, basis: "CANDLE_ESTIMATED", pulledRefusal: "x" } as LiquidityLifecycleVM;
    const r = fvgRelationshipsFor(obj, { derivatives: d, liquidity: l });
    expect(r.relationships.map(x => `${x.kind}:${x.relation}:${x.ownerState ?? "-"}`)).toEqual(["LIQUIDITY_POOL:OVERLAPS:PERSISTED", "GAMMA_FLIP:NEAR:-", "PUT_WALL:INSIDE:TESTED"]);
    expect(derivativesSource(d).evidence).toBe("DEGRADED");
    expect(derivativesSource({ ...d, fidelity: "SNAPSHOT" } as DerivativesPressureVM).evidence).toBe("PARTIAL");
    expect(derivativesSource({ drawn: false, version: 1, underlying: SYM, reason: "AFTER_REPLAY_CLOCK", contracts: 0, receipt: "" })).toMatchObject({ evidence: "SILENCE", provenance: expect.stringMatching(/AFTER_REPLAY_CLOCK/) });
    expect(liquiditySource(l).evidence).toBe("PARTIAL");
    expect(liquiditySource({ ...l, basis: "OBSERVED_BOOK", venue: "Coinbase" }).evidence).toBe("FULL");
    expect(fvgRelationshipFamilies(r)).toEqual(new Set(["WALL"]));
  });

  it("an owner with nothing to say is listed as SILENCE, never omitted", () => {
    const r = fvgRelationshipsFor(obj, {});
    expect(r.relationships).toEqual([]);
    expect(r.sources.map(s => `${s.family}:${s.evidence}`)).toEqual(["STRUCTURE:SILENCE", "PROFILE:SILENCE", "WALL:SILENCE", "WALL:SILENCE"]);
    expect(structureSource({ vm: vm({ measured: false, insufficientNote: "Only 3 bars" }), barSec: 60 })).toMatchObject({ evidence: "SILENCE", provenance: "Only 3 bars" });
    const rows = fvgRelationshipRows(r, p => p.toFixed(2));
    expect(rows.rows).toEqual([]);
    expect(rows.silences).toHaveLength(4);
  });

  it("Inspect rows: spatially ordered, each with its source evidence + provenance", () => {
    const p = { owner: "selectLivingProfile", label: "Living Profile", drawn: true, quality: "trade-based", poc: 101.5, vah: 102.3, val: 90 };
    const rows = fvgRelationshipRows(fvgRelationshipsFor(obj, { profiles: [p] }), x => x.toFixed(2)).rows;
    expect(rows[0]).toBe("Living Profile VAH 102.30 — near (0.30 away) · FULL (volume placed by classified prints (trade-based))");
    expect(rows[1]).toMatch(/^Living Profile POC 101\.50 — inside · FULL/);
  });

  it("bars alone: structure from the owner, profile from the bars BEFORE b1 only; walls SILENCE", () => {
    const ctx = fvgBarContext(bars, SYM, "1m");
    const a = fvgBarOnlyRelationships(ctx, obj);
    // Later bars cannot change the prior-profile relationship.
    const more = series([...FLAT, ...BULL, AWAY, AWAY, [101, 101.8, 101.1, 101.5], [101, 101.8, 101.1, 101.5]]);
    const objMore = detectFvgs(more, { symbolId: SYM, timeframe: "1m" }).objects.find(o => o.objectId === obj.objectId)!;
    const b = fvgBarOnlyRelationships(fvgBarContext(more, SYM, "1m"), objMore);
    expect(b.relationships.filter(x => x.family === "PROFILE")).toEqual(a.relationships.filter(x => x.family === "PROFILE"));
    expect(a.sources.find(s => s.family === "PROFILE")).toMatchObject({ owner: "selectVisibleRangeProfile", evidence: "PARTIAL" });
    expect(a.sources.filter(s => s.family === "WALL").every(s => s.evidence === "SILENCE")).toBe(true);
    expect(FVG_CONTEXT_PROFILE_BARS).toBe(100);
  });

  it("source: reads owners' VMs, never re-detects their objects or upgrades their words", () => {
    const src = readFileSync(path.resolve(__dirname, "fvgRelationships.ts"), "utf8");
    expect(src.length).toBeGreaterThan(1000);
    expect(src).not.toMatch(/swingHighLow\(|computeProfileFromBars\(|bsGamma\(/);
    expect(src).not.toMatch(/must fill|will fill|probabilit|score\s*[:=]/i);
  });
});
