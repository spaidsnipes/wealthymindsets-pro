/**
 * THE HEAT LENS, RENDERED WHERE A HUMAN CAN LOOK AT IT.
 *
 * POST-EDIT PIXEL PROOF LAW: a drawn change that nobody looked at is not
 * shipped. P-601 is a drawing, so the only honest acceptance evidence for it
 * is a drawing. The authenticated /charts route needs a session and a session
 * is not available to a test, so this follows the pattern already established
 * by `DecisionSpineBand.sample.render.test.tsx`: render the real component to
 * static markup at suite time and write it where it can simply be opened.
 *
 *     open $(node -p "require('os').tmpdir()+'/heat-lens-sample.html'")
 *
 * ── THIS IS A FIXTURE AND SAYS SO ON ITS FACE ───────────────────────────────
 *
 * LIVING-PIXEL LAW: every pixel needs a real owner. The weather VMs below have
 * no market behind them — they are constructed to exercise the lens's edges
 * (hot window, stalled segments, UNMEASURED refusal, half-measured gauge). So
 * the page is LABELLED a fixture, above the panels. It is proof that the
 * geometry draws, never evidence about any instrument.
 *
 * The selector and the component under it are the real ones. If the lens stops
 * drawing, this page stops showing bands.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import HeatLensOverlay, { HeatLensGauge } from "./HeatLensOverlay";
import {
  HEAT_MAX_OPACITY,
  selectHeatLens,
} from "@/lib/marketData/viewModels/selectHeatLens";
import {
  LIQUIDITY_WEATHER_VERSION,
  type LiquiditySegment,
  type LiquidityWeatherVM,
} from "@/lib/marketData/viewModels/selectLiquidityWeather";

const PUBLIC_SAMPLE = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "public",
  "heat-lens-sample.html",
);

const PLOT_HEIGHT = 240;
const LOW = 100;
const HIGH = 112;

/** The stand-in camera. Linear, and inverted the way a price axis is. */
function priceToY(price: number): number | null {
  if (price < LOW || price > HIGH) return null;
  return ((HIGH - price) / (HIGH - LOW)) * PLOT_HEIGHT;
}

function seg(
  index: number,
  cost: number | null,
  low: number,
  high: number,
): LiquiditySegment {
  return {
    index,
    volume: 1000 + index * 50,
    prints: 40,
    high,
    low,
    range: high - low,
    rangeInSpread: (high - low) / 0.5,
    cost,
    stalled: cost === null,
  };
}

function weather(p: Partial<LiquidityWeatherVM>): LiquidityWeatherVM {
  return {
    version: LIQUIDITY_WEATHER_VERSION,
    stage: "STEADY",
    segments: [],
    spread: 0.5,
    medianCost: 500,
    latestCost: 500,
    latestVsMedian: 1,
    latestVsPeers: 1,
    trendRatio: 1,
    dispersion: 0.2,
    provenance: "VENUE",
    requiresDisclosure: false,
    detail: "",
    ...p,
  } as LiquidityWeatherVM;
}

/** Four states, chosen because their geometry must NOT look alike. */
const STATES = [
  {
    caption: "HEAVY — cost concentrated high in the range; the hottest band sits at the regulator",
    vm: selectHeatLens(
      weather({
        stage: "HEAVY",
        dispersion: 0.12,
        latestVsPeers: 2.4,
        segments: [
          seg(0, 180, 100, 101.5),
          seg(1, 260, 101.5, 103),
          seg(2, 420, 103, 104.5),
          seg(3, 900, 104.5, 106),
          seg(4, 1400, 106, 107.5),
          seg(5, 1600, 107.5, 109),
          seg(6, 700, 109, 110.5),
          seg(7, 300, 110.5, 112),
        ],
      }),
    ),
  },
  {
    caption: "THINNING — with two stalled segments that draw NO band and are disclosed instead",
    vm: selectHeatLens(
      weather({
        stage: "THINNING",
        dispersion: 0.35,
        latestVsPeers: 0.4,
        segments: [
          seg(0, 900, 100, 102),
          seg(1, null, 102, 102),
          seg(2, 400, 102, 104),
          seg(3, null, 104, 104),
          seg(4, 150, 104, 107),
          seg(5, 120, 107, 112),
        ],
      }),
    ),
  },
  {
    caption: "ERRATIC — half the gauge unmeasured; the needle shows a dash, never a zero",
    vm: selectHeatLens(
      weather({
        stage: "ERRATIC",
        dispersion: 0.55,
        latestVsPeers: null,
        segments: [
          seg(0, 500, 100, 103),
          seg(1, 1200, 103, 106),
          seg(2, 300, 106, 109),
          seg(3, 1100, 109, 112),
        ],
      }),
    ),
  },
  {
    caption: "UNMEASURED — the tape was too thin; no band is drawn and the words say why",
    vm: selectHeatLens(weather({ stage: "UNMEASURED", dispersion: null, latestVsPeers: null })),
  },
];

