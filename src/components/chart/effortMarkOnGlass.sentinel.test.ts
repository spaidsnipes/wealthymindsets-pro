/**
 * THE EFFORT READING REACHES THE CANDLES — H-701, family F06.
 *
 * This breadcrumb exists because of one house verdict, quoted so the next
 * reader knows what it is defending and not merely what it checks:
 *
 *     A paragraph describing absorption is not absorption.
 *     MENU BUILT + NO MARKET PAINT = OPEN.
 *
 * `ChartEffortVsResult` is a 236px card pinned to `top-16 left-3`. It is a good
 * card. It is also, on its own, the exact defect named above: a panel that
 * describes a candle while pointing at nothing. Deleting the card would be the
 * wrong repair — the cohort note and the limit note genuinely belong in prose —
 * so the repair is that the verdict ALSO lands on the bar, and this file is
 * what stops that landing from being quietly removed later.
 *
 * The guards pull in two directions, the same shape as the liquidity weather
 * breadcrumb:
 *
 *   1. The mark MUST reach the axis, at the subject bar's own time and its own
 *      extreme.
 *   2. NOTHING ELSE may. `effortRatio` and `resultRatio` would map onto a price
 *      scale without a murmur, and both of those are numbers the house made up
 *      the moment they became a level.
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
  const at = CHART.indexOf("const ev = effortMarkRef.current");
  expect(at, "the effort-mark block was renamed or removed").toBeGreaterThan(-1);
  // Bounded by the NEXT layer rather than by a character count. A fixed window
  // that overruns into the heat lens would fail this file's own "no open/close
  // here" guard on the neighbour's code — a guard distorting what it protects.
  // Bounded by the NEAREST-known landmark that follows this block, not by
  // `selectHeatLens` — three other layers moved in between over the course of
  // the shift, and each one has its own `fillText(…)` that would spuriously
  // trip this file's "no composed words here" guard on unrelated code.
  const marker = "const dl = deltaLevelsRef.current";
  const end = CHART.indexOf(marker, at);
  expect(end, `the delta-levels block no longer follows this one`).toBeGreaterThan(at);
  return CHART.slice(at, end);
})();

describe("the reading reaches the chart", () => {
  it("the room hands the glass a VERDICT, and the same one the panel reads", () => {
    // Two components over one candle disagreeing about that candle is the
    // failure the Inspect Ticket's own header warns about.
    expect(ROOM).toMatch(/effortMark=\{effortMarkVerdict\}/);
    expect(ROOM).toMatch(/selectEffortMark\(\s*effortVsResultVM,/);
  });

  it("the room reads the SAME bar the panel and the ticket read", () => {
    const at = ROOM.indexOf("const effortMarkVerdict");
    expect(at).toBeGreaterThan(-1);
    const call = ROOM.slice(at, at + 700);
    expect(call).toMatch(/inspectBar/);
    expect(call).not.toMatch(/cursorBar|chartBars\[/);
  });

  it("the chart accepts it as a prop and re-derives no grade of its own", () => {
    expect(CHART).toMatch(/effortMark\?: EffortMarkVerdict \| null/);
    // One reading, one renderer of the verdict. A second call here would be a
    // second answer to a question already answered.
    expect(CHART).not.toMatch(/\bselectEffortVsResult\s*\(/);
    expect(CHART).not.toMatch(/\bselectEffortMark\s*\(/);
  });

  it("the overlay reads it through a ref, not through its dependency array", () => {
    // This value changes at CURSOR rate, which is worse than tape rate: naming
    // it in the deps tears the rAF loop down on every mouse move across the
    // pane — the documented cause of layers flashing off.
    expect(CHART).toMatch(/effortMarkRef/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/\beffortMark\b/);
  });
});

describe("THE MARK LANDS ON THE BAR, at the bar's own coordinates", () => {
  it("anchors horizontally on the subject bar's open time", () => {
    expect(block).toMatch(/timeToCoordinate\(m\.time/);
  });

  it("anchors vertically on a price the compiler chose, on the candles' own scale", () => {
    expect(block).toMatch(/srs\.priceToCoordinate\(m\.price\)/);
  });

  it("paints nothing when the anchor falls outside the visible range", () => {
    // A verdict scrolled off screen still stands; it simply has nowhere here
    // to stand. Drawing it at a clamped edge would put the reading at a price
    // the bar never traded.
    expect(block).toMatch(/if \(xr != null && yr != null\)/);
    expect(block).toMatch(/ds\.effortMark = "OFFSCREEN"/);
  });

  it("sits OUTSIDE the extreme, so the description never covers its subject", () => {
    expect(block).toMatch(/m\.side === "ABOVE" \? -1 : 1/);
  });
});

describe("A RATIO HAS NO PRICE, and nothing here invents one for it", () => {
  it("passes no ratio, grade or count to a coordinate function", () => {
    expect(block).not.toMatch(
      /Coordinate\([^)]*(?:atio|rade|ohort|ffort|esult[^)]*[^e])/,
    );
  });

  it("never reads a field that would tempt it — the verdict carries none", () => {
    expect(block).not.toMatch(
      /\b(?:effortRatio|resultRatio|cohortSize|effort|result)\b\s*[.)\]]/,
    );
  });

  it("chooses the side from the verdict, never recomputing it from the bar", () => {
    // `sideFor` lives in the compiler. A second rule here is a second answer,
    // and the two would disagree on a doji.
    expect(block).not.toMatch(/\bopen\b|\bclose\b|\bhigh\b|\blow\b/);
  });
});

describe("§9 — two corners, one ink", () => {
  it("chooses no colour from the shape", () => {
    // SPENT·DIDN'T MOVE is where a reversal starts and also where a trend
    // rests. The house grades neither, so neither gets a hue.
    expect(block).not.toMatch(/m\.shape\s*===/);
    expect(block).not.toMatch(/-wm-green|-wm-red/);
  });

  it("spends no green and no red on the mark", () => {
    const rgbas = [...block.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)];
    expect(rgbas.length, "no literal colours found — did the block move?")
      .toBeGreaterThan(0);
    for (const m of rgbas) {
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      expect(g > r && g > b, `green-dominant colour on the mark: ${m[0]}`).toBe(false);
      expect(r > g * 1.6 && r > b * 1.6, `red-dominant colour on the mark: ${m[0]}`).toBe(false);
    }
  });

  it("draws a stem and a HOLLOW cap, not an arrow and not a filled dot", () => {
    // An arrow points somewhere and this reading refuses to say where. A
    // filled mark is this house's vocabulary for ANSWERED, and nothing about
    // this bar is answered.
    expect(block).toMatch(/ctx\.arc\(x, y \+ out \* 16, 2\.5, 0, Math\.PI \* 2\)/);
    const afterArc = block.slice(block.indexOf("ctx.arc("));
    expect(afterArc.slice(0, 120)).toMatch(/ctx\.stroke\(\)/);
    expect(afterArc.slice(0, 120)).not.toMatch(/ctx\.fill\(\)/);
  });

  it("prints the compiler's words and composes none of its own", () => {
    expect(block).toMatch(/fillText\(m\.label,/);
    expect(block).not.toMatch(/fillText\(\s*["'`]/);
  });
});

describe("the trader can quiet this layer, and the chart says WHICH silence it is", () => {
  it("a switched-off layer paints NOTHING, not merely a smaller mark", () => {
    expect(block).toMatch(/if \(on && ev\?\.drawn\) \{/);
  });

  it("reads the switch from a REF, never from the overlay's dependency array", () => {
    expect(block).toMatch(/const on = layerOnRef\.current\.effort/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/effortMarkOnChart/);
  });

  it("the switch travels as its OWN prop, not as a null verdict", () => {
    // Passing null to turn it off would make "the trader closed this"
    // indistinguishable from "no bar could be weighed" — H1, in a prop.
    expect(CHART).toMatch(/effortMarkOnChart\?: boolean/);
    expect(ROOM).toMatch(/effortMarkOnChart=\{effortMarkOn\}/);
  });

  it("OFF and NO_READING are different words in the receipt", () => {
    // 2026-09-26 (H-501 permission): OFF stays the trader's word; a layer
    // the depth withheld says SILENT:<depth> through the governor's offWord.
    expect(block).toMatch(/ds\.effortMark = on \? \(ev \? ev\.reason : "NO_READING"\) : att\.offWord\(layerOnRef\.current\.effort === true\)/);
  });
});

describe("the layer publishes a receipt in every state, including the silent ones", () => {
  it("stamps the reason even when nothing is painted", () => {
    expect(block).toMatch(/ds\.effortMark = on \?/);
  });

  it("withdraws the side receipt rather than letting a stale one describe a new bar", () => {
    expect(block.match(/delete ds\.effortMarkSide/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
