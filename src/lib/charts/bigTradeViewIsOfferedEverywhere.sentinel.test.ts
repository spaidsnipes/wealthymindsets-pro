/**
 * SENTINEL — the Big Trade Intelligence view (Canon Asset 05) must be reachable
 * on EVERY asset class, must be fed the PER-TRADE tape rather than candles, and
 * must print the incapacity it was handed instead of a zero.
 *
 * Same method and same reasoning as the Absorption and Aggression sentinels
 * beside this file, for the same failure class: the regression is an OMISSION
 * at a wiring site, and an omission is invisible to a render test.
 * `categoryTabsFor` returning one fewer tab still returns a valid list;
 * `ChartsDashboard` forgetting the `!== "Big Trades"` exclusion still renders A
 * panel — the wrong one, silently, as an empty reference surface.
 *
 * It carries two assertions the other two do not need.
 *
 * THE SOURCE. This is the first chart view fed from `recentTicks` instead of
 * `chartBars`, and that is not an implementation detail: a candle has already
 * discarded the individual executions, so "was that one print large" cannot be
 * answered from one. A future refactor that "unified" this memo onto
 * `chartBars` for consistency would produce a panel that still rendered rows —
 * fabricated ones. The source is pinned.
 *
 * THE MISSING-INPUT BRANCH. Most feeds this product can reach carry no
 * per-trade tape at all, so the view's most common live state is the one where
 * it cannot answer. A panel that printed `0 large prints` there would be
 * stating a fact about the market when it held only a fact about the feed.
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

/** Colour literals are stripped before the art-direction scan — see the
 *  Aggression sentinel's note. An alpha channel is not a reading. */
function stripColors(src: string): string {
  return src.replace(/rgba?\([^)]*\)/g, "").replace(/#[0-9a-fA-F]{3,8}\b/g, "");
}

describe("Big Trade Intelligence view wiring", () => {
  it.each(CLASSES)("is offered on %s", (cls) => {
    expect(categoryTabsFor(cls)).toContain("Big Trades");
  });

  it("travels with the other two microstructure siblings, in order", () => {
    for (const cls of CLASSES) {
      const tabs = categoryTabsFor(cls);
      expect(tabs[0]).toBe("Chart");
      expect(tabs[1]).toBe("Absorption");
      expect(tabs[2]).toBe("Aggression");
      expect(tabs[3]).toBe("Big Trades");
    }
  });

  it("ChartsDashboard renders the view and excludes it from the fundamentals arm", () => {
    const src = read("src/components/chart/ChartsDashboard.tsx");
    expect(src).toContain("<BigTradeIntelligenceView");
    expect(src).toContain('activeTab === "Big Trades"');
    expect(src).toContain('activeTab !== "Big Trades"');
  });

  it("IS FED THE PER-TRADE TAPE, NOT CANDLES — a bar cannot answer this question", () => {
    const src = stripComments(read("src/components/chart/ChartsDashboard.tsx"));
    expect(src).toMatch(/bigTradeIntelligenceVM\s*=\s*React\.useMemo/);
    expect(src).toMatch(/selectBigTradeIntelligence\(recentTicks\)/);
    // And it must NOT have been quietly moved onto the bar array.
    expect(src).not.toMatch(/selectBigTradeIntelligence\([^)]*chartBars/);
  });

  it("THE INCAPACITY REACHES THE SCREEN: the view branches on `measured`", () => {
    const src = stripComments(read("src/components/experience/BigTradeIntelligenceView.tsx"));
    expect(src).toContain("vm.measured");
    expect(src).toContain("missingInputNote");
    // The ledger must be reachable only through the capacity gate — otherwise
    // an unmeasured window renders an empty table, which reads as "no large
    // prints" rather than "this feed states no prints at all".
    expect(src).toMatch(/!vm\.measured[\s\S]{0,400}missingInputNote/);
  });

  it("THE TWO BASES REACH THE SCREEN, AND THE VIEW DOES NOT WRITE THE SENTENCE", () => {
    const src = stripComments(read("src/components/experience/BigTradeIntelligenceView.tsx"));
    expect(src).toContain("basisDivergenceNote");
    expect(src).toContain("percentileBasisNote");
    expect(src).toContain("lotFloorCount");
    // The divergence prose belongs to the compiler. If the view started
    // composing its own, the two surfaces could disagree about the same tape.
    expect(src).not.toMatch(/quiet tape|busy tape/i);
  });

  it("THE SIDE'S PROVENANCE REACHES THE SCREEN", () => {
    // On the only live US-equity tape this product can reach, the buy/sell flag
    // is reconstructed by a tick rule. A reconstructed side may not wear the
    // same chrome as a venue-asserted one.
    const src = stripComments(read("src/components/experience/BigTradeIntelligenceView.tsx"));
    expect(src).toContain("vm.provenance");
    expect(src).toContain("provenanceNote");
  });

  it("an absent side is never rendered as a side", () => {
    const src = stripComments(read("src/components/experience/BigTradeIntelligenceView.tsx"));
    expect(src).toContain("NO SIDE");
    expect(src).toContain("largeUnsidedCount");
  });

  it("the view never hard-codes the mockup's art-direction literals", () => {
    const src = stripColors(stripComments(read("src/components/experience/BigTradeIntelligenceView.tsx")));
    for (const literal of ["$2.4M", "2.4M", "$1.8M", "847", "12,400", "68%", "$4.2M"]) {
      expect(src, `${literal} is art direction, not data`).not.toContain(literal);
    }
  });

  it("ships no counterparty classification and no accumulation verdict", () => {
    // The mockup labels prints INSTITUTIONAL / RETAIL and calls the window
    // SMART MONEY: ACCUMULATING. Nothing in this repo can see a counterparty,
    // and no selector owns an accumulation verdict. §9 applies to both.
    const src = stripComments(read("src/components/experience/BigTradeIntelligenceView.tsx"));
    expect(src).not.toMatch(/INSTITUTIONAL/i);
    expect(src).not.toMatch(/RETAIL/i);
    expect(src).not.toMatch(/ACCUMULAT/i);
    expect(src).not.toMatch(/DISTRIBUT/i);
    expect(src).not.toMatch(/SMART MONEY/i);
  });

  it("prints no notional — the feed states no currency", () => {
    const src = stripColors(stripComments(read("src/components/experience/BigTradeIntelligenceView.tsx")));
    // Matched precisely rather than by scanning for `$`, because `${…}` is
    // ordinary template interpolation and a sentinel that flags it would be
    // deleted the first time someone formatted a number. What is forbidden is a
    // currency SIGIL: the `` `$${x}` `` idiom, or a literal "$" in a label.
    expect(src).not.toMatch(/\$\$\{/);
    expect(src).not.toMatch(/["'`]\s*\$\s*["'`]/);
    expect(src).not.toMatch(/notional/i);
  });
});
