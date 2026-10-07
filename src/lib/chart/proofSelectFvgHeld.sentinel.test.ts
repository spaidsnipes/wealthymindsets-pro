/**
 * select=fvg:<OBJECT_ID> resolves to HELD given a scene/ledger that holds the
 * id (Garden 19 §22). The Founder's chart cannot be made visible to an
 * automation window, so the door is proven end to end on pure owners:
 * engine ledger → scanner hit href → proofScene parse → verdict HELD; and the
 * room's effect is pinned to the same three states.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { detectFvgs } from "@/lib/marketData/fvg/fvgEngine";
import { fvgChartHref } from "@/lib/marketData/fvg/fvgChartLink";
import { fvgScanConditionsFromBars } from "@/lib/scanner/fvgScanConditions";
import { parseProofScene, proofSelectObjectVerdict } from "./proofScene";

type Row = readonly [number, number, number, number];
const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 6, 10, 0, 0);
const SYM = "NQ1!";
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
const bars = series([...FLAT, ...BULL]);

describe("select=fvg:<id> → HELD", () => {
  it("scanner hit → href → proofScene → HELD against a ledger holding the id", () => {
    const r = fvgScanConditionsFromBars({ symbol: SYM, timeframe: "1m", bars, nowMs: bars[bars.length - 1].asOf + MIN });
    if (r.status !== "READ") throw new Error(r.reason);
    const scene = parseProofScene(r.hits[0].href.slice("/charts".length));
    expect(scene.selectObject).not.toBeNull();
    const ledgerIds = detectFvgs(bars, { symbolId: SYM, timeframe: "1m" }).objects.map(o => o.objectId);
    expect(ledgerIds.length).toBeGreaterThan(0);
    expect(proofSelectObjectVerdict(scene.selectObject!, ledgerIds)).toBe("HELD");
  });

  it("NONE_AVAILABLE when the scene lacks the id; PENDING before any scene", () => {
    const sel = parseProofScene(fvgChartHref({ symbol: SYM, timeframe: "1m", objectId: "FVG|NQ1!|1m|1|BEARISH|v1" }).slice("/charts".length)).selectObject!;
    expect(proofSelectObjectVerdict(sel, ["FVG|NQ1!|1m|2|BULLISH|v1"])).toBe("NONE_AVAILABLE");
    expect(proofSelectObjectVerdict(sel, [])).toBe("NONE_AVAILABLE");
    expect(proofSelectObjectVerdict(sel, null)).toBe("PENDING");
  });

  it("the room applies the same three states and selects through the one selection owner", () => {
    const src = readFileSync(path.resolve(__dirname, "../../components/chart/ChartsDashboard.tsx"), "utf8");
    expect(src.length).toBeGreaterThan(10_000);
    const at = src.indexOf("currentProofScene().selectObject");
    expect(at).toBeGreaterThan(0);
    const effect = src.slice(at, at + 2500);
    const usesHelper = /proofSelectObjectVerdict\(/.test(effect);
    const inline = /ledger\.objects\.some\(o => o\.objectId === proofSelectObject\.objectId\)/.test(effect)
      && /\|HELD`/.test(effect) && /\|NONE_AVAILABLE`/.test(effect) && /\|PENDING`/.test(effect);
    expect(usesHelper || inline).toBe(true);
    expect(effect).toMatch(/actOnChartSelection\(\{ type: "select", selection: \{ kind: "OBJECT", objectId: proofSelectObject\.objectId \} \}\)/);
  });
});
