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
    // The headline must send the trader somewhere real, not just say "none".
    expect(out.headline.toLowerCase()).toContain("crypto");
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
