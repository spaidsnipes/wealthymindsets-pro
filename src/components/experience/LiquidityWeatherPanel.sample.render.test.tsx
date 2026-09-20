/**
 * THE WEATHER PANEL WITH THE P-601 GAUGE ON IT, WHERE A HUMAN CAN LOOK.
 *
 * POST-EDIT PIXEL PROOF LAW: a drawn change that nobody looked at is not
 * shipped. The gauge was just mounted onto this panel, and "it renders" is a
 * claim about pixels. /charts needs a session and a session is not available
 * to a test, so this follows the pattern `DecisionSpineBand.sample.render.test`
 * established — render the real component at suite time and write it where it
 * can simply be opened:
 *
 *     open $(node -p "require('os').tmpdir()+'/liquidity-weather-sample.html'")
 *
 * ── THE WHOLE PIPE IS REAL, ONLY THE TAPE IS SYNTHETIC ──────────────────────
 *
 * The states below are built by feeding TICKS to the real
 * `selectLiquidityWeather`, which the real `selectHeatLens` then reads, which
 * the real panel then draws. Nothing between the tape and the pixel is a
 * stand-in. That matters: a fixture assembled from hand-written view models
 * proves the renderer works and says nothing about whether the selectors would
 * ever produce those models.
 *
 * LIVING-PIXEL LAW: the ticks have no market behind them — they are shaped to
 * drive the panel into four different weathers. So the page is LABELLED a
 * fixture, above the panels. It is proof that the geometry draws, never
 * evidence about any instrument.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import LiquidityWeatherPanel from "./LiquidityWeatherPanel";
import { selectLiquidityWeather } from "@/lib/marketData/viewModels/selectLiquidityWeather";
import { HEAT_MAX_OPACITY } from "@/lib/marketData/viewModels/selectHeatLens";
import type { AggressorTick } from "@/lib/marketData/selectAggressorFlow";

const PUBLIC_SAMPLE = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "public",
  "liquidity-weather-sample.html",
);

/**
 * A run of prints. `spread` controls how far price travels per unit of size,
 * which is exactly the quantity the weather module measures — so a cheap run
 * and a dear run are produced by moving ONE number, not by asserting a stage.
 */
function run(
  from: number,
  to: number,
  prints: number,
  size: number,
): AggressorTick[] {
  const out: AggressorTick[] = [];
  for (let i = 0; i < prints; i++) {
    const p = from + ((to - from) * i) / Math.max(1, prints - 1);
    out.push({
      trade: true,
      side: i % 2 === 0 ? "buy" : "sell",
      size,
      price: Math.round(p * 100) / 100,
    });
  }
  return out;
}

/** Prints that all land on ONE price: size went in, the market did not move. */
function stall(price: number, prints: number, size: number): AggressorTick[] {
  return Array.from({ length: prints }, (_, i) => ({
    trade: true,
    side: (i % 2 === 0 ? "buy" : "sell") as "buy" | "sell",
    size,
    price,
  }));
}

const STATES = [
  {
    caption: "A WINDOW THAT TURNS DEAR — cost climbing through the range",
    ticks: [
      ...run(100, 103, 40, 10),
      ...run(103, 105.5, 40, 22),
      ...run(105.5, 107, 40, 48),
      ...run(107, 108, 40, 96),
      ...run(108, 108.6, 40, 180),
      ...run(108.6, 109, 40, 320),
    ],
  },
  {
    caption: "A WINDOW WITH SHELVES — two segments traded without moving at all",
    ticks: [
      ...run(100, 102, 40, 30),
      ...stall(102, 40, 90),
      ...run(102, 104, 40, 24),
      ...stall(104, 40, 120),
      ...run(104, 107, 40, 14),
      ...run(107, 112, 40, 9),
    ],
  },
  {
    caption: "A WINDOW THAT DISAGREES WITH ITSELF — cheap and dear alternating",
    ticks: [
      ...run(100, 103, 40, 8),
      ...run(103, 103.4, 40, 260),
      ...run(103.4, 106, 40, 9),
      ...run(106, 106.3, 40, 280),
      ...run(106.3, 109, 40, 7),
      ...run(109, 109.4, 40, 300),
    ],
  },
  {
    caption: "A TAPE TOO THIN TO READ — the panel refuses and the gauge dashes",
    ticks: [...run(100, 101, 4, 10)],
  },
];

