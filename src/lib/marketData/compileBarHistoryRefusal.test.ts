import { describe, expect, it } from "vitest";

import {
  BAR_HISTORY_REFUSAL_VERSION,
  compileBarHistoryRefusal,
  type VendorAttempt,
} from "./compileBarHistoryRefusal";

/**
 * A THREE-OUTCOME set, because that is what one real symbol produced.
 *
 * Probed on the serving host for BTCUSDT · 5m, 2026-09-20: Alpaca answered 200
 * with an empty candle array, Finnhub refused with the classified edge
 * FORBIDDEN, Yahoo refused with a 404. The fourth lane, Finnhub-direct, is
 * skipped before the wire by this product's own crypto rule. Four doors, four
 * different answers — and the room rendered every one of them as UNKNOWN.
 */
const BTCUSDT_5M: readonly VendorAttempt[] = [
  { vendor: "Alpaca", outcome: "EMPTY" },
  { vendor: "Finnhub", outcome: "REFUSED", edge: "FORBIDDEN" },
  { vendor: "Yahoo", outcome: "REFUSED", edge: "Yahoo HTTP 404" },
  {
    vendor: "Finnhub REST",
    outcome: "NOT_ASKED",
    rule: "this product does not route crypto to its equity vendors.",
  },
];

describe("compileBarHistoryRefusal", () => {
  it("stamps its version so a stale consumer cannot pass silently", () => {
    expect(compileBarHistoryRefusal(BTCUSDT_5M).version).toBe(
      BAR_HISTORY_REFUSAL_VERSION,
    );
  });

  it("keeps the vendor's OWN edge token — the receipt is passed, not paraphrased", () => {
    const vm = compileBarHistoryRefusal(BTCUSDT_5M);
    const finnhub = vm.lines.find(l => l.startsWith("Finnhub"))!;
    // FORBIDDEN is /api/finnhub's classified edge. A summary that lost it
    // would put the trader back where this module found them.
    expect(finnhub).toContain("FORBIDDEN");
    expect(finnhub).toMatch(/refused/i);
  });

  it("says OUT LOUD when OUR rule stopped the request, never the vendor's silence", () => {
    const vm = compileBarHistoryRefusal(BTCUSDT_5M);
    const skipped = vm.lines.find(l => l.startsWith("Finnhub REST"))!;
    expect(skipped).toMatch(/was not asked/i);
    // The reason must be OURS and must be stated. "No data from Finnhub"
    // would be a lie in both halves: it was never asked, and the rule that
    // stopped it is this product's own routing decision.
    expect(skipped).toMatch(/does not route crypto/);
    expect(skipped).not.toMatch(/refused|returned|answered/i);
  });

  it("a skip with NO stated rule is reported as unexplained, not smoothed over", () => {
    // The tempting failure is to invent a plausible rule. That is a guess
    // wearing a reading's clothes — the defect class this module exists for.
    const [only] = compileBarHistoryRefusal([
      { vendor: "Polygon", outcome: "NOT_ASKED" },
    ]).lines;
    expect(only).toMatch(/cannot say which rule/i);
  });

  it("separates an EMPTY answer from a refusal — only one is about the market", () => {
    const vm = compileBarHistoryRefusal([
      { vendor: "Yahoo", outcome: "EMPTY" },
      { vendor: "Finnhub", outcome: "REFUSED", edge: "RATE LIMITED" },
    ]);
    expect(vm.lines[0]).toMatch(/answered and carried no bars/i);
    expect(vm.lines[0]).not.toMatch(/refus/i);
    expect(vm.lines[1]).toContain("RATE LIMITED");
  });

  it("a refusal with no edge token admits the vendor did not say why", () => {
    const [only] = compileBarHistoryRefusal([
      { vendor: "Finnhub", outcome: "REFUSED" },
    ]).lines;
    expect(only).toMatch(/without saying why/i);
  });

  it("counts asked-vs-known and never reaches for a verdict — Build Order §9", () => {
    const vm = compileBarHistoryRefusal(BTCUSDT_5M);
    expect(vm.askedCount).toBe(3);
    expect(vm.attemptCount).toBe(4);
    expect(vm.headline).toContain("3 of 4");
    expect(vm.headline).not.toMatch(/healthy|good|broken|bad|degraded|poor/i);
    // "and none returned bars" — the singular branch must not claim the
    // opposite of what it means.
    expect(vm.headline).not.toMatch(/it returned bars/);
  });

  it("stops explaining the moment a vendor actually served", () => {
    const vm = compileBarHistoryRefusal([
      { vendor: "Alpaca", outcome: "NOT_ASKED", rule: "no futures." },
      { vendor: "Yahoo", outcome: "SERVED" },
    ]);
    expect(vm.served).toBe(true);
    expect(vm.servedBy).toBe("Yahoo");
    expect(vm.headline).toContain("Yahoo");
    expect(vm.headline).not.toMatch(/No bar history/i);
  });

  it("names nothing it was not handed", () => {
    const vm = compileBarHistoryRefusal([]);
    expect(vm.lines).toHaveLength(0);
    expect(vm.attemptCount).toBe(0);
    // A room that has not asked yet must not read as a room that asked and
    // was turned away — that is the FEED UNKNOWN failure in a new costume.
    expect(vm.headline).toMatch(/has been asked|has not been asked|yet/i);
    expect(vm.headline).not.toMatch(/refused/i);
  });

  it("reports every attempt, in the order they were made", () => {
    const vm = compileBarHistoryRefusal(BTCUSDT_5M);
    expect(vm.lines).toHaveLength(4);
    expect(vm.lines[0].startsWith("Alpaca")).toBe(true);
    expect(vm.lines[1].startsWith("Finnhub was")).toBe(true);
    expect(vm.lines[2].startsWith("Yahoo")).toBe(true);
    expect(vm.lines[3].startsWith("Finnhub REST")).toBe(true);
  });

  it("is pure — the same input twice gives the same answer", () => {
    expect(compileBarHistoryRefusal(BTCUSDT_5M)).toEqual(
      compileBarHistoryRefusal(BTCUSDT_5M),
    );
  });
});