let SAMPLE_HTML = "";
let SAMPLE_WRITE_ERROR = "";
try {
  const panels = STATES.map(
    (state) => `
    <section style="display:flex;flex-direction:column;gap:8px;width:330px">
      <div style="font-size:10px;letter-spacing:.7px;text-transform:uppercase;color:#8a8271;min-height:34px">${state.caption}</div>
      <div style="border:1px solid rgba(139,106,41,.22);border-radius:10px;overflow:hidden;background:#0c0d10">
        <div style="position:relative;height:${PLOT_HEIGHT}px;background:repeating-linear-gradient(to bottom, rgba(255,255,255,.035) 0 1px, transparent 1px 30px)">
${renderToStaticMarkup(
  <HeatLensOverlay vm={state.vm} priceToY={priceToY} height={PLOT_HEIGHT} />,
)}
        </div>
${renderToStaticMarkup(<HeatLensGauge vm={state.vm} />)}
        <div style="padding:6px 10px;font-size:10px;color:#6f6858;line-height:1.5">${state.vm.detail}</div>
      </div>
    </section>`,
  ).join("\n");

  const sample = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>WM Pro · Heat lens sample (P-601)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    /* The app loads Tailwind Preflight, whose first rule is this one. A
       fixture without it measures padded cells differently from the product
       and invents overflow that does not exist in the running app. */
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin:0; padding:0; background:#07080a; color:#f3efe6;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    main { padding:24px; display:flex; flex-wrap:wrap; gap:24px; align-items:flex-start; }
  </style>
</head>
<body>
  <div style="padding:20px 24px 0;font-size:11px;line-height:1.6;color:#8a8271;max-width:820px">
    <strong style="color:#d4af37;letter-spacing:.8px">FIXTURE RENDER — NOT A MARKET.</strong>
    The selector and the overlay are the real <code>selectHeatLens</code> and
    <code>HeatLensOverlay</code>; the weather states below are constructed to exercise
    the lens's edges. No number on this page is evidence about any instrument.
    <br><br>
    <strong style="color:#d4af37;letter-spacing:.8px">P-601 OPACITY REGULATOR — MAX ${HEAT_MAX_OPACITY}.</strong>
    The horizontal rules behind each panel stand in for candles. They must stay
    legible THROUGH the hottest band on this page — that is the regulator doing
    its job, and it is why heat can sit on price instead of beside it.
  </div>
  <main>${panels}</main>
</body>
</html>`;
  SAMPLE_HTML = sample;
  const dest = path.join(tmpdir(), "heat-lens-sample.html");
  writeFileSync(dest, sample);
  writeFileSync(PUBLIC_SAMPLE, sample);
  process.stdout.write(`\n  Heat lens sample written to: ${dest}\n`);
  process.stdout.write(`  Open it: file://${dest}\n\n`);
} catch (error) {
  SAMPLE_WRITE_ERROR = error instanceof Error ? error.message : String(error);
}

describe("Heat lens sample — the drawn lens must actually draw", () => {
  it("wrote the sample without error", () => {
    expect(SAMPLE_WRITE_ERROR).toBe("");
    expect(SAMPLE_HTML.length).toBeGreaterThan(0);
  });

  it("draws a band per paintable cell, counted in the MARKUP", () => {
    // Counting in the rendered HTML, not in the view model: this is the
    // assertion that fails if the overlay is rendered behind a condition that
    // is never true.
    const cells = SAMPLE_HTML.match(/data-testid="heat-lens-cell"/g) ?? [];
    const expected = STATES.reduce(
      (n, s) => n + s.vm.cells.filter((c) => c.paintable).length,
      0,
    );
    expect(expected).toBeGreaterThan(0);
    expect(cells.length).toBe(expected);
  });

  it("holds the P-601 regulator on every band that reached the page", () => {
    // The regulator is the reason heat may sit on candles at all. Read the
    // published attribute rather than a computed style.
    const published = [...SAMPLE_HTML.matchAll(/data-opacity="([\d.]+)"/g)].map(
      (m) => Number(m[1]),
    );
    expect(published.length).toBeGreaterThan(0);
    for (const opacity of published) {
      expect(opacity).toBeLessThanOrEqual(HEAT_MAX_OPACITY);
    }
    // And the hottest window actually reaches the cap, so this is a real
    // ceiling rather than a bound nothing ever approaches.
    expect(Math.max(...published)).toBeCloseTo(HEAT_MAX_OPACITY, 4);
  });

  it("draws the refusal in words when the weather is UNMEASURED", () => {
    expect(SAMPLE_HTML).toContain('data-testid="heat-lens-refusal"');
    expect(SAMPLE_HTML).toContain("HEAT UNAVAILABLE");
  });

  it("shows a dash for an unmeasured needle, never a zero", () => {
    expect(SAMPLE_HTML).toContain('data-state="UNMEASURED"');
    expect(SAMPLE_HTML).toContain("not measured");
  });

  it("says on its own face that it is a fixture", () => {
    expect(SAMPLE_HTML).toContain("FIXTURE RENDER — NOT A MARKET.");
  });
});
