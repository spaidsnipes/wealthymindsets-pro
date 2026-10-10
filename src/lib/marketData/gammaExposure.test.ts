import { describe, expect, it } from "vitest";
import type { CboeOptionRow, CboeOptionsReceipt } from "@/lib/marketData/cboeDelayedOptions";
import {
  chainStrikeStep, gexBucketAt, gexWords, selectGammaExposure, GEX_MIN_CONTRACTS,
} from "@/lib/marketData/gammaExposure";
import { composeWallsGammaMarks, parseWallsGamma, WALLS_GAMMA_OFF } from "@/lib/marketData/wallsGammaFamily";

const NOW = Date.parse("2026-10-10T15:00:00Z");
const EXP = "2026-10-30";

const row = (strike: number, type: "call" | "put", oi: number, gamma: number | null, iv: number | null, expiration = EXP): CboeOptionRow =>
  ({ contract: `X${strike}${type}`, type, expiration, strike, openInterest: oi, gamma, iv, volume: null });

const receipt = (rows: CboeOptionRow[], over: Partial<CboeOptionsReceipt> = {}): CboeOptionsReceipt => ({
  source: "CBOE_DELAYED", underlying: "SPY", spot: 100, iv30: 20, chainAsOf: "2026-10-09T20:15:00Z", underlyingAsOf: null, rows, dropped: 0, ...over,
});

/** 25 call strikes 90..114 with source gamma — all positive under the stated assumption. */
const callsOnly = () => Array.from({ length: 25 }, (_, i) => row(90 + i, "call", 1000, 0.01, 0.2));
/** Puts below 100 (heavy), calls above — the profile must cross zero inside the strike range. */
const split = () => [
  ...Array.from({ length: 15 }, (_, i) => row(85 + i, "put", 5000, null, 0.25)),
  ...Array.from({ length: 15 }, (_, i) => row(101 + i, "call", 5000, null, 0.25)),
];

