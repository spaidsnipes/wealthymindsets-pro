/**
 * Truth-lock for the chart room's ORDER FLOW preview sentence.
 *
 * The defects this closes are not crashes. They are the three ways a preview
 * can lie about a market:
 *
 *   1. by printing an ABSENCE as a finding ("NO STACK" as a headline),
 *   2. by choosing the LOUDEST reading instead of the one that constrains a
 *      decision, which teaches a trader to read the widget not the market,
 *   3. by claiming a full reading when only part of the tape was measurable.
 */
import { describe, it, expect } from "vitest";

import { selectOrderFlowStanding } from "./selectOrderFlowStanding";
import type { OrderFlowReadings } from "./selectOrderFlowStanding";

/* Minimal stand-ins. Only the fields the selector reads are populated — a
   fuller fixture would invite the test to drift from what is actually read. */
const stack = (verdict: string, direction: "BUY" | "SELL" | null = "BUY") =>
  ({ verdict, direction }) as unknown as NonNullable<OrderFlowReadings["stackedImbalance"]>;
const absorb = (verdict: string, pressingSide: "BUYERS" | "SELLERS" | null = "BUYERS") =>
  ({ verdict, pressingSide }) as unknown as NonNullable<OrderFlowReadings["absorption"]>;
const diverge = (verdict: string) =>
  ({ verdict }) as unknown as NonNullable<OrderFlowReadings["deltaDivergence"]>;
const weather = (stage: string) =>
  ({ stage }) as unknown as NonNullable<OrderFlowReadings["liquidityWeather"]>;
const value = (migration: string, measured = true) =>
  ({ migration, measured }) as unknown as NonNullable<OrderFlowReadings["valueCandle"]>;

