/**
 * A REFERENCE PAGE FOR THE DIMENSION STANDING BAND.
 *
 * The band's claim is that HOW MUCH OF THE BOARD IS LIT becomes legible before
 * a single heading is read — that a snapshot which resolved two dimensions out
 * of eight stops looking like a snapshot which resolved seven, when previously
 * both rendered as the same wall of 11px lines under a count.
 *
 * That is not a claim markup can settle. It has to be looked at. So this page
 * renders the REAL `MarketCanvasPanel` at four standings of the same board,
 * one under the other, and a human (or a screenshot) can check whether the
 * difference actually lands at a glance.
 *
 * The standings are a FIXTURE and the page says so in its own heading. A
 * reference page that could be mistaken for a live screen is a worse problem
 * than no reference page.
 */

import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import path from "node:path";

import { MarketCanvasPanel } from "./MarketCanvasPanel";
import type { MarketCanvasVM } from "@/lib/marketData/viewModels/selectMarketCanvas";

/** The eight canonical dimensions, named as the compiler names them. */
const DIMS = [
  "Regime",
  "Direction",
  "Location",
  "Participation",
  "Volatility",
  "Liquidity",
  "Time",
  "Correlation",
] as const;

const vm = (over: Partial<MarketCanvasVM>): MarketCanvasVM => ({
  version: "wm.market-canvas.v1",
  verdict: "WAIT",
  clear: false,
  headline: "Right-of-way withheld — evidence debt unpaid.",
  missing: [],
  resolved: [],
  measured: [],
  blockers: [],
  blockerCount: 0,
  clearances: [],
  invalidators: [],
  hasSnapshot: true,
  ...over,
});

/**
 * Four boards worth looking at, and why each is here.
 *
 * Every one of them sums to the same eight dimensions, because that is the
 * whole point: the ROW never changes length, only its light does.
 */
const CASES: readonly (readonly [string, string, MarketCanvasVM])[] = [
  [
    "A dark board",
    "Nothing has resolved. Eight marks, none of them lit — the honest floor.",
    vm({ missing: [...DIMS] }),
  ],
  [
    "The uncomfortable one",
    "Two resolved, one measured but not decision-grade, five unresolved. A count says 'RESOLVED (2)'; the row says how little that is.",
    vm({
      resolved: [DIMS[0], DIMS[1]],
      measured: [DIMS[2]],
      missing: [DIMS[3], DIMS[4], DIMS[5], DIMS[6], DIMS[7]],
    }),
  ],
  [
    "Read, but not enough to decide on",
    "Nothing is unresolved and nothing is decision-grade. The case a two-bucket band would draw as FULL.",
    vm({ measured: [...DIMS] }),
  ],
  [
    "A lit board",
    "All eight resolved. The reading the band exists to earn — a denominator that cannot reach full is not a denominator.",
    vm({ resolved: [...DIMS] }),
  ],
];

const SAMPLE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>Dimension standing band</title></head>
<body style="margin:0;padding:28px;background:#07080a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <h1 style="font-family:Georgia,serif;font-size:17px;color:#c9a55c;letter-spacing:.5px;margin:0 0 4px">
    Dimension standing — how much of the board is lit
  </h1>
  <p style="font-size:12px;color:#8a8271;margin:0 0 22px;max-width:780px;line-height:1.6">
    FIXTURE BOARD — NOT A LIVE SNAPSHOT. Four standings of the same eight
    canonical dimensions, rendered by the real panel. Read the rows, not the
    headings: solid ivory = resolved, half-lit = a reading exists but is not
    decision-grade, flat grey = unresolved. Every mark holds its width whatever
    it is worth, so the row is the same length in all four.
  </p>
  ${CASES.map(
    ([title, note, v]) => `
  <section style="margin-bottom:26px;max-width:780px">
    <div style="font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:#8a8271;margin-bottom:6px">
      ${title} — ${note}
    </div>
    ${renderToStaticMarkup(<MarketCanvasPanel vm={v} />)}
  </section>`,
  ).join("")}
</body></html>`;

const TMP = path.join("/tmp", "market-canvas-standing-sample.html");
writeFileSync(TMP, SAMPLE_HTML, "utf8");

describe("dimension standing sample page", () => {
  it("draws the same eight-mark row in every case", () => {
    // The claim under the whole page. If any board drew a shorter row, the
    // band would be a progress meter wearing a denominator's clothes.
    const perCase = SAMPLE_HTML.split('data-testid="market-canvas-panel"').slice(1);
    expect(perCase).toHaveLength(CASES.length);
    for (const html of perCase) {
      expect([...html.matchAll(/market-canvas-standing-mark/g)]).toHaveLength(DIMS.length);
    }
  });

  it("shows four genuinely different boards", () => {
    // If all four rows looked the same the page would prove nothing.
    const rows = SAMPLE_HTML.split('data-testid="market-canvas-standing"')
      .slice(1)
      .map((s) => [...s.matchAll(/data-standing="(\w+)"/g)].map((m) => m[1]).join(""));
    expect(new Set(rows).size).toBe(4);
  });

  it("keeps MEASURED visually distinct from both neighbours", () => {
    // The bucket that exists because the panel used to double-count it. A band
    // that folded it into either neighbour would re-tell that lie in geometry:
    // as resolved it overstates the board, as unresolved it tells the trader to
    // go and gather evidence that has already been gathered.
    const fills = new Set(
      [...SAMPLE_HTML.matchAll(/data-standing="(\w+)"[^>]*background:([^;"]+)/g)].map(
        (m) => `${m[1]}=${m[2]}`,
      ),
    );
    expect(fills.size).toBe(3);
  });

  it("says on its face that the board is a fixture", () => {
    expect(SAMPLE_HTML).toContain("FIXTURE BOARD — NOT A LIVE SNAPSHOT");
  });

  it("teaches no grade vocabulary and prints no percentage — §15", () => {
    // `decision-grade` is exempt, and the exemption is the interesting part.
    //
    // §15 bans the house from GRADING — awarding the trader or the setup a
    // mark out of something. "Decision-grade" is the opposite kind of word: it
    // is the compiler's own name for whether a READING is good enough to decide
    // on, it is printed in the panel's real heading ("Measured, not
    // decision-grade"), and it is owned by `selectMarketCanvas`.
    //
    // Left un-narrowed, this guard would fail the panel for using the
    // vocabulary of the module that feeds it — and the cheapest way to make it
    // pass would be to rename the bucket on the surface, which is exactly the
    // double-count this bucket was created to end.
    expect(SAMPLE_HTML).not.toMatch(
      /(?<!decision-)\b(SCORE|GRADE|PASSING|HEALTHY|EXCELLENT|POOR)\b/i,
    );
    expect(SAMPLE_HTML).not.toMatch(/\d+%/);
    // ...and the exemption is narrow: the only spelling it lets through is the
    // compound. A bare "GRADE" anywhere still fails.
    expect(SAMPLE_HTML).not.toMatch(/(?<!-)\bgrade\b/i);
  });

  it("carries no green-dominant colour — §9", () => {
    for (const m of SAMPLE_HTML.matchAll(/#([0-9a-f]{6})\b/gi)) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
      expect(g > r && g > b, `green-dominant #${m[1]}`).toBe(false);
    }
  });
});

// eslint-disable-next-line no-console
console.log(`\n  Dimension standing reference page: file://${TMP}\n`);
