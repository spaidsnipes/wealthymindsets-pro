/**
 * THE SHORTLIST TILES, RENDERED WHERE A HUMAN CAN LOOK AT THEM.
 *
 *     open $(node -p "require('os').tmpdir()+'/expression-shortlist-sample.html'")
 *
 * Same law as the decision-rail and protection-line samples: a drawn change
 * nobody looked at is not shipped, and the route that carries these tiles is
 * behind a session.
 *
 * ── WHAT IS REAL HERE AND WHAT IS NOT ────────────────────────────────────────
 *
 * The tile, the shortlist compiler and the quote-bar compiler are all the REAL
 * ones: every row below is `selectExpressionShortlist` choosing from a chain
 * and `selectExpressionQuoteBar` dividing the book it chose. What is
 * constructed is the CHAIN — four hypothetical option books whose spreads must
 * not look alike, plus the two absences.
 *
 * It is a fixture and it says so on its face. A page of option quotes that
 * could be mistaken for a live chain would be worse than no page: §7 fidelity
 * rules exist precisely so INDICATIVE is never read as executable.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { ShortlistTile } from "./DeckExpressionShortlist";
import { selectExpressionShortlist, type ShortlistSlot } from "@/lib/expressionShortlist";
import type { OptionContract } from "@/lib/optionContractResponse";

const PUBLIC_SAMPLE = path.resolve(
  __dirname, "..", "..", "..", "public", "expression-shortlist-sample.html",
);

/**
 * A clock is passed to the tile for the OBSERVATION AGE sentences, which are
 * not this atom's subject. Fixed, never `Date.now()`, so the page is
 * reproducible and no reader can mistake a rendered age for a live one.
 */
const NOW_MS = Date.parse("2026-09-17T18:30:00Z");
const OBSERVED_AT = "2026-09-17T18:29:40Z";

function leg(patch: Partial<OptionContract>): OptionContract {
  return {
    symbol: "WMX",
    contractType: "call",
    expirationDate: "2026-09-18",
    strike: 100,
    quoteTimestamp: OBSERVED_AT,
    tradeTimestamp: OBSERVED_AT,
    ...patch,
  };
}

/**
 * Three expiries, so all three JOBS fill — and three deliberately different
 * books, because the whole point of the bar is that FAST, BALANCED and MORE
 * TIME can now be ranked by eye on cost.
 */
const CHAIN: OptionContract[] = [
  leg({ expirationDate: "2026-09-18", strike: 100, bid: 1.2, ask: 1.85, last: 1.4 }),
  leg({ expirationDate: "2026-10-16", strike: 100, bid: 3.4, ask: 3.7, last: 3.55 }),
  leg({ expirationDate: "2026-12-18", strike: 100, bid: 5.2, ask: 8.0, last: 6.1 }),
];

const REAL_SLOTS = selectExpressionShortlist({ chain: CHAIN, spot: 100, direction: "long" });

/** The two cases that must NOT draw a bar — an unobserved side, and an absence. */
const EXTRA_SLOTS: ShortlistSlot[] = [
  {
    job: "FAST",
    contract: leg({ expirationDate: "2026-09-18", strike: 105, ask: 0.9, last: 0.85 }),
    reason: "",
  },
  { job: "BALANCED", contract: null, reason: "chain carries one expiry" },
];

/**
 * The captions carry no grading vocabulary either — no WIDE, no TIGHT, no
 * CHEAP. The §8 guard below is asserted against the WHOLE page on purpose: a
 * reference page that taught the words the tiles are forbidden to say would
 * put them back into the trader's head by another door.
 */
const CAPTIONS = [
  "FAST — near expiry, 0.65 of a 1.85 ask",
  "BALANCED — a middle horizon, 0.30 of a 3.70 ask",
  "MORE TIME — furthest expiry, 2.80 of an 8.00 ask",
  "No bid observed — the bar refuses rather than drawing a 100% gap",
  "No contract for this job — the reason is the whole tile",
];

