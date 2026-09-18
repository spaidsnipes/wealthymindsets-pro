/**
 * THE DIVERGENCE MUST STAY ON THE GLASS — AND THE DELTA MUST STAY OFF THE AXIS.
 *
 * Two regressions are being guarded here, and they pull in opposite directions.
 *
 * The first is the ordinary one this repo keeps learning: the wire disappears.
 * `selectDeltaDivergence` shipped complete and sat with two drawer panels while
 * its two pivot PRICES never reached the chart. Somebody refactors a prop and
 * the marks quietly stop being painted while the panel keeps naming a
 * divergence — worse than never drawing it, because the product now says two
 * levels matter in a place the trader has learned to stop checking.
 *
 * The second is the tempting one. The VM carries a per-segment cumulative delta
 * and it would make a gorgeous line. Delta is counted in contracts and this
 * axis is denominated in dollars; any mapping is invented, and two lines in one
 * frame get read as crossing. So this file asserts an ABSENCE as hard as it
 * asserts a presence.
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

/** Prose paints nothing and these files explain themselves at length. */
const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const CHART = strip(read("src/components/chart/MainChart.tsx"));
const ROOM = strip(read("src/components/chart/ChartsDashboard.tsx"));

const block = (() => {
  const at = CHART.indexOf("selectDeltaDivergenceGlass(deltaDivergenceRef.current)");
  expect(at, "the glass call was renamed or removed").toBeGreaterThan(-1);
  return CHART.slice(at, at + 5200);
})();

describe("the reading reaches the chart", () => {
  it("the room hands the SAME reading it gives the drawer to the glass", () => {
    expect(ROOM).toMatch(/deltaDivergence=\{chartOrderFlowReadings\.deltaDivergence\}/);
  });

  it("the chart accepts it as a prop and does NOT recompute the tape", () => {
    expect(CHART).toMatch(/deltaDivergence\?:/);
    expect(CHART).toMatch(/selectDeltaDivergenceGlass/);
    // The engine itself must never run here. It is order-dependent by design
    // and a second caller with its own tick ordering is a second answer.
    expect(CHART).not.toMatch(/\bselectDeltaDivergence\s*\(/);
  });

  it("the overlay reads it through a ref, not through its dependency array", () => {
    expect(CHART).toMatch(/deltaDivergenceRef/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/\bdeltaDivergence\b/);
  });
});

describe("both compared prices are placed at their prices", () => {
  it("puts each pivot on the price scale the candles use", () => {
    expect(block).toMatch(/srs\.priceToCoordinate\(glass\.priorPrice\)/);
    expect(block).toMatch(/srs\.priceToCoordinate\(glass\.recentPrice\)/);
  });

  it("draws BOTH, because a divergence is a comparison and one pivot is not one", () => {
    expect(block).toMatch(/glass\.priorPrice != null && glass\.recentPrice != null/);
  });
});

describe("CUMULATIVE DELTA NEVER TOUCHES THE PRICE AXIS", () => {
  it("no cvd value is ever passed to a coordinate function here", () => {
    expect(block).not.toMatch(/priceToCoordinate\([^)]*cvd/i);
  });

  it("the segment path is not read at all — there is nothing honest to do with it", () => {
    expect(block).not.toMatch(/glass\.segments|\.cvd\b/);
  });
});

describe("the marks do not claim a moment", () => {
  it("refuses to place anything while the compiler says time is unknown", () => {
    // The pivots are indexed by segment, not by timestamp. A mark at the wrong
    // bar is a specific false claim, which is worse than no mark.
    expect(block).toMatch(/!glass\.timeKnown/);
  });

  it("places the marks in a fixed-width lane, never with the time scale", () => {
    expect(block).toMatch(/const laneL = /);
    expect(block).toMatch(/const laneR = /);
    expect(block).not.toMatch(/timeToCoordinate/);
  });
});

describe("§9 — no verdict is graded in colour on the glass", () => {
  it("carries the finding in the LINE DASH, not in a hue", () => {
    expect(block).toMatch(/setLineDash\(glass\.diverged \?/);
  });

  it("spends no green and no red on a divergence", () => {
    // BEARISH and BULLISH are the same measurement pointing two ways. Neither
    // is a scolding and neither is a cheer.
    expect(block).not.toMatch(/-wm-green|-wm-red/);
    const rgbas = [...block.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)];
    expect(rgbas.length, "no literal colours found — did the block move?").toBeGreaterThan(0);
    for (const m of rgbas) {
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      expect(g > r && g > b, `green-dominant colour on the divergence: ${m[0]}`).toBe(false);
      expect(r > g * 1.6 && r > b * 1.6, `red-dominant colour on the divergence: ${m[0]}`).toBe(false);
    }
  });
});

describe("the words the glass owes the trader", () => {
  it("prints the compiler's label rather than assembling its own sentence", () => {
    expect(block).toMatch(/glass\.label/);
  });

  it("speaks the finding only when the engine found one", () => {
    // `findingLabel` is null on CONFIRMED by construction; anything else here
    // would print "the move was paid for" on a chart that cannot withdraw it.
    expect(block).toMatch(/glass\.findingLabel/);
  });

  it("carries the aggressor-side disclosure onto the glass", () => {
    // Cumulative delta IS a claim about who initiated, and on US equities the
    // sides are usually inferred by a tick rule. A chart has no fine print.
    expect(block).toMatch(/glass\.disclosure/);
  });
});

describe("the layer publishes a receipt in every state, including the silent ones", () => {
  it("stamps the reason even when nothing is painted", () => {
    expect(block).toMatch(/ds\.deltaDivergence = glass\.reason/);
  });

  it("withdraws the drawing receipt when the drawing goes away", () => {
    expect(block).toMatch(/delete ds\.deltaDivergenceLean/);
  });
});
