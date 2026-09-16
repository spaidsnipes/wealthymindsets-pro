import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import DeckMarketChart, { classifyFetch } from "./DeckMarketChart";

/**
 * The deck's MARKET section now renders a REAL chart. This suite fences three
 * things — because a scene-moving atom is exactly the shape that regresses
 * next month when someone "cleans up the imports":
 *
 *   1. the honest state machine — no ghost chart under a loading message
 *   2. the initial SSR paint (no window, no fetch) does not throw
 *   3. the deck actually mounts it (source-graph guard on the page)
 */

describe("classifyFetch — the state machine of the chart", () => {
  it("READY when candles come back", () => {
    const s = classifyFetch(true, 200, {
      candles: [{ time: 1, open: 1, high: 1, low: 1, close: 1 }],
    });
    expect(s.kind).toBe("READY");
    if (s.kind === "READY") expect(s.candles.length).toBe(1);
  });

  it("EMPTY when the shape is valid but the array is empty", () => {
    // Weekend / pre-open / unsubscribed symbol. Not the same failure as an
    // upstream outage — a trader may want to see "no candles yet for X TF"
    // without alarm.
    expect(classifyFetch(true, 200, { candles: [] }).kind).toBe("EMPTY");
  });

  it("UNAVAILABLE with an HTTP reason when the fetch failed", () => {
    const s = classifyFetch(false, 503, {});
    expect(s.kind).toBe("UNAVAILABLE");
    if (s.kind === "UNAVAILABLE") expect(s.reason).toContain("503");
  });

  it("UNAVAILABLE when the response is malformed rather than drawing garbage", () => {
    // Every one of these used to draw SOMETHING against a fabricated series
    // when the code trusted the shape. Now they land in UNAVAILABLE.
    for (const payload of [null, {}, { candles: null }, { candles: "nope" },
                           { candles: [{ time: "1", open: 1, high: 1, low: 1, close: 1 }] },
                           { candles: [{ time: 1, open: NaN, high: 1, low: 1, close: 1 }] },
                           { candles: [{ time: 1, open: 1, high: Infinity, low: 1, close: 1 }] }]) {
      const s = classifyFetch(true, 200, payload);
      expect(s.kind, `payload should have been UNAVAILABLE: ${JSON.stringify(payload)}`).toBe("UNAVAILABLE");
    }
  });
});

describe("DeckMarketChart SSR paint", () => {
  it("renders the shell with the symbol and timeframe (no throw)", () => {
    // No window at SSR — the effect that reaches /api/yahoo does not run.
    const html = renderToStaticMarkup(<DeckMarketChart symbol="TSLA" timeframe="15m" />);
    expect(html).toContain("TSLA");
    expect(html).toContain("15m");
    expect(html).toContain('data-testid="deck-market-chart"');
    // IDLE is the honest initial state — never a ghost chart shape.
    expect(html).toContain('data-testid="deck-market-chart-idle"');
  });

  it("does not print a second visible instrument identity above the candles", () => {
    // SCENE_FRAGMENTATION (Founder audit 2026-09-13). This spec previously
    // asserted the OPPOSITE — that a "Market · chart evidence" label and a
    // "TSLA · 15m" echo were present — on the reasoning that the skeleton
    // should be comprehensible before hydration. In the fused deck room that
    // reasoning inverted: HeroTruth renders the same symbol and timeframe at
    // 34px directly above this section, so the echo made ONE instrument read
    // as TWO owners, and the section label announced a card inside a room
    // whose only subject is the market.
    //
    // The identity is still fully available to assistive technology through
    // the section's aria-label. Retiring a visual duplicate is not allowed to
    // cost a screen-reader user the name of what they are on.
    const html = renderToStaticMarkup(<DeckMarketChart symbol="TSLA" timeframe="15m" />);
    expect(html).not.toContain("Market · chart evidence");
    expect(html).toContain('aria-label="TSLA 15m chart"');
    // The bar count must not render before candles exist — an evidence count
    // painted in IDLE would claim evidence the fetch never returned.
    expect(html).not.toContain("bars");
  });
});

