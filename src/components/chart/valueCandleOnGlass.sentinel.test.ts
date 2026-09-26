/**
 * THE VALUE CANDLE MUST STAY ON THE GLASS.
 *
 * The invention is called the WM Value CANDLE and for months there was no
 * candle: `selectValueCandle` computed a centre of gravity, a value band and a
 * full bins distribution — every one of them A PRICE — and shipped all of it to
 * a drawer. The repair was a wire, and a wire is the easiest thing in this repo
 * to lose. Nobody deletes a feature; somebody refactors a prop, moves the
 * overlay, or "cleans up an unused import", and the rungs quietly stop being
 * painted while the panel keeps quoting a CoG.
 *
 * This file is a breadcrumb, not a renderer. It reads source, because a canvas
 * cannot be asserted on here and the moment it could the assertion would be
 * about a pixel rather than about the wire.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

/** Colours named in a comment paint nothing, and these files explain
 *  themselves at length. Strip prose before asserting on code. */
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const CHART = strip(read("src/components/chart/MainChart.tsx"));
const ROOM = strip(read("src/components/chart/ChartsDashboard.tsx"));

const block = (() => {
  const at = CHART.indexOf("selectValueCandleGlass(valueCandleRef.current)");
  expect(at, "the glass call was renamed or removed").toBeGreaterThan(-1);
  return CHART.slice(at, at + 6000);
})();

describe("the reading reaches the chart", () => {
  it("the room hands the SAME reading it gives the drawer to the glass", () => {
    expect(ROOM).toMatch(/valueCandle=\{chartOrderFlowReadings\.valueCandle\}/);
  });

  it("the chart accepts it as a prop and does NOT recompute the tape", () => {
    expect(CHART).toMatch(/valueCandle\?:/);
    expect(CHART).toMatch(/selectValueCandleGlass/);
    // The engine itself must never appear here — only the glass compiler,
    // which takes an already-computed VM.
    expect(CHART).not.toMatch(/\bselectValueCandle\s*\(/);
  });

  it("the overlay reads it through a ref, not through its dependency array", () => {
    // Naming a tape-rate value as a dependency of the overlay effect tears the
    // rAF loop down and rebuilds it several times a second — the documented
    // cause of the VP and footprint flashing off on crypto.
    expect(CHART).toMatch(/valueCandleRef/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/\bvalueCandle\b/);
  });
});

describe("every number is placed at the price it is a claim about", () => {
  it("puts the spine on the price scale the candles use", () => {
    expect(block).toMatch(/srs\.priceToCoordinate\(glass\.cog\)/);
  });

  it("draws EVERY bin at its OWN two price edges, not one averaged block", () => {
    // A single shaded rectangle would say "value is somewhere around here".
    // The distribution IS the reading; a shelf must be drawn at the price that
    // traded and nowhere else.
    expect(block).toMatch(/for \(const r of glass\.rungs\)/);
    expect(block).toMatch(/srs\.priceToCoordinate\(r\.hiPrice\)/);
    expect(block).toMatch(/srs\.priceToCoordinate\(r\.loPrice\)/);
  });

  it("marks the value band edges from the measured band, not from the bins", () => {
    expect(block).toMatch(/srs\.priceToCoordinate\(glass\.valueHigh\)/);
    expect(block).toMatch(/srs\.priceToCoordinate\(glass\.valueLow\)/);
  });

  it("scales each rung by the compiler's relative width, implying no volume axis", () => {
    expect(block).toMatch(/r\.widthFrac/);
  });
});

describe("the histogram shares the right edge instead of fighting for it", () => {
  it("takes its column from the SAME layout the volume profiles use", () => {
    // Two right-anchored histograms in one lane is the BTC "VP looks wrong"
    // bug. `vpColumnLayout` is the mechanism this file already trusts to keep
    // columns apart; a second, private placement rule would drift from it.
    expect(block).toMatch(/vpColumnLayout\(W, axisW, vpCols, vpCols \+ 1\)/);
    expect(block).toMatch(/fixedVPActive \? 1 : 0/);
    expect(block).toMatch(/sessionVPActive \? 1 : 0/);
  });

  it("declines out loud when there is no room, rather than painting off-canvas", () => {
    expect(block).toMatch(/col\.fits/);
    expect(block).toMatch(/"NO_ROOM"/);
  });

  it("reserves the LIVE price-axis width, never a guessed one", () => {
    // 59,800.00 is wider than 12.40, and a fixed reserve let bars bleed over
    // the numbers.
    expect(block).toMatch(/chart\.priceScale\("right"\)\.width\(\)/);
  });
});

describe("§9 — no reading is graded in colour on the glass", () => {
  it("separates inside-band from outside-band by ALPHA, not by a second hue", () => {
    // Where value sits is a measurement, not a verdict. Emphasis is honest;
    // a grade is not.
    expect(block).toMatch(/r\.inValue \?/);
  });

  it("spends no green and no red on the distribution", () => {
    expect(block).not.toMatch(/-wm-green|-wm-red/);
    // Every literal colour in the block, checked for a green- or red-dominant
    // channel rather than merely "contains green" — the house ivory #ede6d3 and
    // the evidence gold #d4af37 both have green channels.
    const rgbas = [...block.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)];
    expect(rgbas.length, "no literal colours found — did the block move?").toBeGreaterThan(0);
    for (const m of rgbas) {
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      expect(g > r && g > b, `green-dominant colour on the value candle: ${m[0]}`).toBe(false);
      expect(r > g * 1.6 && r > b * 1.6, `red-dominant colour on the value candle: ${m[0]}`).toBe(false);
    }
  });
});

