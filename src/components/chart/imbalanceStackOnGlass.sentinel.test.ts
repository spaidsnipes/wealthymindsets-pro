/**
 * THE STACK MUST STAY ON THE GLASS.
 *
 * `selectStackedImbalance` shipped as a careful, complete, honest engine, and
 * then sat for months with exactly two consumers — `StackedImbalancePanel` and
 * `OrderFlowDepthPanel`. Both are DRAWERS. The VM carried `stackLow`,
 * `stackHigh` and a price for every level in the run, and not one of those
 * numbers ever reached the chart. That is the Founder's named failure mode
 * word for word: a card saying a level matters is not the level.
 *
 * The repair was a wire, and a wire is the easiest thing in this repo to lose.
 * Nobody deletes a feature; somebody refactors a prop, or moves the overlay, or
 * "cleans up an unused import", and the band quietly stops being painted while
 * the drawer keeps describing it — which is worse than never having drawn it,
 * because now the product says the level matters in a place the trader has
 * learned to stop checking.
 *
 * This file is a breadcrumb, not a renderer. It reads source. A canvas cannot
 * be asserted on here, and the moment it could the assertion would be about a
 * pixel rather than about the wire.
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

describe("the reading reaches the chart", () => {
  it("the room hands the SAME reading it gives the drawer to the glass", () => {
    // One reading, two renderings. If the chart ever computed its own, the
    // band and the panel would be two houses with two opinions about the same
    // three prices — the exact multi-source disagreement this repo already
    // records as Canon Weakness #1.
    expect(ROOM).toMatch(/imbalanceStack=\{chartOrderFlowReadings\.stackedImbalance\}/);
  });

  it("the chart accepts it as a prop and does NOT recompute the tape", () => {
    expect(CHART).toMatch(/imbalanceStack\?:/);
    // `selectStackedImbalance` (the engine) must not appear here — only the
    // glass compiler, which takes an already-computed VM.
    expect(CHART).toMatch(/selectStackedImbalanceGlass/);
    expect(CHART).not.toMatch(/\bselectStackedImbalance\s*\(/);
  });

  it("the overlay reads it through a ref, not through its dependency array", () => {
    // Naming a tape-rate value as a dependency of the overlay effect tears the
    // rAF loop down and rebuilds it several times a second — the documented
    // cause of the VP and footprint flashing off on crypto.
    expect(CHART).toMatch(/imbalanceStackRef/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/imbalanceStack\b/);
  });
});

describe("what is drawn is drawn AT THE PRICE", () => {
  const block = (() => {
    const at = CHART.indexOf("selectStackedImbalanceGlass(imbalanceStackRef.current)");
    expect(at, "the glass call was renamed or removed").toBeGreaterThan(-1);
    return CHART.slice(at, at + 5200);
  })();

  it("places the band with the price scale the candles use", () => {
    // Any other transform and the band can drift away from the price it is a
    // claim about, which is the one thing it must never do.
    expect(block).toMatch(/srs\.priceToCoordinate\(glass\.priceHigh\)/);
    expect(block).toMatch(/srs\.priceToCoordinate\(glass\.priceLow\)/);
  });

  it("draws EVERY level at its own price, not just the band's two edges", () => {
    // "Stacked" means a run of adjacent levels leaning the same way. A band
    // alone says "somewhere between these two prices" and the run — the actual
    // invention — is not perceivable.
    expect(block).toMatch(/for \(const lvl of glass\.levels\)/);
    expect(block).toMatch(/srs\.priceToCoordinate\(lvl\.price\)/);
  });

  it("marks the retest, so DEFENDED shows how close it came", () => {
    expect(block).toMatch(/glass\.retestPrice/);
  });
});

describe("§9 — no verdict is graded in colour on the glass either", () => {
  const block = (() => {
    const at = CHART.indexOf("selectStackedImbalanceGlass(imbalanceStackRef.current)");
    return CHART.slice(at, at + 5200);
  })();

  it("carries the verdict in the EDGE STYLE, and the three are distinguishable", () => {
    expect(block).toMatch(/SOLID:/);
    expect(block).toMatch(/DASHED:/);
    expect(block).toMatch(/DOTTED:/);
    expect(block).toMatch(/setLineDash\(DASH\[glass\.edgeStyle\]\)/);
  });

  it("spends no green and no red on a level holding or breaking", () => {
    // A level that held is not a reassurance and one that broke is not a
    // scolding. Both are facts about an auction the trader had no part in, so
    // the house has no standing to raise its voice about either.
    expect(block).not.toMatch(/-wm-green|-wm-red/);
    // Every literal colour in the block, extracted and checked for a green- or
    // red-dominant channel rather than merely "contains green" — the house
    // ivory #ede6d3 and the evidence gold #d4af37 both have green channels.
    const rgbas = [...block.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)];
    for (const m of rgbas) {
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      expect(g > r && g > b, `green-dominant colour on the stack band: ${m[0]}`).toBe(false);
      expect(r > g * 1.6 && r > b * 1.6, `red-dominant colour on the stack band: ${m[0]}`).toBe(false);
    }
  });
});

describe("the layer publishes a receipt in every state, including the silent ones", () => {
  const block = (() => {
    const at = CHART.indexOf("selectStackedImbalanceGlass(imbalanceStackRef.current)");
    return CHART.slice(at, at + 5200);
  })();

  it("stamps the reason even when nothing is painted", () => {
    // An ABSENT attribute means "this build has no stack layer". UNMEASURED
    // means "the layer ran and the tape could not be read". Collapsing the two
    // is how a silent regression passes for a quiet tape — the same lesson the
    // VP suspension stamp a few hundred lines down already records.
    expect(block).toMatch(/ds\.imbalanceStack = glass\.reason/);
  });

  it("withdraws the drawing receipt when the drawing goes away", () => {
    // A stale `imbalanceStackLevels` keeps asserting a band that is no longer
    // on the screen.
    expect(block).toMatch(/delete ds\.imbalanceStackLevels/);
    expect(block).toMatch(/delete ds\.imbalanceStackEdge/);
  });
});
