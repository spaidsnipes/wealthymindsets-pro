/**
 * THE TAPE RETENTION CONTRACT.
 *
 * This rule used to be four characters — `, 50` — written inline at the RAF
 * flush, covered by no test, and it silently decided how much evidence every
 * order-flow reading in the product was allowed to have. Nothing in the suite
 * would have caught it changing, in either direction.
 *
 * So the rule is a named function now, and these are its terms:
 *
 *   1. The tape is BOUNDED. An unbounded tape is a session-long leak on the
 *      hottest path in the app.
 *   2. The tape is NEWEST-FIRST. `DOMPanel` reads `slice(0, 3)` expecting the
 *      three most recent prints; `WMSessionVP` takes the first matching trade.
 *      Reverse the order and both read the OLDEST prints instead, with every
 *      type still satisfied and no test failing.
 *   3. The ceiling is LARGE ENOUGH to read a bar. A per-bar, per-price reading
 *      handed 50 prints is being asked about five minutes and given two
 *      seconds — it refuses, correctly, forever.
 */

import { describe, it, expect } from "vitest";

import {
  RECENT_TICK_RETENTION,
  retainRecentTicks,
  type Tick,
} from "@/hooks/useWebSocket";

const tick = (n: number): Tick => ({
  price: 20_000 + n,
  size: 1,
  side: n % 2 === 0 ? "buy" : "sell",
  time: 1_700_000_000_000 + n,
  trade: true,
});

const seq = (count: number, from = 0): Tick[] =>
  Array.from({ length: count }, (_, i) => tick(from + i));

describe("retainRecentTicks — the tape retention contract", () => {
  it("puts the INCOMING prints in front of the ones already held", () => {
    const previous = [tick(1), tick(2)];
    const incoming = [tick(90), tick(91)];

    const kept = retainRecentTicks(incoming, previous);

    expect(
      kept.map(t => t.price),
      "newest-first is load-bearing: DOMPanel slices the head for the three " +
        "most recent prints, so a reversed order feeds it the oldest tape",
    ).toEqual([
      tick(90).price,
      tick(91).price,
      tick(1).price,
      tick(2).price,
    ]);
  });

  it("drops the OLDEST prints when it has to drop something", () => {
    // Full to the ceiling, then one more arrives.
    const previous = seq(RECENT_TICK_RETENTION, 0);
    const incoming = [tick(999_999)];

    const kept = retainRecentTicks(incoming, previous);

    expect(kept).toHaveLength(RECENT_TICK_RETENTION);
    expect(kept[0].price, "the new print must survive").toBe(tick(999_999).price);
    expect(
      kept.at(-1)?.price,
      "the print that fell off must be the oldest one, not an arbitrary one",
    ).toBe(tick(RECENT_TICK_RETENTION - 2).price);
  });

  it("never grows past the ceiling, however large a burst lands at once", () => {
    // A reconnect can replay far more prints in one flush than the ceiling.
    const kept = retainRecentTicks(seq(RECENT_TICK_RETENTION * 3), []);

    expect(
      kept.length,
      "an unbounded tape is a session-long memory leak on the hottest path",
    ).toBe(RECENT_TICK_RETENTION);
  });

  it("stays bounded across many successive flushes", () => {
    let held: Tick[] = [];
    for (let flush = 0; flush < 50; flush++) {
      held = retainRecentTicks(seq(100, flush * 100), held);
    }

    expect(held).toHaveLength(RECENT_TICK_RETENTION);
    expect(
      held[0].price,
      "the head must be the most recent flush, not a stale one",
    ).toBe(tick(49 * 100).price);
  });

  it("holds enough tape for a per-bar reading to have something to read", () => {
    // The whole point of the change. A ceiling in the low tens is why the
    // absorption / imbalance / big-trade / profile readings refused on nearly
    // every bar: they bucket prints BY PRICE WITHIN A BAR, and 50 prints on an
    // active future is roughly the last two seconds.
    expect(
      RECENT_TICK_RETENTION,
      "a per-bar, per-price reading cannot be built on a tape this short",
    ).toBeGreaterThanOrEqual(1000);
  });

  it("keeps the tape bounded to a size a linear consumer pass stays cheap at", () => {
    // Several selectors run a full linear pass over this array per flush.
    expect(
      RECENT_TICK_RETENTION,
      "raising the ceiling without a bound trades one defect for a worse one",
    ).toBeLessThanOrEqual(20_000);
  });

  it("returns a NEW array rather than mutating what it was handed", () => {
    const previous = [tick(1), tick(2)];
    const incoming = [tick(3)];

    const kept = retainRecentTicks(incoming, previous);

    expect(kept).not.toBe(previous);
    expect(
      previous.map(t => t.price),
      "consumers memoise on identity; mutating in place would leave them stale",
    ).toEqual([tick(1).price, tick(2).price]);
  });

  it("handles the empty cases without inventing a print", () => {
    expect(retainRecentTicks([], [])).toEqual([]);
    expect(retainRecentTicks([], [tick(1)]).map(t => t.price)).toEqual([tick(1).price]);
    expect(retainRecentTicks([tick(1)], []).map(t => t.price)).toEqual([tick(1).price]);
  });
});