describe("the headline number stays the honest one", () => {
  it("prints the compiler's label rather than assembling its own sentence", () => {
    // `concentration` reads 100% for a perfectly HOLLOW two-sided auction. The
    // compiler leads with band coverage for exactly that reason, and it can
    // only keep doing so if the canvas has no second opinion.
    expect(block).toMatch(/glass\.label/);
    expect(block).not.toMatch(/concentration/i);
  });

  it("speaks the migration only when the engine found one", () => {
    // `migrationLabel` is null on ALIGNED by construction; printing anything
    // else here would put a reassurance on every quiet bar.
    expect(block).toMatch(/glass\.migrationLabel/);
  });
});

describe("the layer publishes a receipt in every state, including the silent ones", () => {
  it("stamps the reason even when nothing is painted", () => {
    // 2026-09-26 (H-501 permission): OFF stays the trader's word; a layer
    // the depth withheld says SILENT:<depth> through the governor's offWord.
    expect(block).toMatch(/ds\.valueCandle = on \? glass\.reason : att\.offWord\(layerOnRef\.current\.valueCandle\)/);
  });

  it("withdraws the drawing receipts when the drawing goes away", () => {
    expect(block).toMatch(/delete ds\.valueCandleRungs/);
    expect(block).toMatch(/delete ds\.valueCandleCog/);
  });
});

describe("the trader can quiet this layer, and the chart says WHICH silence it is", () => {
  it("a switched-off layer paints NOTHING, not merely fewer bins", () => {
    // Named down to this block's OWN condition on purpose. The slice window is
    // wide enough to reach the next layer's code, and a bare `if (on &&
    // glass.drawn` was satisfied by the NEIGHBOUR while this block's gate was
    // deleted — proven by mutation. A sentinel that can be satisfied by a file
    // it is not guarding is decoration.
    expect(block).toMatch(/if \(on && glass\.drawn && glass\.cog != null\)/);
  });

  it("reads the switch from a REF, never from the overlay's dependency array", () => {
    expect(block).toMatch(/const on = layerOnRef\.current\.value/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/valueCandleOnChart/);
  });

  it("the switch travels as its OWN prop, not as a null reading", () => {
    expect(CHART).toMatch(/valueCandleOnChart\?: boolean/);
    expect(ROOM).toMatch(/valueCandleOnChart=\{valueCandleOn\}/);
  });
});