describe("selectGammaExposure — the GEX owner", () => {
  it("SILENCE: no chain / no spot / too few priced contracts — never fabricated", () => {
    expect(selectGammaExposure({ receipt: null, chartSpot: 100, nowMs: NOW })).toMatchObject({ drawn: false, reason: "NO_CHAIN" });
    expect(selectGammaExposure({ receipt: receipt(callsOnly(), { spot: null }), chartSpot: null, nowMs: NOW })).toMatchObject({ drawn: false, reason: "NO_SPOT" });
    const few = callsOnly().slice(0, GEX_MIN_CONTRACTS - 1);
    expect(selectGammaExposure({ receipt: receipt(few), chartSpot: null, nowMs: NOW })).toMatchObject({ drawn: false, reason: "TOO_FEW_PRICED" });
    // IV and gamma both missing: every contract is excluded, the reading is silent (not zero).
    const blind = callsOnly().map(r => ({ ...r, gamma: null, iv: null }));
    expect(selectGammaExposure({ receipt: receipt(blind), chartSpot: null, nowMs: NOW })).toMatchObject({ drawn: false, reason: "TOO_FEW_PRICED" });
  });

  it("CONVENTION: Γ × OI × 100 × S² × 0.01, calls + (stated assumption)", () => {
    const vm = selectGammaExposure({ receipt: receipt(callsOnly()), chartSpot: null, nowMs: NOW });
    if (!vm.drawn) throw new Error("expected drawn");
    const b = vm.buckets.find(x => x.price === 100)!;
    expect(b.callGex).toBeCloseTo(0.01 * 1000 * 100 * 100 * 100 * 0.01, 6); // 10,000 $/1%
    expect(b.putGex).toBe(0);
    expect(vm.multiplier).toBe(100);
    expect(vm.contracts.gammaFromSource).toBe(25);
    expect(vm.model.assumption).toMatch(/ASSUMPTION/);
    expect(vm.model.nonClaims).toMatch(/does not pin/);
    expect(vm.netTotal).toBeGreaterThan(0);
  });

  it("puts carry the negative sign", () => {
    const rows = callsOnly().map(r => ({ ...r, type: "put" as const }));
    const vm = selectGammaExposure({ receipt: receipt(rows), chartSpot: null, nowMs: NOW });
    if (!vm.drawn) throw new Error("expected drawn");
    expect(vm.netTotal).toBeLessThan(0);
    expect(vm.buckets.every(b => b.net <= 0)).toBe(true);
  });

  it("DERIBIT: no source gamma → Black–Scholes from the contract's OWN IV; missing IV is excluded, never given iv30", () => {
    const rows = [...callsOnly().map(r => ({ ...r, gamma: null })), row(100, "put", 50, null, null)];
    const vm = selectGammaExposure({ receipt: receipt(rows, { source: "DERIBIT_PUBLIC", iv30: 55 }), chartSpot: null, nowMs: NOW });
    if (!vm.drawn) throw new Error("expected drawn");
    expect(vm.multiplier).toBe(1);
    expect(vm.contracts.gammaFromModel).toBe(25);
    expect(vm.contracts.excludedNoIv).toBe(1);
    expect(vm.buckets.find(b => b.price === 100)!.putOi).toBe(0);
    expect(vm.clocks.oiAsOf).toBe("CURRENT");
  });

  it("FLIP only where the profile crosses zero inside the chain's strike range", () => {
    const none = selectGammaExposure({ receipt: receipt(callsOnly().map(r => ({ ...r, gamma: null }))), chartSpot: null, nowMs: NOW });
    if (!none.drawn) throw new Error("expected drawn");
    expect(none.flip).toEqual({ kind: "NONE", reason: "NO_CROSSING_IN_STRIKE_RANGE" });
    expect(none.regions.every(r => r.sign === "POSITIVE")).toBe(true);

    const vm = selectGammaExposure({ receipt: receipt(split()), chartSpot: null, nowMs: NOW });
    if (!vm.drawn) throw new Error("expected drawn");
    expect(vm.flip.kind).toBe("LEVEL");
    if (vm.flip.kind === "LEVEL") {
      expect(vm.flip.level).toBeGreaterThanOrEqual(vm.strikeRange.lo);
      expect(vm.flip.level).toBeLessThanOrEqual(vm.strikeRange.hi);
    }
    expect(vm.regions.map(r => r.sign)).toContain("NEGATIVE");
    expect(vm.regions.map(r => r.sign)).toContain("POSITIVE");
    for (const p of vm.profile) {
      expect(p.price).toBeGreaterThanOrEqual(vm.strikeRange.lo - 1e-9);
      expect(p.price).toBeLessThanOrEqual(vm.strikeRange.hi + 1e-9);
    }
  });

  it("a near-money subset withholds the flip and is never FULL", () => {
    const vm = selectGammaExposure({ receipt: receipt(split(), { scope: { kind: "NEAR_MONEY_SUBSET", reachPct: 4 } }), chartSpot: null, nowMs: NOW });
    if (!vm.drawn) throw new Error("expected drawn");
    expect(vm.flip).toEqual({ kind: "NONE", reason: "WITHHELD_NEAR_MONEY_SUBSET" });
    expect(vm.regions).toEqual([]);
    expect(vm.grade).toBe("PARTIAL");
  });

  it("GRADE: ≥25% excluded or a chain older than 96h is DEGRADED, with the reason in words", () => {
    const rows = [...callsOnly(), ...Array.from({ length: 10 }, (_, i) => row(95 + i, "put", 10, null, null))];
    const vm = selectGammaExposure({ receipt: receipt(rows), chartSpot: null, nowMs: NOW });
    if (!vm.drawn) throw new Error("expected drawn");
    expect(vm.grade).toBe("DEGRADED");
    expect(vm.gradeWhy.join(" ")).toMatch(/excluded/);
    const stale = selectGammaExposure({ receipt: receipt(callsOnly(), { chainAsOf: "2026-10-01T20:00:00Z" }), chartSpot: null, nowMs: NOW });
    expect(stale.drawn && stale.grade).toBe("DEGRADED");
    // Saturday on a Friday-close chain is not stale.
    const fresh = selectGammaExposure({ receipt: receipt(callsOnly().map(r => ({ ...r, gamma: null }))), chartSpot: null, nowMs: NOW });
    expect(fresh.drawn && fresh.grade).toBe("FULL");
  });

  it("buckets at the chain's own strike step, Inspect finds the bucket under a price, expiries recorded", () => {
    expect(chainStrikeStep([95, 96, 97, 97.5, 98, 99])).toBe(1);
    const rows = [...callsOnly(), row(100, "call", 400, 0.02, 0.2, "2026-11-20")];
    const vm = selectGammaExposure({ receipt: receipt(rows), chartSpot: null, nowMs: NOW });
    if (!vm.drawn) throw new Error("expected drawn");
    expect(vm.bucketWidth).toBe(1);
    const b = gexBucketAt(vm, 100.2)!;
    expect(b.price).toBe(100);
    expect(b.expiries.map(e => e.expiration).sort()).toEqual([EXP, "2026-11-20"]);
    expect(vm.expiries).toEqual([EXP, "2026-11-20"]);
    expect(b.iv).toBeCloseTo(0.2, 6);
  });

  it("gexWords prints $ per 1%", () => {
    expect(gexWords(1.23e9)).toBe("+$1.2B/1%");
    expect(gexWords(-3.4e8)).toBe("−$340.0M/1%");
  });
});