describe("the deck actually mounts a real chart in its MARKET section", () => {
  it("command-deck imports DeckMarketChart and renders it in the STORY surface", () => {
    // Source-graph guard: if a future refactor drops the chart, MARKET
    // regresses to chip-lists-only and Ticket T loses "real chart evidence."
    const src = readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");
    // Matched on the MODULE, not on a byte-exact import line. The old form
    // pinned `import DeckMarketChart from "…";` verbatim and broke the moment
    // the deck additionally imported the `Candle` type — a guard failing over
    // punctuation while the thing it guards is intact trains people to edit
    // the assertion rather than read it.
    expect(src).toMatch(
      /import\s+DeckMarketChart(?:,\s*\{[^}]*\})?\s+from\s+"@\/components\/experience\/DeckMarketChart"/,
    );
    expect(src).toMatch(/<DeckMarketChart\s+symbol=\{symbol\}\s+timeframe=\{timeframe\}/);
  });

  it("forwards the chart's candles into canonical state — the deck may not sit on its own evidence", () => {
    // THE DEFECT THIS GUARDS, MEASURED ON PRODUCTION 2026-09-16 (TSLA):
    // DeckMarketChart drew 120 real candles closing at 356.58 under the words
    // "Read just now", while HeroTruth eleven pixels above printed `?` for
    // price. The candles were fetched, rendered, and then discarded — the deck
    // called usePublishChartMarketState without `bars`, so canonical
    // `lastBar` was null and every reader downstream believed the room had no
    // price evidence at all.
    //
    // `bars` is OPTIONAL on the publisher's input, which is correct (a surface
    // with no candles must publish without inventing any) but it also means
    // dropping this wire would type-check, test green, and silently restore
    // the exact contradiction. That is why the wire itself is asserted.
    const src = readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");
    expect(src).toMatch(/onCandlesReady=\{handleDeckCandles\}/);
    // The forward must actually reach the publisher, not merely be captured
    // into state. Naming both halves is the point: a chart that hands candles
    // to a parent which never publishes them is the same dead end.
    expect(src).toMatch(/usePublishChartMarketState\(\{[\s\S]*?bars:\s*deckCandles[\s\S]*?\}\)/);
  });

  it("the chart and concise contextual WHY stay inside one market room", () => {
    const src = readFileSync(resolve(__dirname, "../../app/command-deck/page.tsx"), "utf8");
    const roomIdx = src.indexOf('aria-label="One decision market room"');
    const chartIdx = src.indexOf("<DeckMarketChart", roomIdx);
    const whyIdx = src.indexOf('className="wm-cd-market-why"', chartIdx);
    const decisionWhyIdx = src.indexOf("<DecisionWhyPanel", whyIdx);
    const workspaceIdx = src.indexOf('className="wm-cd-secondary-workspace"', whyIdx);
    expect(roomIdx).toBeGreaterThan(0);
    expect(chartIdx).toBeGreaterThan(roomIdx);
    expect(whyIdx).toBeGreaterThan(chartIdx);
    expect(decisionWhyIdx).toBeGreaterThan(whyIdx);
    expect(decisionWhyIdx).toBeLessThan(workspaceIdx);
  });
});

describe("classifyFetch stamps when the candles landed", () => {
  it("READY carries fetchedAtMs so staleness is computable at all", () => {
    const s = classifyFetch(true, 200, { candles: [{ time: 1, open: 1, high: 1, low: 1, close: 1 }] }, 1234);
    expect(s.kind).toBe("READY");
    if (s.kind === "READY") expect(s.fetchedAtMs).toBe(1234);
  });

  it("defaults the stamp to now rather than leaving it undefined", () => {
    // An unstamped READY would make the as-of line print "just now" forever,
    // which is the exact lie this stamp exists to prevent.
    const before = Date.now();
    const s = classifyFetch(true, 200, { candles: [{ time: 1, open: 1, high: 1, low: 1, close: 1 }] });
    if (s.kind === "READY") {
      expect(s.fetchedAtMs).toBeGreaterThanOrEqual(before);
      expect(Number.isFinite(s.fetchedAtMs)).toBe(true);
    }
  });
});

describe("the refresh contract", () => {
  // NOTE ON METHOD: this repo has no jsdom environment, so timer-driven React
  // effects cannot be exercised here. These are SOURCE-GRAPH assertions and
  // are honest about being so — they prove the gates are WRITTEN, not that
  // they FIRED. The behaviour they guard is small and declarative (three
  // boolean gates and a cadence), which is the case where a source guard
  // carries real weight; the pure staleness arithmetic underneath them is
  // covered behaviourally in marketFieldFreshness.test.ts.
  const src = readFileSync(resolve(__dirname, "DeckMarketChart.tsx"), "utf8");

  it("refreshes on the freshness budget, not on an invented cadence", () => {
    // Two numbers would drift apart, and the day they do, the room starts
    // lying in the gap between "went stale" and "asked again".
    expect(src).toContain("const refreshEveryMs = freshness?.budgetMs ?? null");
    expect(src).toContain("window.setInterval(ask, refreshEveryMs)");
  });

  it("does not poll a closed tape", () => {
    // Manufactured activity in a sanctuary the canon requires to be calm
    // when the market is shut.
    expect(src).toContain('session !== "CLOSED"');
  });

  it("does not poll for a trader who is not looking", () => {
    expect(src).toContain('document.visibilityState === "hidden"');
    expect(src).toContain('document.addEventListener("visibilitychange"');
  });

  it("only schedules from READY, so a failed load cannot become a retry storm", () => {
    expect(src).toMatch(/shouldRefresh\s*=\s*state\.kind === "READY"/);
  });

  it("a refresh does not blank the room back to LOADING", () => {
    // Flickering between real candles and "Loading candles…" every bar
    // interval would make the market field unreadable while the trader is
    // mid-decision.
    expect(src).toContain("if (!isRefresh) setState({ kind: \"LOADING\" })");
  });

  it("a failed refresh keeps the candles AND admits the failure", () => {
    // Both halves are true at once: the candles on screen are real, and the
    // last attempt to confirm them did not land. Collapsing to UNAVAILABLE
    // throws away evidence; staying silent hides the failure.
    expect(src).toContain("refreshFailure");
    expect(src).toContain('data-testid="deck-market-chart-refresh-failed"');
    expect(src).toMatch(/prev\.kind === "READY"\s*\n?\s*\?\s*\{ \.\.\.prev, refreshFailure: reason \}/);
  });

  it("has exactly one door into asking again", () => {
    const doors = src.match(/setRefreshNonce/g) ?? [];
    // One declaration in useState's setter position plus one caller.
    expect(doors.length).toBe(2);
  });
});
