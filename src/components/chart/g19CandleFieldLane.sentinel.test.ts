/**
 * GARDEN 19 CANDLE FIELD — chart build lane breadcrumb. Reads source.
 * Pins the laws each new field layer was built under, so a later tidy cannot
 * quietly undo them.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const CHART = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");
const between = (a: string, b: string) => {
  const i = CHART.indexOf(a);
  expect(i, a).toBeGreaterThan(-1);
  const j = CHART.indexOf(b, i);
  expect(j, b).toBeGreaterThan(i);
  return CHART.slice(i, j);
};

describe("Garden 19 candle field", () => {
  it("RVOL tone lives on the VOLUME bar, never on the candle body (F05A)", () => {
    const b = between("══ RELATIVE VOLUME TONE (census C-03", 'layerFault("RVOL_TONE"');
    expect(b).toMatch(/vsRV\.priceToCoordinate/);
    expect(b).not.toMatch(/candleRef|srs\.priceToCoordinate|csDK/);
    expect(b).toMatch(/SILENT:NO_TRADED_VOLUME/);
  });

  it("the effort → response field never draws the forming bar and is silent without volume", () => {
    const b = between("EFFORT → RESPONSE ACROSS THE CANDLES (Garden 19 §7)", 'layerFault("EFFORT_RESPONSE"');
    expect(b).toMatch(/formingTime/);
    expect(b).toMatch(/SILENT:\$\{field\.reason\}/);
    expect(b).toMatch(/effortResponseSpans/);
  });

  it("the delta keel reads only signed evidence owners and is silent on spot markets", () => {
    const b = between("ORDER FLOW ACROSS CANDLES · BAR DELTA KEEL", 'layerFault("DELTA_KEEL"');
    expect(b).toMatch(/barTapeDelta\(getBarSubProfile\(cDK\)\)/);
    expect(b).toMatch(/candleSidedRef\.current/);
    expect(b).toMatch(/SILENT:NO_SIGNED_EVIDENCE:SPOT_MARKET/);
  });

  it("the wisdom line speaks only from evidence an ON layer drew, and one line at most", () => {
    const b = between("§17 CROSS-CANDLE WISDOM", 'layerFault("CROSS_CANDLE_WISDOM"');
    expect(b).toMatch(/SILENT:NO_EVIDENCE_OBJECT/);
    expect((b.match(/fillText\(wl\.text/g) ?? []).length).toBe(1);
  });

  it("C-15: MARKET SURPRISE is a flag on a pole standing off the event bar's extreme", () => {
    const b = between("const sp = fan.surprise;", "ds.expectedEnvelopeSurprise = fan.nowK");
    expect(b).toMatch(/FLAG_ON_POLE/);
    expect(b).toMatch(/sp\.side === "ABOVE" \? evBar\.high : evBar\.low/);
    expect(b).not.toMatch(/Math\.atan2/); // the old free arrow is gone
  });

  it("§16: held words go to the composer instead of vanishing", () => {
    expect((CHART.match(/displacedNotes\.push\(/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
});
