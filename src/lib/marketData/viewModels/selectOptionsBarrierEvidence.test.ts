import { describe, expect, it } from "vitest";

import type { CboeOptionRow, CboeOptionsReceipt } from "@/lib/marketData/cboeDelayedOptions";
import { bsPartials, rootKind, rowsInScope, scenarioHedge, selectOptionsBarrierEvidence, zeroRoots } from "./selectOptionsBarrierEvidence";

// ── Black–Scholes call delta, for finite-difference proof of the partials ──
const N = (x: number) => {
  // Abramowitz–Stegun 7.1.26 via erf
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
};
const callDelta = (S: number, K: number, sigma: number, tau: number, r = 0.04) =>
  N((Math.log(S / K) + (r + (sigma * sigma) / 2) * tau) / (sigma * Math.sqrt(tau)));

const NOW = Date.parse("2026-10-05T15:00:00Z"); // 11:00 ET, Monday
const row = (over: Partial<CboeOptionRow>): CboeOptionRow => ({
  contract: "X", type: "call", expiration: "2026-10-16", strike: 100, openInterest: 1000, gamma: null, iv: 0.25, volume: null, ...over,
});
const receipt = (rows: CboeOptionRow[], over: Partial<CboeOptionsReceipt> = {}): CboeOptionsReceipt =>
  ({ underlying: "TEST", spot: 100, iv30: 25, rows, chainAsOf: null, underlyingAsOf: null, source: "CBOE_DELAYED", ...over } as unknown as CboeOptionsReceipt);

describe("Black–Scholes partials — proved against delta by finite difference (sign/unit conventions)", () => {
  const S = 100, K = 105, sig = 0.3, tau = 30 / 365;
  const p = bsPartials(S, K, sig, tau)!;
  it("gamma = ∂Δ/∂S", () => {
    const h = 0.01;
    expect(p.gamma).toBeCloseTo((callDelta(S + h, K, sig, tau) - callDelta(S - h, K, sig, tau)) / (2 * h), 4);
  });
  it("vanna = ∂Δ/∂σ (per 1.00 of vol)", () => {
    const h = 1e-4;
    expect(p.vanna).toBeCloseTo((callDelta(S, K, sig + h, tau) - callDelta(S, K, sig - h, tau)) / (2 * h), 3);
  });
  it("charm = ∂Δ/∂t with t ELAPSED (τ shrinking), per year", () => {
    const h = 1e-5;
    const elapsed = (callDelta(S, K, sig, tau - h) - callDelta(S, K, sig, tau + h)) / (2 * h);
    expect(p.charmPerYear).toBeCloseTo(elapsed, 2);
  });
  it("degenerate inputs are refused, not zero", () => {
    expect(bsPartials(100, 100, 0, 0.1)).toBeNull();
    expect(bsPartials(100, 100, 0.2, 0)).toBeNull();
  });
});

describe("expiry scope", () => {
  const rows = [row({ expiration: "2026-10-05" }), row({ expiration: "2026-10-09" }), row({ expiration: "2026-10-02" })];
  it("expired contracts are never counted; 0DTE is today's New York date; NEAREST is the first live expiry", () => {
    expect(rowsInScope(rows, "ALL", NOW).expiries).toEqual(["2026-10-05", "2026-10-09"]);
    expect(rowsInScope(rows, "0DTE", NOW).expiries).toEqual(["2026-10-05"]);
    expect(rowsInScope(rows, "NEAREST", NOW).expiries).toEqual(["2026-10-05"]);
    expect(rowsInScope([row({ expiration: "2026-10-09" })], "0DTE", NOW).rows).toHaveLength(0);
  });
});

describe("zero-gamma roots are reported honestly", () => {
  it("none, one, many", () => {
    expect(rootKind(zeroRoots([{ price: 1, net: 1 }, { price: 2, net: 2 }]))).toBe("NONE");
    expect(zeroRoots([{ price: 1, net: -1 }, { price: 2, net: 1 }])).toEqual([1.5]);
    expect(rootKind(zeroRoots([{ price: 1, net: -1 }, { price: 2, net: 1 }, { price: 3, net: -1 }]))).toBe("MANY");
  });
});

