import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { parseProofScene } from "@/lib/chart/proofScene";
import {
  FVG_SCAN_CONDITIONS,
  FVG_SCAN_MIN_BARS,
  fvgScanConditions,
  fvgScanConditionsFromBars,
  fvgScanCoverage,
  fvgScanFreshnessMs,
  type FvgScanCondition,
} from "./fvgScanConditions";

type Row = readonly [number, number, number, number];
const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 6, 10, 0, 0);
const SYM = "BTC-USD";
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
const BULL: Row[] = [[100, 101, 99, 100.5], [100.5, 104, 100.3, 103.8], [103.8, 105, 102, 104.5]];
const AWAY: Row = [104.5, 105, 103.5, 104.5];
/** Wick within approach distance of the near edge (102) without touching. */
const NEAR: Row = [104, 104.2, 102.3, 103.5];
const TOUCH_EDGE: Row = [104, 104.2, 102, 103.5];
const PARTIAL: Row = [104, 104.2, 101.6, 102.6];
const DEEP: Row = [104, 104.2, 101.3, 102.6];

const readAt = (rows: Row[]) => {
  const bars = series(rows);
  return fvgScanConditionsFromBars({ symbol: SYM, timeframe: "1m", bars, nowMs: bars[bars.length - 1].asOf + MIN });
};
const conds = (rows: Row[]): FvgScanCondition[] => {
  const r = readAt(rows);
  if (r.status !== "READ") throw new Error(r.reason);
  return r.hits.map(h => h.condition);
};

describe("Scanner FVG conditions — the one engine, at the newest closed bar", () => {
  it("only the five conditions exist (no convergence faked)", () => {
    expect(FVG_SCAN_CONDITIONS).toEqual(["NEW_FVG", "PRICE_APPROACHING_FVG", "FIRST_TOUCH", "PARTIAL_MITIGATION", "DEEP_MITIGATION"]);
  });

  it("NEW FVG on the bar that created it, and not one bar later", () => {
    expect(conds([...FLAT, ...BULL])).toEqual(["NEW_FVG"]);
    expect(conds([...FLAT, ...BULL, AWAY])).toEqual([]);
  });

  it("PRICE APPROACHING while untouched and within the approach distance", () => {
    expect(conds([...FLAT, ...BULL, AWAY, NEAR])).toEqual(["PRICE_APPROACHING_FVG"]);
  });

  it("FIRST TOUCH on the bar of the first touch only", () => {
    expect(conds([...FLAT, ...BULL, AWAY, TOUCH_EDGE])).toEqual(["FIRST_TOUCH"]);
    expect(conds([...FLAT, ...BULL, AWAY, TOUCH_EDGE, AWAY])).toEqual([]);
  });

  it("PARTIAL and DEEP mitigation on the bar the deepest reach ENTERS the tier", () => {
    expect(conds([...FLAT, ...BULL, AWAY, PARTIAL])).toEqual(["FIRST_TOUCH", "PARTIAL_MITIGATION"]);
    expect(conds([...FLAT, ...BULL, AWAY, DEEP])).toEqual(["FIRST_TOUCH", "DEEP_MITIGATION"]);
    expect(conds([...FLAT, ...BULL, AWAY, PARTIAL, AWAY, DEEP])).toEqual(["DEEP_MITIGATION"]);
    expect(conds([...FLAT, ...BULL, AWAY, PARTIAL, AWAY, PARTIAL])).toEqual([]);
  });

  it("each hit names its OBJECT_ID and opens the chart with that object selected", () => {
    const r = readAt([...FLAT, ...BULL]);
    if (r.status !== "READ") throw new Error("refused");
    const h = r.hits[0];
    expect(h.objectId).toMatch(/^FVG\|BTC-USD\|1m\|\d+\|BULLISH\|v1$/);
    expect(parseProofScene(h.href.slice("/charts".length)).selectObject).toEqual({ kind: "fvg", objectId: h.objectId });
    expect(h.href).toContain("on=fvg");
    expect(r.definition).toEqual({ id: "FVG_3C", version: 1 });
  });

  it("refuses with a plain reason: too few bars, stale bars, unavailable bars", () => {
    const few = fvgScanConditionsFromBars({ symbol: SYM, timeframe: "1m", bars: series(FLAT.slice(0, 10)), nowMs: T0 + 11 * MIN });
    expect(few).toMatchObject({ status: "REFUSED", reason: expect.stringMatching(new RegExp(`at least ${FVG_SCAN_MIN_BARS}`)) });
    const bars = series([...FLAT, ...BULL]);
    const stale = fvgScanConditionsFromBars({ symbol: SYM, timeframe: "1m", bars, nowMs: bars[bars.length - 1].asOf + MIN + fvgScanFreshnessMs("1m")! + 1 });
    expect(stale).toMatchObject({ status: "REFUSED", reason: expect.stringMatching(/too old to be a current reading/) });
    expect(fvgScanConditions({ symbol: SYM, timeframe: "1D", fetch: { ok: false, reason: "No 1D bars are available for BTC-USD." }, nowMs: 0 }))
      .toEqual({ status: "REFUSED", symbol: SYM, timeframe: "1D", reason: "No 1D bars are available for BTC-USD." });
  });

  it("daily freshness allows a weekend plus a holiday; intraday allows three bars", () => {
    expect(fvgScanFreshnessMs("1D")).toBe(4 * 86_400_000);
    expect(fvgScanFreshnessMs("5m")).toBe(15 * MIN);
    expect(fvgScanFreshnessMs("100T")).toBeNull();
  });

  it("coverage carries its denominator", () => {
    expect(fvgScanCoverage([
      { status: "REFUSED", symbol: "A", timeframe: "1D", reason: "x" },
      readAt([...FLAT, ...BULL]),
    ])).toEqual({ read: 1, refused: 1, of: 2 });
  });

  it("source: reads through fvgStateAsOf; no score, no fill claim", () => {
    const src = readFileSync(path.resolve(__dirname, "fvgScanConditions.ts"), "utf8");
    expect(src.length).toBeGreaterThan(1000);
    expect(src).toContain("fvgStateAsOf(ledger");
    expect(src).not.toMatch(/must fill|will fill|probabilit(y|ies) of|score\s*[:=]|strength\s*[:=]/i);
  });
});