describe("selectOrderFlowStanding", () => {
  it("says NO TAPE — and stays silent — when nothing measured", () => {
    const out = selectOrderFlowStanding({});
    expect(out.verdict).toBe("NO TAPE");
    expect(out.silent).toBe(true);
    expect(out.measuredCount).toBe(0);
    // RE-STATED. This asserted the literal word "crypto", which welded the
    // INTENT ("send the trader somewhere real") to ONE spelling of it. With no
    // subject handed down the selector genuinely cannot say more than the
    // general rule, so that is what this case checks — that the sentence still
    // tells the trader where a tape DOES exist rather than only saying "none".
    expect(out.headline).toMatch(/around the clock/);
    expect(out.headline).toMatch(/market hours/);
  });

  /**
   * A GENERAL RULE IS NOT AN ANSWER WHEN YOU HOLD THE PARTICULAR FACT.
   *
   * FOUND FROM USE, production /charts?symbol=TSLA, 2026-09-18. Workspace →
   * Order flow read "Crypto streams it around the clock; stocks stream it
   * during market hours" over a TSLA chart, on a feed the OS chrome badged
   * ACTIVE in the same frame. Half the sentence was about an instrument the
   * trader was not looking at; the other half handed back a rule and left them
   * to work out which side of it they were on.
   *
   * This file's own header says the preview exists so a trader "knows whether
   * to WAIT or to STOP LOOKING". These four cases are that question, answered
   * from the facts the room already holds.
   */
  describe("the NO TAPE sentence answers wait-or-stop from the facts in hand", () => {
    it("× CRYPTO: the clock is not the reason, so it does not send them to wait", () => {
      const out = selectOrderFlowStanding({}, { symbol: "BTCUSD" });
      expect(out.verdict).toBe("NO TAPE");
      expect(out.headline).toContain("BTCUSD");
      expect(out.headline).toMatch(/waiting will not change it/i);
      // Crypto tape never stops. Naming market hours here would send the
      // trader to wait for a condition that is permanently already true.
      expect(out.headline, "crypto has no market hours to wait for")
        .not.toMatch(/during market hours/);
    });

    it("× PROVEN SHUT: the clock IS the reason, so it says what to wait for", () => {
      const out = selectOrderFlowStanding({}, { symbol: "TSLA", sessionClosed: false });
      expect(out.headline).toContain("TSLA");
      expect(out.headline).toMatch(/session is closed/i);
      expect(out.headline).toMatch(/resume when the session opens/i);
    });

    it("× NOT PROVEN: names the rule, but only the half about THIS instrument", () => {
      // `provenSessionClosure` returns null far more often than false — it only
      // proves weekends. The honest middle must still drop the crypto clause.
      const out = selectOrderFlowStanding({}, { symbol: "TSLA", sessionClosed: null });
      expect(out.headline).toContain("TSLA");
      expect(out.headline).toMatch(/market hours/);
      expect(out.headline, "the trader is not looking at a crypto chart")
        .not.toMatch(/[Cc]rypto/);
    });

    it("a room that hands down nothing gets exactly the sentence it had before", () => {
      // Nothing may regress by OMISSION. The sentence only sharpens when the
      // room supplies what it already holds.
      expect(selectOrderFlowStanding({}, {}).headline).toBe(
        selectOrderFlowStanding({}).headline,
      );
      expect(selectOrderFlowStanding({}, { symbol: "   " }).headline).toBe(
        selectOrderFlowStanding({}).headline,
      );
    });

    it("the sentence only speaks when there is genuinely no tape", () => {
      // A measured reading outranks all of this — the subject must never be
      // able to overwrite a real finding with a disclosure about the feed.
      const out = selectOrderFlowStanding(
        { absorption: absorb("ABSORBED", "BUYERS") },
        { symbol: "TSLA", sessionClosed: false },
      );
      expect(out.verdict).not.toBe("NO TAPE");
      expect(out.headline).not.toMatch(/session is closed/i);
    });
  });

  it("treats every module's own empty state as nothing measured", () => {
    // Each selector has its own word for "this tape has not shown me enough".
    // If any of them leaked through as a headline, an absence would be dressed
    // up as a finding — the defect `formatSpinePrice` was cured of.
    const out = selectOrderFlowStanding({
      stackedImbalance: stack("NO_STACK"),
      absorption: absorb("UNMEASURED"),
      deltaDivergence: diverge("NO_SWING"),
      liquidityWeather: weather("UNMEASURED"),
      valueCandle: value("UNMEASURED", false),
    });
    expect(out.verdict).toBe("NO TAPE");
    expect(out.measuredCount).toBe(0);
    expect(out.headline).not.toMatch(/NO_STACK|UNMEASURED|NO_SWING/);
  });

  it("RANKS BY CONSTRAINT, NOT BY LOUDNESS — the stack outranks everything", () => {
    // Absorption is the more dramatic sentence. It still loses: only the stack
    // names a price a trader can act on.
    const out = selectOrderFlowStanding({
      stackedImbalance: stack("DEFENDED", "BUY"),
      absorption: absorb("ABSORBED", "SELLERS"),
      deltaDivergence: diverge("BEARISH"),
      liquidityWeather: weather("AIRLESS"),
      valueCandle: value("LAGGED"),
    });
    expect(out.headline).toBe("A level buyers stacked was retested and held.");
    expect(out.verdict).toBe("READING");
    expect(out.measuredCount).toBe(5);
  });

  it("falls to the NEXT constraint when the one above it is silent", () => {
    // The whole ranking, walked one rung at a time. If any rung could be
    // skipped while a higher one was measurable, the order would be decorative.
    const rungs: Array<[OrderFlowReadings, string]> = [
      [{ absorption: absorb("ABSORBED", "BUYERS") }, "Buyers are spending effort and not being paid for it."],
      [{ deltaDivergence: diverge("BEARISH") }, "Price made a new high the tape did not follow."],
      [{ liquidityWeather: weather("HEAVY") }, "It is costing a lot to move this market."],
      [{ valueCandle: value("LAGGED") }, "Price has moved away from where the volume actually traded."],
    ];
    for (const [readings, expected] of rungs) {
      expect(selectOrderFlowStanding(readings).headline).toBe(expected);
    }
  });

  it("says PARTIAL rather than claiming it read the whole tape", () => {
    const out = selectOrderFlowStanding({
      absorption: absorb("EFFICIENT", "SELLERS"),
      liquidityWeather: weather("THINNING"),
    });
    expect(out.verdict).toBe("PARTIAL");
    expect(out.measuredCount).toBe(2);
    expect(out.silent).toBe(false);
  });

  it("READING is reachable only when all five measured", () => {
    // Four of five must NOT round up. A trader reading READING is being told
    // every lens was open.
    const full: OrderFlowReadings = {
      stackedImbalance: stack("UNTESTED", "SELL"),
      absorption: absorb("BALANCED", null),
      deltaDivergence: diverge("CONFIRMED"),
      liquidityWeather: weather("STEADY"),
      valueCandle: value("ALIGNED"),
    };
    expect(selectOrderFlowStanding(full).verdict).toBe("READING");
    expect(selectOrderFlowStanding({ ...full, valueCandle: null }).verdict).toBe("PARTIAL");
  });

  it("NEVER names a selector, a module, or an internal system", () => {
    // Founder-facing copy may not expose the machinery. One assertion over the
    // whole reachable output space is worth more than five spot checks.
    const shapes: OrderFlowReadings[] = [
      {},
      { stackedImbalance: stack("BROKEN", "SELL") },
      { absorption: absorb("ABSORBED", "SELLERS") },
      { deltaDivergence: diverge("BULLISH") },
      { liquidityWeather: weather("ERRATIC") },
      { valueCandle: value("ALIGNED") },
    ];
    for (const s of shapes) {
      const { headline } = selectOrderFlowStanding(s);
      expect(headline).not.toMatch(/select|VM|selector|ATHOS|delta divergence|imbalance/i);
      // A sentence, in the trader's vocabulary — not a label.
      expect(headline.endsWith(".")).toBe(true);
    }
  });

  it("an undefined reading and a null reading are the same sentence", () => {
    // A caller that has not compiled one yet must not be able to produce a
    // different verdict from one that compiled nothing.
    expect(selectOrderFlowStanding({ absorption: null, valueCandle: undefined })).toEqual(
      selectOrderFlowStanding({}),
    );
  });
});

