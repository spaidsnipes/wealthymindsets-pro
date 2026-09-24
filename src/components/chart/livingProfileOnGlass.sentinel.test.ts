/**
 * LIVING PROFILE REACHES THE CANDLES — H-703, family F04 Profiles.
 *
 * `selectLivingProfile` publishes real, measured prices — HVN and LVN — with
 * the bucket LOW edge as the price. Its only consumer had been `LivingProfileView`,
 * a card. The classic PRICES-TRAPPED-IN-A-DRAWER defect, third occurrence.
 *
 * Two guards pulling opposite ways, the same shape as the four order-flow
 * sentinels above:
 *
 *   1. The marks MUST reach the axis at the compiler's own bucket prices.
 *   2. NOTHING ELSE may. `weight`, `distanceFromPoc` and the raw `volume`
 *      would map onto a price scale without complaint, and every such mapping
 *      is a level the house invented.
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
const ROOM = strip(read("src/components/chart/ChartsDashboard.tsx"));

const block = (() => {
  const at = CHART.indexOf("const lp = livingProfileRef.current");
  expect(at, "the living-profile block was renamed or removed").toBeGreaterThan(-1);
  // Bounded by the next known landmark — no fixed reach.
  const candidates = ["selectHeatLens", "P-601 HEAT LENS", "/* ══"];
  let end = -1;
  for (const c of candidates) {
    const i = CHART.indexOf(c, at + 100);
    if (i > 0 && (end < 0 || i < end)) end = i;
  }
  expect(end, "no landmark follows this block").toBeGreaterThan(at);
  return CHART.slice(at, end);
})();

describe("the reading reaches the chart", () => {
  it("the room hands the CHART the same glass verdict", () => {
    expect(ROOM).toMatch(/livingProfileGlass=\{livingProfileGlass\}/);
    expect(ROOM).toMatch(/selectLivingProfileGlass\(livingProfileVM\)/);
  });

  it("the chart accepts it as a prop and re-derives nothing", () => {
    expect(CHART).toMatch(/livingProfileGlass\?: LivingProfileGlass \| null/);
    expect(CHART).not.toMatch(/\bselectLivingProfile\s*\(/);
    expect(CHART).not.toMatch(/\bselectLivingProfileGlass\s*\(/);
  });

  it("the overlay reads it through a ref, not through its dependency array", () => {
    expect(CHART).toMatch(/livingProfileRef/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/\blivingProfile(?:Glass)?\b/);
  });
});

describe("H-703 — the histogram paints on the canvas, not the dots alone", () => {
  it("DRAWS ONE HORIZONTAL BAR PER BUCKET the compiler emitted", () => {
    // The line the Founder pointed at. Without this, the layer paints six
    // annotation dots and calls it a profile.
    expect(block).toMatch(/for \(const b of lp\.bars\)/);
    expect(block).toMatch(/ctx\.fillRect\(rightEdge - width, y,/);
  });

  it("width comes from `share` — a NORMALISED number, never volume", () => {
    expect(block).toMatch(/b\.share \* histMax/);
    expect(block).not.toMatch(/b\.volume/);
  });

  it("paints the value-area BAND before the bars, so the bars sit on top of it", () => {
    // Two prices become one band — the compiler's boundaries read as a band
    // rather than two disconnected hairlines. Order matters: fill first.
    const bandIdx = block.indexOf("lp.vah != null && lp.val != null");
    const barsIdx = block.indexOf("for (const b of lp.bars)");
    expect(bandIdx).toBeGreaterThan(-1);
    expect(barsIdx).toBeGreaterThan(bandIdx);
  });

  it("POC bucket gets its own ink — the trader can find it without hunting", () => {
    expect(block).toMatch(/b\.isPoc/);
  });

  it("prints POC · VAH · VAL prices beside the histogram (tagged LIVING when stacked)", () => {
    expect(block).toMatch(/`(?:\$\{tag\})?POC \$\{lp\.poc\.toFixed\(2\)\}`/);
    expect(block).toMatch(/`(?:\$\{tag\})?VAH \$\{lp\.vah\.toFixed\(2\)\}`/);
    expect(block).toMatch(/`(?:\$\{tag\})?VAL \$\{lp\.val\.toFixed\(2\)\}`/);
  });

  it("joins the shared profile lane system instead of painting over the VP columns", () => {
    // Geometry comes from the ONE stack plan, which counts the VP columns.
    expect(block).toMatch(/stackPlan\.lanes\.LIVING/);
    expect(CHART).toMatch(/fixedLanes: \(fixedVPActive \? 1 : 0\) \+ \(sessionVPActive \? 1 : 0\)/);
  });

  it("caps the histogram width so it cannot eat the whole canvas", () => {
    // The cap moved to the one lane owner: solo geometry lives in soloLane.
    expect(block).toMatch(/stackPlan\.lanes\.LIVING \?\? soloLane\(W\)/);
    const plan = read("src/lib/marketData/viewModels/profileStackPlan.ts");
    expect(plan).toMatch(/Math\.min\(160, Math\.round\(canvasWidth \* 0\.16\)\)/);
  });
});

describe("A NODE IS A PRICE, and only a price", () => {
  it("passes only the compiler's own price to a coordinate function", () => {
    expect(block).toMatch(/srs\.priceToCoordinate\(m\.price\)/);
    expect(block).not.toMatch(
      /Coordinate\([^)]*(?:eight|olume|hare|istance|ntraded)/,
    );
  });

  it("counts marks actually painted rather than the whole list", () => {
    expect(block).toMatch(/if \(yr == null\) continue/);
    expect(block).toMatch(/drawnMarks\+\+/);
    expect(block).toMatch(/ds\.livingProfileMarks = String\(drawnMarks\)/);
  });

  it("never reads a tempting size field — the compiler emits none", () => {
    // `LivingProfileGlass` deliberately does not carry raw volumes, distances,
    // or shares. This file must not try to fish them out.
    expect(block).not.toMatch(/m\.(?:volume|distanceFromPoc|shareOfTotal)\b/);
  });
});

describe("HVN vs LVN — told apart by mark shape, never by hue", () => {
  it("chooses the SHAPE from kind, not a colour", () => {
    expect(block).toMatch(/m\.kind === "HVN"/);
    expect(block).toMatch(/fillRect|strokeRect/);
  });

  it("HVN is filled, LVN is hollow — fill/weight law, not hue", () => {
    // Filled = the market lingered here; hollow = a level nobody chose.
    // Absence rendered as an outline, not as a value.
    //
    // The primitive changed with H-703's histogram: annotation dots use
    // arc + fill (HVN) vs arc + stroke (LVN) rather than rect. The rule is
    // the same — one is a filled disc, the other is a ring.
    expect(block).toMatch(/ctx\.arc\(/);
    expect(block).toMatch(/ctx\.fill\(\)/);
    expect(block).toMatch(/ctx\.stroke\(\)/);
  });

  it("spends no green and no red on the marks", () => {
    const rgbas = [...block.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)];
    expect(rgbas.length, "no literal colours found — did the block move?").toBeGreaterThan(0);
    for (const m of rgbas) {
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      expect(g > r && g > b, `green-dominant colour on the marks: ${m[0]}`).toBe(false);
      expect(r > g * 1.6 && r > b * 1.6, `red-dominant colour on the marks: ${m[0]}`).toBe(false);
    }
  });
});

describe("the trader can quiet this layer, and the chart says WHICH silence it is", () => {
  it("a switched-off layer paints NOTHING", () => {
    expect(block).toMatch(/if \(on && lp\?\.drawn\) \{/);
  });

  it("reads the switch from a REF, never from the overlay's dependency array", () => {
    expect(block).toMatch(/const on = layerOnRef\.current\.livingProfile/);
    const deps = CHART.slice(CHART.lastIndexOf("}, [footprintType"));
    expect(deps.slice(0, 400)).not.toMatch(/livingProfileOnChart/);
  });

  it("the switch travels as its OWN prop, not as a null verdict", () => {
    expect(CHART).toMatch(/livingProfileOnChart\?: boolean/);
    expect(ROOM).toMatch(/livingProfileOnChart=\{livingProfileOn\}/);
  });

  it("OFF and NO_READING are different words in the receipt", () => {
    expect(block).toMatch(/ds\.livingProfile = on \? \(lp \? lp\.reason : "NO_READING"\) : "OFF"/);
  });
});

describe("the layer publishes a receipt in every state", () => {
  it("stamps the reason even when nothing is painted", () => {
    expect(block).toMatch(/ds\.livingProfile = on \?/);
  });

  it("withdraws ancillary receipts on OFF or when unpainted", () => {
    expect(block.match(/delete ds\.livingProfileMarks/g)?.length).toBeGreaterThanOrEqual(2);
    expect(block.match(/delete ds\.livingProfileUntraded/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