let SAMPLE_HTML = "";
let SAMPLE_WRITE_ERROR = "";
try {
  const rows = [...REAL_SLOTS, ...EXTRA_SLOTS].map((slot, i) => `
    <section style="display:flex;flex-direction:column;gap:6px;max-width:340px">
      <div style="font-size:10px;letter-spacing:.7px;text-transform:uppercase;color:#8a8271">${CAPTIONS[i]}</div>
${renderToStaticMarkup(<ShortlistTile slot={slot} nowMs={NOW_MS} />)}
    </section>`).join("\n");

  const sample = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>WM Pro · Expression shortlist sample</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html, body { margin:0; padding:0; background:#07080a; color:#f3efe6;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    main { padding:8px 24px 32px; display:flex; flex-wrap:wrap; gap:18px; }
  </style>
</head>
<body>
  <div style="padding:20px 24px 0;font-size:11px;line-height:1.6;color:#8a8271;max-width:760px">
    <strong style="color:#d4af37;letter-spacing:.8px">FIXTURE CHAIN — NOT A LIVE BOOK.</strong>
    The tile, the shortlist compiler and the spread compiler are the real ones;
    only the option quotes below are constructed. No tile is a statement about
    any contract, and nothing here is executable.
  </div>
  <main>${rows}</main>
</body>
</html>`;
  SAMPLE_HTML = sample;
  const dest = path.join(tmpdir(), "expression-shortlist-sample.html");
  writeFileSync(dest, sample);
  writeFileSync(PUBLIC_SAMPLE, sample);
  process.stdout.write(`\n  Expression shortlist sample written to: ${dest}\n`);
  process.stdout.write(`  Open it: file://${dest}\n\n`);
} catch (error) {
  SAMPLE_WRITE_ERROR = error instanceof Error ? error.message : String(error);
}

describe("Expression shortlist sample — the gap must be visible, and never graded", () => {
  it("wrote the sample without error", () => {
    expect(SAMPLE_WRITE_ERROR).toBe("");
    expect(SAMPLE_HTML.length).toBeGreaterThan(0);
  });

  it("draws a bar for every readable book and none for the other two", () => {
    const bars = SAMPLE_HTML.match(/data-testid="expression-quote-bar"/g) ?? [];
    // Five tiles: three readable books, one missing bid, one absent contract.
    expect(bars.length).toBe(3);
  });

  it("makes differently-priced books visibly different", () => {
    // 0.65/1.85 = 35, 0.30/3.70 = 8, 2.80/8.00 = 35 — the first and last agree
    // as a PROPORTION even though the premium differs by four dollars, which is
    // exactly what the bar is for and what the two decimals never showed.
    expect(SAMPLE_HTML).toContain('data-spread-pct="35"');
    expect(SAMPLE_HTML).toContain('data-spread-pct="8"');
  });

  it("keeps the absent slot's named reason rather than an empty shape", () => {
    expect(SAMPLE_HTML).toContain("chain carries one expiry");
  });

  it("states the cost in words beside the geometry", () => {
    expect(SAMPLE_HTML).toContain("given up on entry");
    expect(SAMPLE_HTML).toContain("Reference book, not a fill.");
  });

  it("never labels a contract BEST — §8 bans prophecy", () => {
    expect(SAMPLE_HTML).not.toMatch(/\bBEST\b/i);
    expect(SAMPLE_HTML).not.toMatch(/\b(WIDE|TIGHT|CHEAP|GOOD FILL)\b/i);
  });

  it("puts no green anywhere on the page", () => {
    // §9 — "No green shield. No green means safe." Asserted on the MARKUP.
    // GREEN-DOMINANT, not "contains a green channel": every brass and ivory in
    // this palette has one, and banning the channel would ban the house colours.
    const colours: Array<[number, number, number]> = [];
    for (const m of SAMPLE_HTML.matchAll(/#([0-9a-f]{6})\b/gi)) {
      const hex = m[1];
      colours.push([
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ]);
    }
    for (const m of SAMPLE_HTML.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
      colours.push([Number(m[1]), Number(m[2]), Number(m[3])]);
    }
    expect(colours.length).toBeGreaterThan(0);
    expect(colours.filter(([r, g, b]) => g > r && g > b)).toEqual([]);
  });

  it("says on its own face that the chain is a fixture", () => {
    expect(SAMPLE_HTML).toContain("FIXTURE CHAIN — NOT A LIVE BOOK.");
  });
});