describe("NO TAPE · a blocked wire outranks the clock", () => {
  /**
   * MEASURED 2026-09-21, dev host, authenticated session:
   *
   *   GET /api/market-data/webull/entitlement
   *   verdict APP_KEY_ENTITLEMENT_ISOLATED — ACCOUNTS 200, PROFILES 200,
   *   SNAPSHOT + TICKS 403 MARKET_DATA_NOT_SUBSCRIBED under BOTH signing
   *   profiles.
   *
   * A weekday, so closure is NOT proven and the sentence fell through to
   * "Stock tape streams during market hours." The trader is told to wait for a
   * bell that will change nothing — the app key is not entitled to market
   * data, at any hour.
   */
  it("never offers market hours as the explanation when the wire is proven blocked", () => {
    const { verdict, headline } = selectOrderFlowStanding(
      {},
      { symbol: "SPY", sessionClosed: null, tapeWireBlocked: true },
    );
    expect(verdict).toBe("NO TAPE");
    expect(headline).not.toMatch(/market hours/i);
    expect(headline).toMatch(/SPY/);
    // It must say the one thing the trader needs: waiting is not the answer.
    expect(headline).toMatch(/waiting/i);
  });

  it("outranks a PROVEN closed session, because the wire survives the bell", () => {
    // Both facts are true at once. The clock one would expire at the open; the
    // wire one would not, so the wire one is the sentence.
    const { headline } = selectOrderFlowStanding(
      {},
      { symbol: "SPY", sessionClosed: false, tapeWireBlocked: true },
    );
    expect(headline).not.toMatch(/resume when the session opens/i);
    expect(headline).toMatch(/wire problem, not a clock one/i);
  });

  it("outranks the crypto branch and the unnamed-symbol fallback", () => {
    for (const symbol of ["BTC", null]) {
      const { headline } = selectOrderFlowStanding({}, { symbol, tapeWireBlocked: true });
      expect(headline).toMatch(/wire problem, not a clock one/i);
      expect(headline).not.toMatch(/around the clock|market hours/i);
    }
  });

  it("changes NOTHING when the block is not established", () => {
    // The one-sided contract: null/absent must reproduce the shipped sentence
    // byte for byte, so this fact can only ever sharpen and never introduce.
    for (const sessionClosed of [false, null] as const) {
      const base = selectOrderFlowStanding({}, { symbol: "SPY", sessionClosed });
      expect(selectOrderFlowStanding({}, { symbol: "SPY", sessionClosed, tapeWireBlocked: null })).toEqual(base);
    }
  });

  it("stays silent about the wire once a reading actually measured something", () => {
    // A blocked wire cannot manufacture a NO TAPE verdict over real readings.
    const standing = selectOrderFlowStanding(
      { absorption: absorb("ABSORBED", "SELLERS") },
      { symbol: "SPY", tapeWireBlocked: true },
    );
    expect(standing.verdict).not.toBe("NO TAPE");
    expect(standing.headline).not.toMatch(/wire problem/i);
  });
});
