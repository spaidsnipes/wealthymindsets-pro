/**
 * VWAP RIDES THE PRICE SCALE, ANCHORED TO THE SESSION — serving, 2026-09-26
 * 04:38 CDT, /charts?symbol=TSLA&tf=15m&ind=VWAP,…
 *
 * VWAP was drawn in its OWN oscillator pane (a 362–365 scale beside candles
 * trading at ~440) because the indicator effect built it with
 * `addOsc(…, "vwap", …)`, and `addOsc` opens a new pane via `paneFor`. The
 * VWAP Bands, VWAP Deviation Bands and Anchored VWAP rode the same pane.
 * Every one of them is a PRICE LEVEL. And `IND.vwap(bars)` never reset, so a
 * week of 15m bars drew one cumulative line.
 *
 * This sentinel reads source (a breadcrumb, not a renderer). Do not weaken
 * it to let a VWAP-family line back into a pane of its own; if VWAP must
 * change scale, change the Founder-facing promise first.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SRC = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

function vwapBlock(): string {
  const a = SRC.indexOf("// ── VWAP family — ON PRICE, anchored to the session");
  const b = SRC.indexOf("// ── Moving Averages", a);
  expect(a).toBeGreaterThan(-1);
  expect(b).toBeGreaterThan(a);
  return SRC.slice(a, b);
}

describe("VWAP family on the price scale (2026-09-26)", () => {
  it("no VWAP-family line is built with addOsc anywhere in MainChart", () => {
    expect(SRC).not.toMatch(/addOsc\([^;\n]*"vwap"/);
    expect(SRC).not.toMatch(/addOsc\([^;\n]*(vwap|Vwap|VWAP)/);
  });

  it("the VWAP block never opens a pane", () => {
    const blk = vwapBlock();
    expect(blk).not.toMatch(/addOsc\(|addOscHist\(|paneFor\(|setupScale\(/);
  });

  it("each VWAP-family indicator is drawn inside the block, on price-scale helpers", () => {
    const blk = vwapBlock();
    for (const name of ["VWAP", "VWAP Bands", "VWAP Deviation Bands", "Anchored VWAP"]) {
      expect(blk).toContain(`inds.has("${name}")`);
    }
    expect(blk).toMatch(/addLine\(IND\.anchoredVwap\(/);
  });

  it("the session line helper carries the price format and no pane index", () => {
    const blk = vwapBlock();
    const at = blk.indexOf("const addSessionLine");
    expect(at).toBeGreaterThan(-1);
    const helper = blk.slice(at, blk.indexOf("};", at));
    expect(helper).toContain("priceFormat: overlayPriceFormat");
    expect(helper).toMatch(/chart\.addSeries\(LW\.LineSeries, \{[^}]*\}\);/); // two args: pane 0
  });
});

describe("VWAP is anchored to the ONE session owner (2026-09-26)", () => {
  it("computes through IND.sessionVwap on sessionWindowFor, never the cumulative IND.vwap", () => {
    const blk = vwapBlock();
    expect(blk).toMatch(/IND\.sessionVwap\(bars, sessionWindowFor\(symbol, timeframe, !!extendedHours\)\)/);
    expect(SRC).not.toMatch(/IND\.vwap\(/);
  });

  it("daily-and-longer is withheld with a named reason, not drawn as a cumulative line", () => {
    const blk = vwapBlock();
    expect(blk).toContain("ds.vwapWithheld = IND.VWAP_DAILY_WITHHELD_REASON");
    expect(blk).toContain("ds.vwapSession = sessVwap.label");
  });

  it("sessions are not joined by a line", () => {
    expect(vwapBlock()).toMatch(/sessVwap\.breakAfter\[i\]/);
  });
});
