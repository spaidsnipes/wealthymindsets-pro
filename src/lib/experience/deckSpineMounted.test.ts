/**
 * The Founder's Ticket T requires the deck to SHOW the five things the
 * scene has to show: NOW / MARKET / RISK / WHY / NEXT (Asset 10 canon).
 * DecisionSpineBand is the one component that compiles all five into a
 * primary-viewport strip, and it lives on /charts. Until this fence, the
 * deck did not mount it — every field was present in canvasCompilation,
 * every panel below was rendered, but the compiled NEXT summary that ties
 * the scene together was invisible on the default Founder route.
 *
 * A drift regression here is the shape that produced the whole prior
 * TRANSFORMATION_STALLED shift: the deck accumulates panels while the
 * compiled band that unites them silently gets deleted "to clean up
 * duplication."
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DECK = () => readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");

describe("the deck mounts DecisionSpineBand on the primary Founder scene", () => {
  it("imports the same band /charts uses (canon: never duplicate)", () => {
    const src = DECK();
    expect(src).toContain('import DecisionSpineBand from "@/components/experience/DecisionSpineBand";');
  });

  it("sits BELOW the MARKET chart — MARKET is the room, spine is support", () => {
    // Founder brief 2026-09-13: "MARKET IS THE ROOM. Not a little chart
    // card inside a dashboard." Before this ordering was fenced, the
    // SpineBand's six-column summary sat ABOVE the chart; blur-test at
    // 1440x723 landed on a card grid before candle geometry. The chart
    // is the room; the spine is the compiled summary that supports it.
    const src = DECK();
    const bandIdx = src.indexOf("<DecisionSpineBand");
    const chartIdx = src.indexOf("<DeckMarketChart");
    expect(chartIdx, "DeckMarketChart missing").toBeGreaterThan(0);
    expect(bandIdx, "DecisionSpineBand missing").toBeGreaterThan(0);
    expect(chartIdx, "SpineBand must sit BELOW the chart").toBeLessThan(bandIdx);
  });

  it("renders it in the primary column, above the deep-read drawer", () => {
    // Position matters: the band summarises the compiled five. Placing it
    // behind a details toggle would repeat the exact "one click away"
    // failure the RISK-chip atom was written to fix.
    const src = DECK();
    const bandIdx = src.indexOf("<DecisionSpineBand");
    const deepIdx = src.indexOf('<details open={deckEmphasis.deepSectionsOpen}');
    expect(bandIdx, "DecisionSpineBand is not mounted on the deck").toBeGreaterThan(0);
    expect(bandIdx, "DecisionSpineBand must sit BEFORE the deep-read drawer").toBeLessThan(deepIdx);
  });

  it("wires the band to the SAME compilation the panels below read", () => {
    // A band that recomputes availableR / decisionWhy / oneStory locally
    // is the CROSS_WIRED shape at the compiled-VM layer. Every source must
    // be the deck-scoped variables that already flow from
    // composeMarketCanvasVM — never a second computation.
    const src = DECK();
    const start = src.indexOf("<DecisionSpineBand");
    const end = src.indexOf("/>", start);
    const block = src.slice(start, end);
    expect(block).toContain("oneStory={oneStory}");
    expect(block).toContain("availableR={chainVm?.availableR");
    expect(block).toContain("decisionWhy={decisionWhy}");
  });

  it("decisionId adopts the lawful scene identity with a sentence while absent", () => {
    const src = DECK();
    const start = src.indexOf("<DecisionSpineBand");
    const end = src.indexOf("/>", start);
    const block = src.slice(start, end);
    expect(block).toContain("decisionId={currentSceneDecision?.decisionId ?? null}");
    expect(block).toContain("decisionIdAbsence=");
    expect(block).not.toMatch(/decisionId=\{`[^`]*`\}/); // no template-literal minting
    expect(block).not.toMatch(/decisionId=\{Math\./);    // no random() mint
    expect(block).not.toMatch(/decisionId=\{Date\./);    // no timestamp mint
  });

  it("NEXT receives the selected expression instead of a permanent null", () => {
    const src = DECK();
    const start = src.indexOf("<DecisionSpineBand");
    const end = src.indexOf("/>", start);
    const block = src.slice(start, end);
    expect(block).toContain("expression={selectedExpressionLabel}");
    expect(block).toContain("onOpenWhy=");
  });
});
