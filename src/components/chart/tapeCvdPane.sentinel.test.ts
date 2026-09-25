/**
 * THE ONE CVD IS THE TAPE'S (Garden Pass 12, H-701).
 *
 * The candle-colour CVD was retired (noCandleColourOrderFlow). Its lawful
 * replacement is the "Tape CVD" pane, and this file pins what makes it lawful:
 *
 *   - its numbers come from the tape accumulator through `selectTapeCvd`
 *     (per-bar Σ(ask − bid), cumulative from the horizon), never from a bar's
 *     open/close;
 *   - it is inked with the delta pair the trader owns, not candle green/red;
 *   - the first bar is hollow (PARTIAL) and the caption names the source,
 *     the start and SIDES INFERRED;
 *   - the glass publishes cvdSource (TAPE / REFUSED / OFF) and cvdBars.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const CHART = strip(read("src/components/chart/MainChart.tsx"));
const OWNER = strip(read("src/lib/marketData/tapeCvd.ts"));
const TOOLBAR = strip(read("src/components/chart/ChartToolbar.tsx"));

const between = (src: string, from: string, to: string) => {
  const a = src.indexOf(from);
  const b = src.indexOf(to, a + from.length);
  return a >= 0 && b > a ? src.slice(a, b) : "";
};

const FILL = between(CHART, "fillTapeCvdRef.current = () => {", "useEffect(() => { fillTapeCvdRef.current(); }");
const PANE = between(CHART, 'if (inds.has("Tape CVD")) {', 'if (inds.has("Stop Run Alert"))');
const CAPTION = between(CHART, "const cvdSeries = tapeCvdSeriesRef.current;", 'canvas.dataset.cvdSource = "OFF";');

describe("the one CVD is the tape's", () => {
  it("the scan found the fill, the pane and the caption", () => {
    expect(FILL.length, "fillTapeCvdRef body not found").toBeGreaterThan(200);
    expect(PANE.length, "Tape CVD pane block not found").toBeGreaterThan(100);
    expect(CAPTION.length, "Tape CVD caption block not found").toBeGreaterThan(100);
  });

  it("the picker offers it under its own name, which is not the retired one", () => {
    expect(TOOLBAR).toContain('name:"Tape CVD"');
    expect(CHART).not.toContain('inds.has("CVD")');
  });

  it("the numbers come from the tape accumulator through the owner", () => {
    expect(FILL).toContain("selectTapeCvd(");
    expect(FILL).toContain("accumulator: tickAccRef.current");
    expect(FILL).toContain("tapeHorizonBarStart(");
    expect(FILL).toContain("aggressorMethod");
    expect(FILL).toContain("hasRealAggressorTape(");
    // "since" can never outclaim what the in-memory accumulator holds.
    expect(FILL).toContain("accumulatorStartedAtSec: tickAccStartedAtRef.current,");
    expect(CHART).toContain("tickAccStartedAtRef.current = null;");
  });

  it("refills when the bars arrive, and dates its caption", () => {
    expect(CHART).toContain("useEffect(() => { fillTapeCvdRef.current(); }, [sessionTapeTick, timeframe, tapeSource, canonicalSym, ready, candles]);");
    expect(CAPTION).toContain("tapeCvdCaption(cvd, sec => fmtAxisTime(sec))");
  });

  it("no bar's open or close signs anything", () => {
    // The hollow bar's ink reads the CUMULATIVE step (p.from → p.to) — the
    // chart bar (b/bar/bs) is never read for anything but its time.
    expect(FILL).toContain("p.to >= p.from");
    expect(FILL).not.toMatch(/\b(?:b|bar|bs|lastBar)\.(?:close|open|volume)\b/);
    expect(OWNER).not.toMatch(/\.close\b|\.open\b|volume/);
  });

  it("inked with the delta pair, never candle green/red", () => {
    expect(FILL).toContain("ofColorsRef.current.delta");
    expect(FILL + PANE).not.toMatch(/#00C076|#FF4D6[7A]|#00D4AA|#FF4D6A/i);
  });

  it("the first bar is hollow and the zero hairline is drawn", () => {
    expect(FILL).toMatch(/if \(p\.partial\)[\s\S]{0,120}d\.color = "rgba\(0,0,0,0\)"/);
    expect(PANE).toContain("createPriceLine({ price: 0");
  });

  it("the caption comes from the owner and the glass names its source", () => {
    expect(CAPTION).toContain("tapeCvdCaption(cvd");
    expect(CAPTION).toContain('canvas.dataset.cvdSource = cvd.refused ? "REFUSED" : "TAPE"');
    expect(CAPTION).toContain("canvas.dataset.cvdBars");
    expect(OWNER).toContain("SIDES INFERRED");
  });
});
