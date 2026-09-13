import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import DeckExpressionShortlist, { hasReviewedOptionsReceipt } from "./DeckExpressionShortlist";
import { UNREVIEWED_RECEIPT } from "@/lib/optionsChainRead";

/**
 * Founder Build Order §5 Step 4 + Gate 3 Option Expression transformation
 * slice. The shortlist must OBEY three laws:
 *   1. §7 vocabulary — INDICATIVE stated, roles named, no fabricated fills
 *   2. §8 bans — no "BEST", no green safe badge, no god score
 *   3. Gate 3 — INDICATIVE never wears an EXECUTABLE/LIVE-CERTIFIED costume
 */

describe("DeckExpressionShortlist SSR paint", () => {
  it("renders the shell without a window and quietly withholds when direction is unknown", () => {
    const html = renderToStaticMarkup(
      <DeckExpressionShortlist symbol="TSLA" spot={365} direction={null} />,
    );
    expect(html).toContain("Expression · shortlist");
    expect(html).toContain("TSLA");
    // Direction is null on the deck today — the label says so, never silently
    // guesses a side.
    expect(html).toContain("direction UNKNOWN");
    expect(html).toContain('data-testid="deck-expression-wait-direction"');
    expect(html).toContain("WAIT FOR DIRECTION");
  });

  it("does not claim a received fidelity before a response — never LIVE-CERTIFIED or EXECUTABLE", () => {
    // The Gate 3 law from the Command Center is explicit: INDICATIVE must
    // never wear an EXECUTABLE/LIVE-CERTIFIED costume. This test refuses
    // words that would carry that meaning without a real feed=OPRA
    // entitlement.
    const html = renderToStaticMarkup(
      <DeckExpressionShortlist symbol="TSLA" spot={365} direction="long" />,
    );
    expect(html).toContain("reference · UNKNOWN");
    expect(html).not.toContain("INDICATIVE");
    expect(html).not.toContain("LIVE CERTIFIED");
    expect(html).not.toContain("EXECUTABLE");
    expect(html).not.toContain("BEST CONTRACT");
    expect(html).not.toContain("BEST");
  });

  it("aria-label names the underlying — screen readers get the same identity", () => {
    const html = renderToStaticMarkup(
      <DeckExpressionShortlist symbol="TSLA" spot={365} direction="long" />,
    );
    expect(html).toContain('aria-label="Option expression shortlist for TSLA"');
  });
});

describe("shortlist request safety", () => {
  const SOURCE = () => readFileSync(resolve(__dirname, "DeckExpressionShortlist.tsx"), "utf8");
  it("checks cancellation after the asynchronous body read", () => {
    expect(SOURCE()).toMatch(/await readOptionsResponse\(r, symbol\);\s*\/\/[^\n]*\n\s*if \(cancelled\) return;/);
  });
  it("does not project a historical OPRA entitlement failure into current glass", () => {
    expect(SOURCE()).not.toContain("OPRA remains");
  });
  it("requires an actual selection handler before enabling a contract", () => {
    expect(SOURCE()).toContain("slot.contract && state.receipt && onSelect");
  });

  it("fails closed when the response lacks reviewed provider or rights identity", () => {
    expect(hasReviewedOptionsReceipt(UNREVIEWED_RECEIPT)).toBe(false);
    expect(hasReviewedOptionsReceipt({
      source: "alpaca",
      fidelity: "INDICATIVE",
      coverage: "PARTIAL",
      newestProviderTimestamp: "2026-09-13T05:00:00.000Z",
      providerPath: "alpaca.options.reference",
      rightsPolicyId: "wm.options.reference.v1",
    })).toBe(true);
  });

  it("fences a prior underlying before the new symbol effect completes", () => {
    expect(SOURCE()).toContain("fetchedState.symbol === symbol");
    expect(SOURCE()).toContain('{ kind: "LOADING", symbol }');
  });

  it("uses static network vocabulary instead of reflecting arbitrary errors", () => {
    expect(SOURCE()).toContain('reason: "NETWORK ERROR"');
    expect(SOURCE()).not.toContain("err?.message");
  });

  it("does not request an options chain before canonical direction resolves", () => {
    const src = SOURCE();
    const guard = src.indexOf('if (direction === null)');
    const request = src.indexOf('/api/market-data/alpaca/options', guard);
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(request);
    expect(src).toContain('kind: "WAIT_DIRECTION"');
  });
});

describe("the deck mounts the shortlist in the desktop operating room", () => {
  const DECK = () => readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");

  it("imports DeckExpressionShortlist", () => {
    expect(DECK()).toContain('import DeckExpressionShortlist from "@/components/experience/DeckExpressionShortlist";');
  });

  it("renders the shortlist on the primary scene outside collapsed proof", () => {
    const src = DECK();
    const shortlistIdx = src.indexOf("<DeckExpressionShortlist");
    const chartIdx = src.indexOf("<DeckMarketChart");
    const chipIdx = src.indexOf("<AvailableRChip");
    const workspaceIdx = src.indexOf('className="wm-cd-market-workspace"');
    const evidenceIdx = src.indexOf('className="wm-cd-evidence-drawer"');
    expect(shortlistIdx, "DeckExpressionShortlist is not mounted").toBeGreaterThan(0);
    // MARKET is the central column; RISK + NEXT share the adjacent rail.
    // All three remain on the primary browser path before proof drawers.
    expect(workspaceIdx).toBeLessThan(chartIdx);
    expect(chartIdx).toBeLessThan(chipIdx);
    expect(chipIdx).toBeLessThan(shortlistIdx);
    expect(src).toContain('aria-label="Market, risk, and next workspace"');
    expect(src).toContain('aria-label="Risk and option expression"');
    // Must not be tucked into the deep-read drawer — Gate 3 fruit must be
    // visible on the default Founder scene, not one click away.
    expect(shortlistIdx, "DeckExpressionShortlist must sit BEFORE the collapsed evidence drawer")
      .toBeLessThan(evidenceIdx);
  });

  it("uses room-density hero treatment on the normal Founder route", () => {
    expect(DECK()).toContain('density="room"');
  });

  it("derives direction from canonical state and provides a real attachment path", () => {
    // The mapper returns null for unresolved/unrecognised directions; the
    // deck must not hard-code either side or hard-code UNKNOWN forever.
    const src = DECK();
    const start = src.indexOf("<DeckExpressionShortlist");
    const end = src.indexOf("/>", start);
    const block = src.slice(start, end);
    expect(block).toContain("direction={expressionDirection}");
    expect(block).toContain("spot={state?.price?.last ?? null}");
    expect(block).toContain("onSelect=");
    expect(src).toContain("<OptionExpressionIntent");
    expect(src).toContain("expressionScopeIsCurrent(optionSelection");
    expect(src).toContain("owner: expressionOwner");
    expect(src).toContain("direction: expressionDirection");
    expect(src).toContain("onIdentity={(identity: DecisionIdentity)");
    expect(src).toContain('key={`${expressionOwner}:${symbol}:');
  });

  it("the charts path adopts explicit-intent identity into the shared spine", () => {
    const charts = readFileSync(resolve(__dirname, "../chart/ChartsDashboard.tsx"), "utf8");
    expect(charts).toContain("bornDecision={currentSceneDecision}");
    expect(charts).toContain("adoptSceneDecision(current");
    expect(charts).toContain("currentDecisionIdentity(sceneDecision, decisionScope)");
    expect(charts).toContain("}, [symbol, canvasUser?.id]);");
  });
});
