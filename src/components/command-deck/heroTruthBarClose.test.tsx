import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import HeroTruth from "./HeroTruth";
import { canonicalMarketStateIdentity } from "@/lib/marketData/canonicalIdentity";
import { produceCanonicalMarketState } from "@/lib/marketData/produceCanonicalMarketState";
import { formatSpinePrice, selectPriceEvidence } from "@/lib/marketData/formatSpinePrice";

/**
 * TWO PRICE OWNERS IN ONE VIEWPORT, DISAGREEING — canon Weakness #1.
 *
 * ── THE DEFECT, AND WHO CAUSED IT ─────────────────────────────────────
 * The commit immediately before this one repaired /command-deck's silent
 * drop: `DeckMarketChart` fetched 120 real candles and published none of
 * them, so canonical `lastBar` was null and the room claimed no price
 * evidence while drawing it. Wiring the candles through fixed that.
 *
 * It also CREATED a second defect, which is why this suite exists. The deck
 * has two price owners:
 *
 *   HeroTruth          read `state.price.last`      → `?`
 *   DecisionSpineBand  read `formatSpinePrice(...)` → `356.58 LAST 15m BAR CLOSE`
 *
 * While `lastBar` was always null those two agreed — both said "nothing".
 * They agreed for the same reason a broken instrument agrees with another
 * broken instrument: neither was being asked. The moment real evidence
 * arrived, they diverged in the SAME VIEWPORT, eleven pixels apart. A repair
 * that moves a surface from "silently wrong" to "visibly contradictory" is
 * not finished, and this file is the record that it was not left there.
 *
 * ── WHY THE FIX IS A SHARED SELECTOR AND NOT A SECOND IF-CHAIN ────────
 * Teaching HeroTruth the same precedence rule (print outranks close) would
 * have made the two owners agree on the day it was written. They would then
 * agree exactly until someone edited one of them — the VACUOUS AGREEMENT
 * shape this codebase keeps rediscovering. `selectPriceEvidence` is the one
 * owner of WHICH FACT WINS; each surface owns only HOW IT IS DRAWN.
 */

/** A sealed snapshot built the way the deck builds one. */
function stateWith(opts: {
  last: number | null;
  lastBar?: { close: number; barOpenedAtMs: number; timeframe: string } | null;
}) {
  const identity = canonicalMarketStateIdentity({ symbol: "TSLA", timeframe: "15m" });
  const capturedAt = 1_758_000_000_000;
  return produceCanonicalMarketState({
    snapshotId: "test-barclose",
    capturedAt,
    instrumentId: identity.instrumentId,
    normalizedSymbol: "TSLA",
    executableIdentity: null,
    assetClass: "equity",
    exchange: null,
    session: identity.session,
    timeframeContext: identity.timeframeContext,
    price:
      opts.last == null
        ? { last: null, bid: null, ask: null, eventAt: null }
        : // `availableAt` is deliberately NOT passed: produceCanonicalMarketState
          // derives it. Supplying one here would let this fixture satisfy a
          // chronology the real deck never constructs.
          { last: opts.last, bid: null, ask: null, eventAt: capturedAt - 1_000 },
    lastBar: opts.lastBar ?? null,
    coverage: [],
  });
}

const BAR = { close: 356.58, barOpenedAtMs: 1_757_999_100_000, timeframe: "15m" };

function heroHtml(state: ReturnType<typeof stateWith>): string {
  return renderToStaticMarkup(
    <HeroTruth symbol="TSLA" timeframe="15m" state={state} density="room" />,
  );
}