describe("composeWallsGammaMarks — never the same line twice", () => {
  const fmt = (p: number) => String(p);
  const wall = (strike: number, type: "CALL_OI" | "PUT_OI") => ({ type, strike, openInterest: 42_000, share: 0.2, volume: null, side: "ABOVE" as const });

  it("a call wall and a gamma concentration at one strike are ONE mark naming both measures", () => {
    const gex = selectGammaExposure({ receipt: receipt(callsOnly()), chartSpot: null, nowMs: NOW });
    if (!gex.drawn) throw new Error("expected drawn");
    const top = gex.concentration[0];
    const sel = { ...WALLS_GAMMA_OFF, CALL_WALL: true, GAMMA_CONCENTRATION: true };
    const r = composeWallsGammaMarks({ selection: sel, callWalls: [wall(top.price, "CALL_OI")], putWalls: [], gex, pressureFieldOn: false, mergeWithin: 0.5, fmt });
    const at = r.marks.filter(m => Math.abs(m.price - top.price) <= 0.5);
    expect(at).toHaveLength(1);
    expect(at[0].kinds).toEqual(["CALL_WALL", "GAMMA_CONC_POS"]);
    expect(at[0].label).toMatch(/^CALL WALL .* · OI 42k · Γ /);
  });

  it("call wall is never labelled gamma; off parts draw nothing", () => {
    const r = composeWallsGammaMarks({ selection: { ...WALLS_GAMMA_OFF, PUT_WALL: true }, callWalls: [wall(110, "CALL_OI")], putWalls: [wall(90, "PUT_OI")], gex: null, pressureFieldOn: false, mergeWithin: 0.5, fmt });
    expect(r.marks).toHaveLength(1);
    expect(r.marks[0].label).toBe("PUT WALL 90 · OI 42k");
    expect(r.marks[0].label).not.toMatch(/Γ|GAMMA/);
  });

  it("flip and regions yield to Derivatives Pressure while its field is on", () => {
    const gex = selectGammaExposure({ receipt: receipt(split()), chartSpot: null, nowMs: NOW });
    const sel = { ...WALLS_GAMMA_OFF, GAMMA_FLIP: true, GAMMA_POSITIVE: true, GAMMA_NEGATIVE: true };
    const on = composeWallsGammaMarks({ selection: sel, callWalls: [], putWalls: [], gex, pressureFieldOn: true, mergeWithin: 0.5, fmt });
    expect(on.marks).toEqual([]);
    expect(Object.keys(on.yielded).sort()).toEqual(["GAMMA_FLIP", "GAMMA_NEGATIVE", "GAMMA_POSITIVE"]);
    const off = composeWallsGammaMarks({ selection: sel, callWalls: [], putWalls: [], gex, pressureFieldOn: false, mergeWithin: 0.5, fmt });
    expect(off.marks.map(m => m.kinds[0])).toEqual(["GAMMA_FLIP"]);
  });

  it("parseWallsGamma accepts stored JSON and drops anything else", () => {
    expect(parseWallsGamma('{"CALL_WALL":true,"X":true}')).toEqual({ ...WALLS_GAMMA_OFF, CALL_WALL: true });
    expect(parseWallsGamma("nonsense")).toEqual(WALLS_GAMMA_OFF);
  });
});
