/**
 * derivePriceTail — the price book's evidence contract.
 *
 * Every test here corresponds to a REFUSAL named in the module header.
 * A refusal that is documented but not enforced is a comment, and the
 * whole point of this module is that the line it feeds cannot show a
 * price that never traded.
 *
 *   1. NO FORMING BAR. The newest candle's "close" is the seed it was
 *      born with. Drawn as the last point of a price line it publishes a
 *      close that never happened, at the exact pixel the eye lands on.
 *   2. NO SINGLE POINT. One dot is not a book, and a renderer handed one
 *      point may draw a flat segment across the panel — a claim of
 *      stillness the evidence never made.
 *   3. NO CONTRADICTED TIMESTAMP. Two bars claiming one open with
 *      different closes are a data defect. Picking either invents an
 *      ordering the evidence does not support.
 *   4. NO INTERPOLATION. Gaps stay gaps.
 *   5. ONE OWNER OF "WHICH BAR CLOSED". The endpoint is deriveLastBarClose's
 *      answer, not a second copy of that proof.
 */
import { describe, it, expect } from "vitest";
import { derivePriceTail, PRICE_TAIL_MAX_POINTS } from "./derivePriceTail";
import { deriveLastBarClose, type BarCloseCandidate } from "./deriveLastBarClose";

const MIN = 60;
/** Bar opens, in SECONDS — the unit BarCloseCandidate uses. */
const T0 = 1_700_000_000;

/** `n` consecutive 1m bars starting at T0, closing at 100, 101, 102 … */
function bars(n: number, startClose = 100): BarCloseCandidate[] {
  return Array.from({ length: n }, (_, i) => ({
    time: T0 + i * MIN,
    close: startClose + i,
  }));
}

/** A clock far past every bar in `bars(n)`, so PROOF 2 is satisfied. */
function wellAfter(n: number): number {
  return (T0 + n * MIN) * 1000;
}

describe("derivePriceTail — refusals", () => {
  it("returns null rather than a one-point 'line'", () => {
    // Two bars exist, but only ONE can be proven closed, so the tail has
    // a single point and the renderer must be handed nothing at all.
    const out = derivePriceTail(bars(2), "1m", wellAfter(1) + 1);
    expect(out).toBeNull();
  });

  it("returns null when there are no bars at all", () => {
    expect(derivePriceTail([], "1m", wellAfter(5))).toBeNull();
    expect(derivePriceTail(null, "1m", wellAfter(5))).toBeNull();
    expect(derivePriceTail(undefined, "1m", wellAfter(5))).toBeNull();
  });

  it("excludes the forming bar — the tail never ends on an unproven close", () => {
    const input = bars(5);
    // Clock sits INSIDE the last bar's interval, so bar 5 is still forming.
    const out = derivePriceTail(input, "1m", (T0 + 4 * MIN + 30) * 1000);
    expect(out).not.toBeNull();
    const last = out!.points[out!.points.length - 1]!;
    // The forming bar opened at T0 + 4m. The tail must stop before it.
    expect(last.t).toBeLessThan((T0 + 4 * MIN) * 1000);
    expect(out!.points.some((p) => p.c === 104)).toBe(false);
  });

  it("drops BOTH sides of a contradicted timestamp, keeping the rest", () => {
    const input: BarCloseCandidate[] = [
      ...bars(4),
      // A second, disagreeing close for the bar that opened at T0 + 1m.
      { time: T0 + MIN, close: 999 },
    ];
    const out = derivePriceTail(input, "1m", wellAfter(6));
    expect(out).not.toBeNull();
    const times = out!.points.map((p) => p.t);
    expect(times).not.toContain((T0 + MIN) * 1000);
    // 101 and 999 both vanish; the contradiction is not resolved by vote.
    expect(out!.points.some((p) => p.c === 101 || p.c === 999)).toBe(false);
    // The surrounding evidence still renders.
    expect(out!.points.some((p) => p.c === 100)).toBe(true);
    expect(out!.points.some((p) => p.c === 102)).toBe(true);
  });

  it("a third sighting cannot revive a contradicted timestamp", () => {
    const input: BarCloseCandidate[] = [
      ...bars(4),
      { time: T0 + MIN, close: 999 },
      // Agreeing with the original — still not enough. 2-vs-1 is a vote,
      // and a vote is not evidence about which print was real.
      { time: T0 + MIN, close: 101 },
    ];
    const out = derivePriceTail(input, "1m", wellAfter(6));
    expect(out!.points.some((p) => p.t === (T0 + MIN) * 1000)).toBe(false);
  });

  it("discards non-finite and non-positive closes and times", () => {
    const input = [
      ...bars(4),
      { time: T0 + 10 * MIN, close: Number.NaN },
      { time: T0 + 11 * MIN, close: 0 },
      { time: T0 + 12 * MIN, close: -5 },
      { time: Number.NaN, close: 500 },
      { time: -1, close: 500 },
    ] as BarCloseCandidate[];
    const out = derivePriceTail(input, "1m", wellAfter(20));
    expect(out).not.toBeNull();
    expect(out!.points.every((p) => Number.isFinite(p.c) && p.c > 0)).toBe(true);
    expect(out!.points.every((p) => Number.isFinite(p.t) && p.t > 0)).toBe(true);
    expect(out!.points.some((p) => p.c === 500)).toBe(false);
  });
});