describe("the hero and the spine cannot disagree about price", () => {
  it("THE CORE REGRESSION: a bar close reaches the hero instead of `?`", () => {
    // This is the exact production shape: no live print (empty tape), but the
    // deck's own chart loaded candles closing at 356.58.
    const html = heroHtml(stateWith({ last: null, lastBar: BAR }));
    expect(html).toContain("356.58");
  });

  it("PROOF THE FIXTURE IS THE DEFECT SHAPE, not a convenient one", () => {
    // Positive control on the INPUT. If `price.last` ever stops being null
    // here, the test above goes green through the ordinary print path and
    // proves nothing about bar closes at all.
    const state = stateWith({ last: null, lastBar: BAR });
    expect(state.price.last).toBeNull();
    expect(state.lastBar?.close).toBe(356.58);
  });

  it("the number is NOT drawn bare — a close rendered as a print is an overclaim", () => {
    // The glyph for a print and the glyph for a bar close are identical. Only
    // this word separates "the tape just traded here" from "this is where the
    // last candle ended". Drawing 356.58 at 36px with no qualifier would be a
    // BIGGER lie than the `?` it replaced, because `?` at least understated.
    const html = heroHtml(stateWith({ last: null, lastBar: BAR }));
    expect(html).toContain("LAST 15m BAR CLOSE");
    expect(html).toContain('data-provenance="BAR_CLOSE"');
  });

  it("a live print is NOT qualified — a print needs no apology", () => {
    const html = heroHtml(stateWith({ last: 357.12, lastBar: BAR }));
    expect(html).toContain("357.12");
    // The print outranks the close, and the close must not also be printed —
    // that would put two numbers in the hero and restore the very problem.
    expect(html).not.toContain("BAR CLOSE");
    expect(html).not.toContain("356.58");
  });

  it("no evidence at all still reads `?` — the repair did not invent a floor", () => {
    const html = heroHtml(stateWith({ last: null, lastBar: null }));
    expect(html).toContain("Price not yet observed");
    expect(html).not.toContain("BAR CLOSE");
  });

  it("the bar close is announced to assistive technology, not only to the eye", () => {
    // The qualifier is styled as a small grey chip. A screen-reader user who
    // hears only "Price 356.58" is told a print happened. The provenance must
    // ride in the label, not just in the pixels beside it.
    const html = heroHtml(stateWith({ last: null, lastBar: BAR }));
    expect(html).toContain('aria-label="Price 356.58, last 15m bar close"');
  });
});

describe("one owner decides which price fact wins", () => {
  it("the hero and the spine are driven by the SAME selector on every input", () => {
    // This is the anti-drift proof. Rather than asserting the two components
    // happen to look alike today, it walks the state matrix and checks that
    // the spine's sentence is always built from the hero's number — i.e. that
    // both are downstream of one decision.
    const cases: Array<[number | null, number | null, string | null]> = [
      [357.12, 356.58, "15m"],
      [null, 356.58, "15m"],
      [null, 356.58, null],
      [null, null, "15m"],
      [null, null, null],
      // Degenerate evidence must not become a price on either surface.
      [0, 356.58, "15m"],
      [NaN, 356.58, "15m"],
      [null, -1, "15m"],
    ];
    for (const [last, close, tf] of cases) {
      const evidence = selectPriceEvidence(last, close, tf);
      const spine = formatSpinePrice(last, close, tf);
      expect(spine.provenance, `provenance drift for ${JSON.stringify([last, close, tf])}`)
        .toBe(evidence.provenance);
      if (evidence.value == null) {
        expect(spine.text).toBe("PRICE UNKNOWN");
      } else {
        // The spine's sentence must CONTAIN the hero's number. If a future
        // edit rounds one and not the other, this fails.
        expect(spine.text, `number drift for ${JSON.stringify([last, close, tf])}`)
          .toContain(String(evidence.value));
      }
    }
  });

  it("a qualifier exists exactly when the number is not a print", () => {
    expect(selectPriceEvidence(357.12, 356.58, "15m").qualifier).toBeNull();
    expect(selectPriceEvidence(null, 356.58, "15m").qualifier).toBe("LAST 15m BAR CLOSE");
    // No timeframe is not a reason to invent one. "LAST BAR CLOSE" is weaker
    // and therefore honest; "LAST 15m BAR CLOSE" with no timeframe in state
    // would be fabricated precision.
    expect(selectPriceEvidence(null, 356.58, null).qualifier).toBe("LAST BAR CLOSE");
    expect(selectPriceEvidence(null, null, "15m").qualifier).toBeNull();
  });
});