describe("selectOptionsBarrierEvidence", () => {
  const rows = [
    row({ type: "call", strike: 110, openInterest: 9000, volume: 50 }),
    row({ type: "call", strike: 105, openInterest: 3000, volume: null }),
    row({ type: "put", strike: 90, openInterest: 8000, volume: 400 }),
    row({ type: "put", strike: 95, openInterest: 2000 }),
    row({ type: "call", strike: 100, openInterest: 500, iv: null }),
  ];

  it("call and put concentration walls are separate species; volume rides beside OI, never added", () => {
    const vm = selectOptionsBarrierEvidence(receipt(rows, { iv30: 0 } as Partial<CboeOptionsReceipt>), 100, NOW);
    if (!vm.drawn) throw new Error("not drawn");
    expect(vm.callWalls.map(w => [w.type, w.strike, w.openInterest, w.volume])).toContainEqual(["CALL_OI", 110, 9000, 50]);
    expect(vm.putWalls.map(w => [w.type, w.strike, w.openInterest])).toContainEqual(["PUT_OI", 90, 8000]);
    expect(vm.callWalls.every(w => w.type === "CALL_OI") && vm.putWalls.every(w => w.type === "PUT_OI")).toBe(true);
    expect(vm.callWalls.find(w => w.strike === 110)?.side).toBe("ABOVE");
  });

  it("a contract with no IV (and no IV30 fallback) is EXCLUDED and counted — never valued at zero", () => {
    const vm = selectOptionsBarrierEvidence(receipt(rows, { iv30: 0 } as Partial<CboeOptionsReceipt>), 100, NOW);
    if (!vm.drawn) throw new Error("not drawn");
    expect(vm.excludedNoIv).toBe(1);
    expect(vm.contracts).toBe(4);
    expect(vm.receipt).toContain("NOIV:1");
  });

  it("the scope is named in the receipt; an empty scope refuses", () => {
    expect(selectOptionsBarrierEvidence(receipt(rows), 100, NOW, "0DTE")).toMatchObject({ drawn: false, reason: "NO_CONTRACTS_IN_SCOPE", receipt: "OPTEVID:SILENT:NO_CONTRACTS_IN_SCOPE:0DTE" });
    const vm = selectOptionsBarrierEvidence(receipt(rows), 100, NOW, "NEAREST");
    expect(vm.receipt.startsWith("OPTEVID:NEAREST")).toBe(true);
  });

  it("calls-only book: assumed dealer gamma is positive, so an up-move means the book must SELL to stay hedged", () => {
    const vm = selectOptionsBarrierEvidence(receipt([row({ type: "call", strike: 100, openInterest: 1000 })]), 100, NOW);
    if (!vm.drawn) throw new Error("not drawn");
    expect(vm.totals.gamma).toBeGreaterThan(0);
    const up = scenarioHedge(vm, { dS: 1, dVolPoints: 0, dDays: 0 })!;
    expect(up.fromGamma).toBeGreaterThan(0);
    expect(up.fromVanna).toBe(0);
    expect(up.hedgeSide).toBe("SELL");
    // Units: shares — 1000 contracts × 100 × gamma × $1.
    expect(up.fromGamma).toBeCloseTo(1000 * 100 * bsPartials(100, 100, 0.25, (Date.parse("2026-10-16T20:00:00Z") - NOW) / (365 * 86_400_000))!.gamma, 6);
  });

  it("each contribution is separate and the combined scenario is their sum; a missing input refuses the scenario", () => {
    const vm = selectOptionsBarrierEvidence(receipt(rows), 100, NOW);
    const r = scenarioHedge(vm, { dS: 2, dVolPoints: -1, dDays: 1 })!;
    expect(r.total).toBeCloseTo(r.fromGamma + r.fromVanna + r.fromCharm, 9);
    expect(scenarioHedge(vm, { dS: 2, dVolPoints: -1 })).toBeNull();
    expect(scenarioHedge(vm, { dS: Number.NaN, dVolPoints: 0, dDays: 0 })).toBeNull();
  });

  it("elapsed time past the nearest expiry in scope is refused, not extrapolated", () => {
    const vm = selectOptionsBarrierEvidence(receipt([row({ expiration: "2026-10-05", openInterest: 5000 }), ...rows]), 100, NOW);
    if (!vm.drawn) throw new Error("not drawn");
    expect(vm.minTauDays).toBeLessThan(1); // a contract expires today
    expect(scenarioHedge(vm, { dS: 1, dVolPoints: 0, dDays: 1 })).toBeNull();
    expect(scenarioHedge(vm, { dS: 1, dVolPoints: 0, dDays: 0 })).not.toBeNull();
  });

  it("no chain / no spot refuse with a named reason", () => {
    expect(selectOptionsBarrierEvidence(null, 100, NOW)).toMatchObject({ drawn: false, reason: "NO_CHAIN" });
    expect(selectOptionsBarrierEvidence(receipt(rows, { spot: null } as unknown as Partial<CboeOptionsReceipt>), null, NOW)).toMatchObject({ drawn: false, reason: "NO_SPOT" });
  });

  it("never claims support / resistance or a pin in its own words", () => {
    const vm = selectOptionsBarrierEvidence(receipt(rows), 100, NOW);
    if (!vm.drawn) throw new Error("not drawn");
    expect(vm.assumption).toMatch(/not support or resistance/);
    expect(vm.assumption).toMatch(/not a pin/);
  });
});
