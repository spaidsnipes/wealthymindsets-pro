/**
 * PRINT EVIDENCE ON THE GLASS — Big Trades, the NEAR important-print tickets,
 * the NEAR per-bar delta row and the FORCE → RESPONSE causal marks.
 *
 * Each of these paints a claim about a real execution: when it happened, which
 * side initiated it, and what price did afterwards. The canvas only projects;
 * the words and numbers come from their owners (bubbleClaim,
 * aggressorProvenanceNote, selectPrintResponse). These breadcrumbs guard the
 * seams where the canvas used to restate an owner, or state more than the
 * evidence carries.
 *
 * A breadcrumb, not a renderer. It reads source. Every block extractor asserts
 * it found its landmarks, so a rename fails loudly instead of guarding nothing.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const RAW = readFileSync(path.join(process.cwd(), "src/components/chart/MainChart.tsx"), "utf8");

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "").replace(/[ \t]\/\/ .*$/gm, "");

const slice = (from: string, to: string): string => {
  const a = RAW.indexOf(from);
  expect(a, `landmark not found: ${from}`).toBeGreaterThan(-1);
  const b = RAW.indexOf(to, a + from.length);
  expect(b, `landmark not found after ${from}: ${to}`).toBeGreaterThan(a);
  return strip(RAW.slice(a, b + to.length));
};

/** The Big Trades paint pass, through its OFF branch. */
const bigTrades = () => slice("const BIG_TRADE_FULL = 5;", 'canvas.dataset.bigTradeBubbleStatus = "OFF";');

describe("a print's time is stated in the axis's zone", () => {
  it("the inscription and the ticket format through the zone-aware owner", () => {
    const b = bigTrades();
    const uses = b.match(/formatBubbleClock\(b\.anchorTime, tzRef\.current, clock24hRef\.current\)/g) ?? [];
    // Positive control: both the in-bubble time and the NEAR ticket's first line.
    expect(uses.length).toBe(2);
  });

  it("no unlabelled UTC clock is printed from the execution time", () => {
    const b = bigTrades();
    expect(b).toContain("anchorTime");
    expect(b).not.toMatch(/toISOString\(\)\.slice\(11/);
  });
});