let SAMPLE_HTML = "";
let SAMPLE_WRITE_ERROR = "";
try {
  const panels = STATES.map((state) => {
    const vm = selectLiquidityWeather(state.ticks);
    return `
    <section style="display:flex;flex-direction:column;gap:8px;width:360px">
      <div style="font-size:10px;letter-spacing:.7px;text-transform:uppercase;color:#8a8271;min-height:34px">${state.caption}</div>
${renderToStaticMarkup(<LiquidityWeatherPanel vm={vm} symbol="FIXTURE" window="synthetic tape" />)}
    </section>`;
  }).join("\n");

  const sample = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>WM Pro · Liquidity weather + P-601 gauge sample</title>
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
  <div style="padding:20px 24px 0;font-size:11px;line-height:1.6;color:#8a8271;max-width:860px">
    <strong style="color:#d4af37;letter-spacing:.8px">FIXTURE RENDER — NOT A MARKET.</strong>
    Every panel below is drawn by the real <code>LiquidityWeatherPanel</code> from the
    real <code>selectLiquidityWeather</code>, fed synthetic TICKS. The whole pipe is the
    product's; only the tape is invented. No number on this page is evidence about
    any instrument.
    <br><br>
    <strong style="color:#d4af37;letter-spacing:.8px">P-601 GAUGE — ATTACHED, NOT A ROOM.</strong>
    The PERSISTENCE / RESPONSE row under each chart is the heat lens's gauge. It is
    mounted on the weather it reads rather than behind a <code>/heat</code> route,
    because L-801 marks the rooms mall FORBIDDEN. Persistence is 1 − the DISAGREEING
    percentage printed above it; response is the LATEST VS PEERS ratio printed above
    it. A needle with no input shows a dash — never a zero. The lens's own bands are
    capped at ${HEAT_MAX_OPACITY} opacity where they paint on the candles.
  </div>
  <main>${panels}</main>
</body>
</html>`;
  SAMPLE_HTML = sample;
  const dest = path.join(tmpdir(), "liquidity-weather-sample.html");
  writeFileSync(dest, sample);
  writeFileSync(PUBLIC_SAMPLE, sample);
  process.stdout.write(`\n  Liquidity weather sample written to: ${dest}\n`);
  process.stdout.write(`  Open it: file://${dest}\n\n`);
} catch (error) {
  SAMPLE_WRITE_ERROR = error instanceof Error ? error.message : String(error);
}

describe("Liquidity weather sample — the gauge must actually reach the panel", () => {
  it("wrote the sample without error", () => {
    expect(SAMPLE_WRITE_ERROR).toBe("");
    expect(SAMPLE_HTML.length).toBeGreaterThan(0);
  });

  it("draws a P-601 gauge on every panel, counted in the MARKUP", () => {
    // Counted in the rendered HTML, not in a view model: this is the assertion
    // that fails if the gauge is mounted behind a condition never met.
    const gauges = SAMPLE_HTML.match(/data-testid="heat-lens-gauge"/g) ?? [];
    expect(gauges.length).toBe(STATES.length);
  });

  it("reaches more than one weather from the real selector", () => {
    // A fixture where every panel lands on the same stage proves the renderer
    // and nothing about the selector. Four inputs must yield several verdicts.
    const stages = new Set(
      [...SAMPLE_HTML.matchAll(/([A-Z]{5,12})<\/span>/g)].map((m) => m[1]),
    );
    expect(stages.size).toBeGreaterThan(1);
  });

  it("shows a dash for an unmeasured needle, never a zero", () => {
    expect(SAMPLE_HTML).toContain('data-state="UNMEASURED"');
    expect(SAMPLE_HTML).toContain("not measured");
  });

  it("says on its own face that it is a fixture", () => {
    expect(SAMPLE_HTML).toContain("FIXTURE RENDER — NOT A MARKET.");
  });
});
