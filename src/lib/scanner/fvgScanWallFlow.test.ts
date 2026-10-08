/**
 * Garden 19 §39 — FVG + options wall and FVG + order flow on the scanner, only
 * where the evidence exists. Walls: the ONE options owner's reading of a Cboe
 * DELAYED chain, for options-bearing listed symbols. Order flow: signed tape
 * only — the scanner reads history bars, so it is UNAVAILABLE with its reason.
 * Both return to the same object (OBJECT_ID / href) as the five conditions.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import type { DerivativesPressureVM } from "@/lib/marketData/viewModels/selectDerivativesPressure";
import {
  FVG_SCAN_ORDER_FLOW_UNAVAILABLE,
  fvgScanConditionsFromBars,
  fvgScanWallChainRefusal,
  type FvgScanWallEvidence,
} from "./fvgScanConditions";
import { loadFvgScanWalls } from "./fvgScanWalls";

type Row = readonly [number, number, number, number];
const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 6, 10, 0, 0);
const SYM = "AAPL";
function series(rows: readonly Row[]): CanonicalBar[] {
  return rows.map(([o, h, l, c], i) => {
    const asOf = T0 + i * MIN;
    return {
      barId: `${SYM}|1m|${asOf}|e0`, symbolId: SYM, sessionId: "SESSION_CONTINUOUS", timeframe: "1m",
      open: o, high: h, low: l, close: c, volume: 1, asOf, receivedAt: asOf + MIN,
      fidelity: "INDICATIVE", source: "fixture", provenance: "REST_BACKFILL", truthEpoch: 0,
    };
  });
}
const FLAT: Row[] = Array.from({ length: 15 }, () => [100, 101, 99, 100] as Row);
// Bullish gap: b1 high 101, b3 low 102 → territory 101–102.
const BULL: Row[] = [[100, 101, 99, 100.5], [100.5, 104, 100.3, 103.8], [103.8, 105, 102, 104.5]];
const AWAY: Row = [104.5, 105, 103.5, 104.5];

const read = (rows: Row[], walls?: FvgScanWallEvidence) => {
  const bars = series(rows);
  const r = fvgScanConditionsFromBars({ symbol: SYM, timeframe: "1m", bars, nowMs: bars[bars.length - 1].asOf + MIN, walls });
  if (r.status !== "READ") throw new Error(r.reason);
  return r;
};

/** A drawn options reading as the owner shapes it: a put wall inside the gap, the flip far away. */
function drawnVm(strike: number): DerivativesPressureVM {
  return {
    drawn: true, version: 1, underlying: SYM, spot: 104.5, climate: "DAMPING", climateRatio: 0.4, netAtSpot: 1, gross: 2.5,
    geography: [], zeroGamma: 80, testSpanSec: 0, pockets: [], envelope: null, contracts: 120,
    walls: [{ strike, exposure: 1, share: 0.2, callOi: 100, putOi: 900, side: "BELOW", life: "BORN", tests: 0, closesBeyond: 0, firstTestTime: null, testTimes: [] }],
    clocks: { chainAsOf: "2026-10-06T09:59:00Z", underlyingAsOf: null, oiAsOf: "PRIOR_SESSION", modelAsOf: 0 },
    source: "CBOE_DELAYED", fidelity: "DELAYED", epistemic: { exposure: "INFERRED", envelope: "DERIVED", tests: "OBSERVED" },
    assumption: "dealers long calls / short puts", receipt: "PRESSURE:FIXTURE",
  } as DerivativesPressureVM;
}

