/**
 * SENTINEL — the Living Profile (Canon Asset 06) must be reachable on EVERY
 * asset class, must take its distribution from ONE owner, and must carry the
 * candle-estimate node refusal all the way to the screen.
 *
 * Same failure class as the three microstructure sentinels beside this file:
 * the regression is an OMISSION at a wiring site, and an omission renders
 * something rather than nothing. `categoryTabsFor` returning one fewer tab is
 * still a valid list; `ChartsDashboard` forgetting the `!== "Value Profile"`
 * exclusion still paints a panel — the company reference sheet, silently.
 *
 * It carries two assertions that belong to this asset alone.
 *
 * ONE OWNER FOR THE SOURCE. Volume-at-price is the only one of the four
 * microstructure views with TWO honest inputs: the per-trade tape, and a
 * candle estimate. If the room chose between them itself, a second room could
 * choose differently and both would draw a defensible POC for one instrument
 * at the same instant. `buildLivingProfileSnapshot` is the single chooser, and
 * the dashboard may not call the engine directly behind its back.
 *
 * THE REFUSAL. `computeProfileFromBars` spreads each bar's volume EVENLY
 * across its range, so the within-bar shape is flat by construction and every
 * ripple in the estimated curve is bars overlapping, not price refusing to
 * trade. HVN/LVN are therefore withheld on that path. That refusal is only
 * worth anything if it reaches the trader, so the view must branch on it — and
 * must not compose its own wording for it, or two surfaces could explain the
 * same silence differently.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { categoryTabsFor } from "@/lib/charts/categoryTabsFor";
import { stripComments } from "@/lib/sourceScan";
import type { CanonicalAssetClass } from "@/lib/marketData/canonicalIdentity";

const CLASSES: readonly CanonicalAssetClass[] = ["equity", "etf", "options", "crypto", "futures", "forex"];

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

function stripColors(src: string): string {
  return src.replace(/rgba?\([^)]*\)/g, "").replace(/#[0-9a-fA-F]{3,8}\b/g, "");
}

describe("Living Profile view wiring", () => {
  it.each(CLASSES)("is offered on %s", (cls) => {
    expect(categoryTabsFor(cls)).toContain("Value Profile");
  });

  it("travels with the other three microstructure siblings, in order", () => {
    for (const cls of CLASSES) {
      const tabs = categoryTabsFor(cls);
      expect(tabs[0]).toBe("Chart");
      expect(tabs[1]).toBe("Absorption");
      expect(tabs[2]).toBe("Aggression");
      expect(tabs[3]).toBe("Big Trades");
      expect(tabs[4]).toBe("Value Profile");
    }
  });

  it("does not collide with the company reference sheet, which is still `Profile`", () => {
    // Two tabs meaning two different things under one word is a collision a
    // trader pays for. Both must exist, and they must be distinct entries.
    for (const cls of CLASSES) {
      const tabs = categoryTabsFor(cls);
      expect(tabs).toContain("Profile");
      expect(new Set(tabs).size).toBe(tabs.length);
    }
  });

  it("ChartsDashboard renders the view and excludes it from the fundamentals arm", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    expect(src).toContain("<LivingProfileView");
    expect(src).toContain('activeTab === "Value Profile"');
    expect(src).toContain('activeTab !== "Value Profile"');
  });

  it("THE SOURCE DECISION IS DELEGATED — the room does not pick tape-vs-bars", () => {
    const src = stripComments(read("src/components/chart/ChartsDashboard.tsx"));
    expect(src).toMatch(/livingProfileVM\s*=\s*React\.useMemo/);
    expect(src).toMatch(/buildLivingProfileSnapshot\(\s*recentTicks,\s*chartBars\s*\)/);
    // And it must not reach around that owner into the engine.
    expect(src).not.toMatch(/computeProfileFrom(Trades|Bars)\s*\(/);
  });

  it("the live price IS handed in — location against the levels is the reading", () => {
    const src = stripComments(read("src/components/chart/ChartsDashboard.tsx"));
    expect(src).toMatch(/livePrice:\s*ticker\.price/);
  });

  it("THE INCAPACITY REACHES THE SCREEN: the view branches on `measured`", () => {
    const src = stripComments(read("src/components/experience/LivingProfileView.tsx"));
    expect(src).toContain("vm.measured");
    expect(src).toContain("missingInputNote");
    expect(src).toMatch(/!vm\.measured[\s\S]{0,400}missingInputNote/);
  });

  it("THE CANDLE-ESTIMATE REFUSAL REACHES THE SCREEN, AND THE VIEW DOES NOT WORD IT", () => {
    const src = stripComments(read("src/components/experience/LivingProfileView.tsx"));
    expect(src).toContain("vm.nodesMeasured");
    expect(src).toContain("nodesNote");
    expect(src).toContain("qualityNote");
    // The refusal's prose belongs to the compiler. If the view started
    // composing its own, two surfaces could explain the same silence
    // differently — and one of them would eventually be wrong.
    expect(src).not.toMatch(/spread each bar/i);
    expect(src).not.toMatch(/candle geometry/i);
  });

  it("the quality of the distribution is stated, not implied", () => {
    const src = stripComments(read("src/components/experience/LivingProfileView.tsx"));
    expect(src).toContain("vm.quality");
    expect(src).toContain("BUILT FROM TRADES");
    expect(src).toContain("ESTIMATED FROM CANDLES");
  });

  it("an absent level renders as an em dash, never as zero", () => {
    const src = stripComments(read("src/components/experience/LivingProfileView.tsx"));
    // `px`, `qty` and `pct` each hold the null branch. A price of 0 is a claim
    // about the market; an em dash is a statement about the feed.
    expect(src).toMatch(/v == null\) return "—"/);
    expect(src).not.toMatch(/\?\?\s*0\b/);
  });

  it("the view never hard-codes the mockup's art-direction literals", () => {
    const src = stripColors(stripComments(read("src/components/experience/LivingProfileView.tsx")));
    for (const literal of ["4,285", "4285.50", "4,312", "4,250", "68.4%", "$4.2M"]) {
      expect(src, `${literal} is art direction, not data`).not.toContain(literal);
    }
  });

  it("ships no verdict the compiler does not own", () => {
    const src = stripComments(read("src/components/experience/LivingProfileView.tsx"));
    // The mockup narrates ACCEPTANCE / REJECTION / BALANCED and calls the shape
    // a trend day. Nothing in this repo owns those judgements.
    // Matched CASE-SENSITIVELY and as whole words, because the verdict is the
    // shouted label, not the word. The view legitimately writes "a tail is not
    // a rejection" in lower case — that sentence denies a claim rather than
    // making one, and a sentinel that deleted it would be removing honesty.
    expect(src).not.toMatch(/\bACCEPTANCE\b/);
    expect(src).not.toMatch(/\bREJECTION\b/);
    expect(src).not.toMatch(/\bBALANCED\b/);
    expect(src).not.toMatch(/\bTREND DAY\b/i);
  });
});
