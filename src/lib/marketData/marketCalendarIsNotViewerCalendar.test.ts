/**
 * A MARKET'S CALENDAR IS NOT THE VIEWER'S CALENDAR.
 *
 * provenSessionClosure promises, in its own docblock, that it "can retire a
 * false ACTIVE claim and can never manufacture one". It keeps that promise for
 * ACTIVE. It broke it for CLOSED, because the one-sided promise was
 * implemented with a two-sided clock: `at.getDay()` reads the VIEWER's
 * weekday, and every rule it feeds is a statement about the MARKET's weekday.
 *
 *   Friday 19:00 New York = Saturday 01:00 Berlin = Saturday 08:00 Tokyo
 *
 * TSLA post-market runs to 20:00 ET, so at that instant the session is OPEN.
 * A viewer in Berlin or Tokyo was told PROVEN CLOSED — and the chart badge
 * read "SESSION CLOSED — LAST VERIFIED" while the tape was still printing.
 *
 * WHY THIS WENT UNSEEN FOR SO LONG, and why the cases below are chosen the way
 * they are: in New York the two calendars agree, and in CI they are both UTC,
 * where Friday 23:00Z is still Friday. There is no process timezone in which a
 * `getDay()` implementation passes every assertion here — each case pins the
 * answer for a UTC INSTANT, which is a property of the market and the moment
 * and of nothing else. That is the whole point of the fix.
 */

import { describe, it, expect } from "vitest";
import { provenSessionClosure, marketWeekdayET } from "./canonicalIdentity";

/** ET is UTC-4 in September (EDT). Spelled out so each instant is checkable. */
const FRI_1900_ET = new Date("2026-09-11T23:00:00Z"); // post-market OPEN until 20:00 ET
const FRI_2330_ET = new Date("2026-09-12T03:30:00Z"); // Saturday in UTC; Friday night in ET
const SAT_1000_ET = new Date("2026-09-12T14:00:00Z"); // unambiguously the weekend
const SAT_2300_ET = new Date("2026-09-13T03:00:00Z"); // Sunday in UTC AND in Europe; Saturday in ET
const SUN_1200_ET = new Date("2026-09-13T16:00:00Z"); // US cash closed; futures/FX not yet reopened
const MON_1000_ET = new Date("2026-09-14T14:00:00Z"); // regular hours

describe("× A MARKET'S CALENDAR IS NOT THE VIEWER'S CALENDAR", () => {
  it("does not claim closure during Friday's real post-market", () => {
    // THE DEFECT. In Berlin (+6h) and Tokyo (+13h) this instant falls on a
    // Saturday, and the old rule answered `false` — PROVEN CLOSED — about a
    // session that was still trading.
    expect(provenSessionClosure("TSLA", FRI_1900_ET),
      "a European or Asian viewer is told Friday's post-market is closed").toBeNull();
  });

  it("recognises Friday night ET even though UTC has already rolled to Saturday", () => {
    // The mirror image: the answer must not flip merely because the SERVER's
    // clock crossed midnight. 23:30 ET Friday is after the 20:00 post-market
    // close, but this helper holds no intraday calendar — so the honest answer
    // is "not established", not a weekend closure it inferred from UTC.
    expect(marketWeekdayET(FRI_2330_ET)).toBe(5);
    // Since 2026-09-26 the ET clock also carries the HOUR: 23:30 ET Friday is
    // after US post-market ended at 20:00 ET, so closure is proven — from the
    // market's Friday-night hour, never from UTC's Saturday (19:00 ET, same
    // UTC-Saturday shape, stays unproven in the test above).
    expect(provenSessionClosure("TSLA", FRI_2330_ET)).toBe(false);
  });

  it("still proves the weekend it was written to prove", () => {
    // Non-vacuity in the load-bearing direction. If the fix had merely made
    // the function timid, every assertion above would pass and the helper
    // would have stopped doing its job — no badge would ever say CLOSED again.
    expect(provenSessionClosure("TSLA", SAT_1000_ET)).toBe(false);
    expect(provenSessionClosure("SPY", SAT_1000_ET)).toBe(false);
    expect(provenSessionClosure("NQ1!", SAT_1000_ET)).toBe(false);
    expect(provenSessionClosure("EUR/USD", SAT_1000_ET)).toBe(false);
  });

  it("proves Saturday-evening ET closure that Europe was reporting as Sunday", () => {
    // 03:00Z is Sunday in UTC and in Berlin. For an equity the old code landed
    // on the Sunday rule and produced the right answer for the wrong reason;
    // for FUTURES the Sunday rule deliberately does NOT apply — futures reopen
    // Sunday evening — so the old code returned null and the badge went quiet
    // about a market that was provably shut.
    expect(marketWeekdayET(SAT_2300_ET)).toBe(6);
    expect(provenSessionClosure("NQ1!", SAT_2300_ET)).toBe(false);
  });

  it("keeps the asymmetry between US cash and futures on Sunday", () => {
    expect(provenSessionClosure("TSLA", SUN_1200_ET)).toBe(false);
    // Noon is before any Sunday reopen, so futures are provably shut too…
    expect(provenSessionClosure("NQ1!", SUN_1200_ET)).toBe(false);
    // …and after Globex reopens the asymmetry is exactly the old one.
    const SUN_1900_ET = new Date("2026-09-13T23:00:00Z");
    expect(provenSessionClosure("TSLA", SUN_1900_ET)).toBe(false);
    expect(provenSessionClosure("NQ1!", SUN_1900_ET),
      "futures reopen Sunday evening — claiming closure after the reopen is the same overreach").toBeNull();
  });

  it("never claims closure for a continuous market", () => {
    for (const at of [SAT_1000_ET, SUN_1200_ET, MON_1000_ET]) {
      expect(provenSessionClosure("BTC", at)).toBeNull();
    }
  });

  it("establishes nothing on a weekday", () => {
    expect(provenSessionClosure("TSLA", MON_1000_ET)).toBeNull();
  });

  it("returns null rather than the viewer's weekday when the clock is unreadable", () => {
    // A fallback to local time would reinstate the defect under the name
    // "graceful degradation". Nothing proven is the only safe answer, because
    // every caller treats a number here as PROOF.
    expect(marketWeekdayET(new Date(NaN))).toBeNull();
    expect(provenSessionClosure("TSLA", new Date(NaN))).toBeNull();
  });

  it("agrees with ET for a full week of noon instants", () => {
    // Breadth, so the mapping is pinned rather than spot-checked: Sunday
    // 2026-09-13 through Saturday 2026-09-19, each at 16:00Z = 12:00 ET.
    const expected = [0, 1, 2, 3, 4, 5, 6];
    expected.forEach((weekday, i) => {
      const at = new Date(Date.UTC(2026, 8, 13 + i, 16, 0, 0));
      expect(marketWeekdayET(at), at.toISOString()).toBe(weekday);
    });
  });
});