describe("FVG + options wall — only from the one options owner, returning to the same object", () => {
  it("a wall inside the gap is listed on the SAME object as the condition, with the owner's evidence word", () => {
    const r = read([...FLAT, ...BULL], { vm: drawnVm(101.5) });
    expect(r.hits.map(h => h.condition)).toEqual(["NEW_FVG"]);
    const w = r.convergence.find(c => c.condition === "FVG_PLUS_WALL")!;
    expect(w.objectId).toBe(r.hits[0].objectId);
    expect(w.href).toBe(r.hits[0].href);
    expect(w.with).toEqual(["NEW_FVG"]);
    expect(w.relationships.join(" ")).toMatch(/Options walls put wall 101\.50 — inside · owner says BORN · DEGRADED \(DELAYED chain \(120 contracts\)/);
    expect(r.unavailable.map(u => u.condition)).toEqual(["FVG_PLUS_ORDER_FLOW"]);
  });

  it("a wall far from the gap is no convergence (and not UNAVAILABLE — it was read)", () => {
    const r = read([...FLAT, ...BULL], { vm: drawnVm(150) });
    expect(r.convergence.some(c => c.condition === "FVG_PLUS_WALL")).toBe(false);
    expect(r.unavailable.some(u => u.condition === "FVG_PLUS_WALL")).toBe(false);
  });

  it("no chain / the owner drew nothing / not read → UNAVAILABLE with the plain reason, never a hit", () => {
    expect(read([...FLAT, ...BULL]).unavailable[0]).toEqual({ condition: "FVG_PLUS_WALL", reason: "options walls were not read for this symbol" });
    const silent = read([...FLAT, ...BULL], { vm: { drawn: false, version: 1, underlying: SYM, reason: "TOO_FEW_CONTRACTS", contracts: 12, receipt: "x" } as DerivativesPressureVM });
    expect(silent.unavailable[0]).toEqual({ condition: "FVG_PLUS_WALL", reason: "Cboe delayed open interest: too few contracts with open interest to read walls" });
    expect(silent.convergence.some(c => c.condition === "FVG_PLUS_WALL")).toBe(false);
    const refused = read([...FLAT, ...BULL], { unavailable: "NQ1! has no listed options chain at Cboe (Cboe lists no futures options), so no option wall is read" });
    expect(refused.unavailable[0].reason).toMatch(/no listed options chain at Cboe/);
  });

  it("nothing is UNAVAILABLE for a symbol that met no condition (nothing was asked of it)", () => {
    expect(read([...FLAT, ...BULL, AWAY]).unavailable).toEqual([]);
  });

  it("which symbols may ask Cboe: listed names yes; futures, crypto, forex and unlisted shapes no — with the reason", () => {
    expect(fvgScanWallChainRefusal("AAPL", "STOCK", "AAPL")).toBeNull();
    expect(fvgScanWallChainRefusal("NQ1!", "FUTURES", null)).toBe("NQ1! has no listed options chain at Cboe (Cboe lists no futures options), so no option wall is read");
    expect(fvgScanWallChainRefusal("BTC-USD", "CRYPTO", null)).toMatch(/Cboe lists no crypto options/);
    expect(fvgScanWallChainRefusal("XYZ123", "STOCK", null)).toBe("XYZ123 is not a symbol Cboe lists options for, so no option wall is read");
  });
});

describe("FVG + order flow — signed tape only", () => {
  it("always UNAVAILABLE on the scanner, with the reason; never read from candles", () => {
    const r = read([...FLAT, ...BULL], { vm: drawnVm(101.5) });
    expect(r.unavailable).toContainEqual({ condition: "FVG_PLUS_ORDER_FLOW", reason: FVG_SCAN_ORDER_FLOW_UNAVAILABLE });
    expect(r.convergence.some(c => c.condition === "FVG_PLUS_ORDER_FLOW")).toBe(false);
    expect(FVG_SCAN_ORDER_FLOW_UNAVAILABLE).toMatch(/signed tape/);
    expect(FVG_SCAN_ORDER_FLOW_UNAVAILABLE).toMatch(/never read as order flow/);
  });
});

describe("the wall loader — the existing Cboe route, the one owner, read-only", () => {
  const bars = series([...FLAT, ...BULL]);
  const nowMs = bars[bars.length - 1].asOf + MIN;

  it("futures / crypto never ask the route", async () => {
    const f = vi.fn();
    expect(await loadFvgScanWalls({ symbol: "NQ1!", bars, nowMs, fetchImpl: f })).toEqual({ unavailable: expect.stringMatching(/no listed options chain at Cboe/) });
    expect(await loadFvgScanWalls({ symbol: "BTC-USD", bars, nowMs, fetchImpl: f })).toEqual({ unavailable: expect.stringMatching(/crypto/) });
    expect(f).not.toHaveBeenCalled();
  });

  it("a listed symbol asks the Cboe delayed route once (GET) and hands the chain to selectDerivativesPressure", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ source: "CBOE_DELAYED", underlying: "AAPL", spot: 104, iv30: 30, chainAsOf: null, underlyingAsOf: null, rows: [], dropped: 0 }), { status: 200 }));
    const out = await loadFvgScanWalls({ symbol: "AAPL", bars, nowMs, fetchImpl: f });
    expect(f).toHaveBeenCalledTimes(1);
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe("/api/market-data/cboe/options?symbol=AAPL");
    expect("vm" in out && out.vm.drawn === false && out.vm.reason).toBe("TOO_FEW_CONTRACTS");
  });

  it("a refusing route is UNAVAILABLE in its own words", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ edge: "UPSTREAM_TIMEOUT" }), { status: 504 }));
    expect(await loadFvgScanWalls({ symbol: "AAPL", bars, nowMs, fetchImpl: f })).toEqual({ unavailable: "the Cboe delayed options route answered upstream timeout for AAPL, so no option wall is read" });
  });
});

describe("the strip asks for a chain only after a condition, and prints every UNAVAILABLE with its reason", () => {
  const strip = readFileSync(path.join(process.cwd(), "src/components/scanner/FvgScanStrip.tsx"), "utf8");
  it("wired", () => {
    expect(strip.length).toBeGreaterThan(1000);
    expect(strip).toMatch(/reading\.status === "READ" && reading\.hits\.length && fetch\.ok\)[\s\S]{0,200}loadFvgScanWalls\(/);
    expect(strip).toContain('data-testid="scanner-fvg-unavailable-flow"');
    expect(strip).toContain('data-testid="scanner-fvg-unavailable-wall"');
    expect(strip).toContain("{FVG_SCAN_ORDER_FLOW_UNAVAILABLE}");
  });
});