describe("derivePriceTail — shape guarantees", () => {
  it("emits milliseconds, not the seconds it was given", () => {
    const out = derivePriceTail(bars(5), "1m", wellAfter(6));
    expect(out!.points[0]!.t).toBe(T0 * 1000);
  });

  it("is sorted ascending even when the input is shuffled", () => {
    const shuffled = [...bars(8)].reverse();
    const out = derivePriceTail(shuffled, "1m", wellAfter(10));
    expect(out).not.toBeNull();
    for (let i = 1; i < out!.points.length; i++) {
      expect(out!.points[i]!.t).toBeGreaterThan(out!.points[i - 1]!.t);
    }
  });

  it("does not interpolate across a gap — a hole stays a hole", () => {
    const input: BarCloseCandidate[] = [
      { time: T0, close: 100 },
      { time: T0 + MIN, close: 101 },
      // 8 minutes with no bar — a halt, or an illiquid instrument.
      { time: T0 + 10 * MIN, close: 110 },
      { time: T0 + 11 * MIN, close: 111 },
    ];
    const out = derivePriceTail(input, "1m", wellAfter(20));
    // Four bars in, four points out. Nothing was manufactured to bridge it.
    expect(out!.points).toHaveLength(4);
  });

  it("keeps the NEWEST points when the cap is exceeded", () => {
    const n = PRICE_TAIL_MAX_POINTS + 40;
    const out = derivePriceTail(bars(n), "1m", wellAfter(n + 5));
    expect(out!.points).toHaveLength(PRICE_TAIL_MAX_POINTS);
    // A truncated book must still end at the live edge, where the eye goes.
    const newest = out!.points[out!.points.length - 1]!;
    expect(newest.c).toBe(100 + n - 1);
  });
});

describe("derivePriceTail — single owner of the closed-bar proof", () => {
  it("takes its timeframe from the endpoint's evidence, not the argument", () => {
    const out = derivePriceTail(bars(5), "1m", wellAfter(6));
    expect(out!.timeframe).toBe("1m");
  });

  it("is null exactly when no bar can be proven closed", () => {
    // Clock before the first bar even opened: nothing has closed.
    expect(derivePriceTail(bars(1), "1m", (T0 - 10) * 1000)).toBeNull();
  });

  /**
   * THE SINGLE-OWNER ASSERTION. The tail's last point must be exactly the
   * bar deriveLastBarClose names — not "a bar the clock says is old
   * enough", which is only one of that owner's two proofs.
   *
   * This test was first written asserting the endpoint sat behind the
   * bar containing `nowMs`, and it failed. The code was right and the
   * test was wrong: PROOF 1 (a strictly newer bar exists in the data)
   * closes a bar on the FEED'S OWN evidence, independent of our clock.
   * Had the assertion been "corrected" by loosening it, this file would
   * have quietly become a second, weaker opinion about which bar closed —
   * the exact duplication derivePriceTail exists to avoid.
   */
  it("ends exactly where deriveLastBarClose says it ends", () => {
    const nowMs = (T0 + 3 * MIN + 30) * 1000;
    const out = derivePriceTail(bars(6), "1m", nowMs);
    const endpoint = deriveLastBarClose(bars(6), "1m", nowMs);
    expect(out).not.toBeNull();
    expect(endpoint).not.toBeNull();

    const newest = out!.points[out!.points.length - 1]!;
    expect(newest.t).toBe(endpoint!.barOpenedAtMs);
    expect(newest.c).toBe(endpoint!.close);
    for (const p of out!.points) {
      expect(p.t).toBeLessThanOrEqual(endpoint!.barOpenedAtMs);
    }
  });
});
