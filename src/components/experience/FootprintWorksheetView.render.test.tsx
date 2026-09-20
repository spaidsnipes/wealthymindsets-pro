/**
 * Asset 18 render proof.
 *
 * There is no `@testing-library/react` in this repo, so these render to static
 * markup and assert against the HTML, plus read the component source for the
 * rules that are about what the file MAY NOT contain.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import FootprintWorksheetView from "@/components/experience/FootprintWorksheetView";
import {
  MIN_PRINTS_FOR_LADDER,
  selectFootprintWorksheet,
  type FootprintPrint,
} from "@/lib/marketData/viewModels/selectFootprintWorksheet";

const SOURCE = readFileSync(
  join(process.cwd(), "src/components/experience/FootprintWorksheetView.tsx"),
  "utf8",
);

/**
 * THE SOURCE WITH ITS COMMENTS REMOVED.
 *
 * The no-hue rule has to be checked against the CODE, not the file. The file's
 * own docblock explains the rule by naming what it forbids — "a red bar and a
 * green bar would be a verdict painted onto volume" — and a check that reads
 * the raw text fails on the sentence that documents the very thing it is
 * enforcing. That would push the next author to delete the explanation in order
 * to make the test pass, which trades a real safeguard for a green tick.
 *
 * What must contain no hue is what renders. So: strip the prose, check the rest.
 */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");

const signedTape = (count: number): FootprintPrint[] =>
  Array.from({ length: count }, (_, i) => ({
    price: 100 + (i % 24) * 0.5,
    size: 1 + (i % 5),
    side: (i % 24 === 10 ? "buy" : i % 2 === 0 ? "buy" : "sell") as "buy" | "sell",
    trade: true,
  }));

const render = (prints: FootprintPrint[] | null): string =>
  renderToStaticMarkup(
    <FootprintWorksheetView
      vm={selectFootprintWorksheet({ prints })}
      symbol="BTC"
      timeframe="1h"
    />,
  );

describe("FootprintWorksheetView", () => {
  it("draws the ladder and marks exactly one divided level", () => {
    const html = render(signedTape(400));
    const rows = html.match(/data-testid="footprint-ladder-row"/g) ?? [];
    expect(rows.length).toBeGreaterThan(1);
    const selected = html.match(/data-selected="true"/g) ?? [];
    expect(selected.length).toBe(1);
  });

  it("names both sides of the axis in words rather than by position", () => {
    const html = render(signedTape(400));
    expect(html).toContain("Seller crossed (bid)");
    expect(html).toContain("Buyer crossed (ask)");
  });

  it("accounts for the selection instead of asserting it", () => {
    const html = render(signedTape(400));
    expect(html).toContain("furthest apart");
    expect(html).toContain("Nothing clicked it");
  });

  it("draws the seven steps through the SHARED renderer, retitled", () => {
    const html = render(signedTape(400));
    expect(html).toContain('data-testid="division-worksheet-view"');
    expect(html).toContain('data-worksheet="level"');
    expect(html).toContain("Order Flow Long Division");
    expect(html).toContain("ONE price level");
  });

  it("states the reason instead of drawing an empty grid when there is no tape", () => {
    const html = render(null);
    expect(html).toContain('data-testid="footprint-ladder-absent"');
    expect(html).not.toContain('data-testid="footprint-ladder-row"');
    expect(html).toContain("No per-trade tape has reached this room");
  });

  it("states the reason on a signed-but-short tape too", () => {
    const html = render(signedTape(MIN_PRINTS_FOR_LADDER - 1));
    expect(html).toContain('data-testid="footprint-ladder-absent"');
    expect(html).toContain(String(MIN_PRINTS_FOR_LADDER));
  });

  /**
   * BUILD ORDER §9 — nothing may be graded in hue. A red bar against a green
   * bar would let a colour state a verdict about the auction that no owner in
   * this room computed. Length is the measurement; the ink is the same on both
   * sides, and the selected rung is marked structurally.
   */
  it("uses ONE ink for both sides — no side is graded by colour", () => {
    expect(CODE).not.toMatch(/\b(red|green|crimson|lime|tomato)\b/i);
    expect(CODE).not.toMatch(/#(ef4444|22c55e|e74c3c|2ecc71|ff0000|00ff00)\b/i);
    // Exactly one bar ink constant exists, and both sides read it.
    const inkUses = CODE.match(/background: INK/g) ?? [];
    expect(inkUses.length).toBe(2);
  });

  it("marks the divided level with a border, not a fill", () => {
    expect(CODE).toContain("border: selected");
    expect(CODE).not.toMatch(/background: selected/);
  });

  it("keeps the explanation of the no-hue rule in the file", () => {
    // The stripped-comment check above is only safe while the reason survives
    // somewhere. If the docblock goes, this fails — the rule must stay legible
    // to a human, not only enforceable by a regex.
    expect(SOURCE).toContain("NO HUE CARRIES MEANING");
    expect(SOURCE).toContain("Length is the measurement");
  });

  it("carries none of the mockup's fabricated figures", () => {
    for (const prints of [null, signedTape(400)] as Array<FootprintPrint[] | null>) {
      const html = render(prints);
      // Strip the style/markup noise before looking for bare digit runs.
      const text = html.replace(/<[^>]+>/g, " ");
      expect(text).not.toMatch(/\b421\b/);
      expect(text).not.toMatch(/\b532\b/);
      expect(text).not.toMatch(/18,?552\.25/);
    }
  });
});
