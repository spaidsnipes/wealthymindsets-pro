/**
 * THE CHANGE SLOT, AND THE ONE LIE IT MUST NEVER TELL.
 *
 * The defect measured live (/charts TSLA 15m, 2026-09-17T02:53Z) was a cell
 * reading "— (change unavailable)" three words from a number the same header
 * had just derived from 400 loaded candles. The repair is NOT "show a change".
 * It is "show the change the bars can prove, and say which change it is".
 *
 * So the load-bearing tests here are the NEGATIVE ones. A suite that only
 * checked "a number appears" would pass just as well after someone dropped the
 * scope label — which is the exact change that would turn this fix into a
 * fabricated session change on the primary trading surface.
 */
import { describe, expect, it } from "vitest";

import { chartHeaderChangeFact } from "./chartHeaderChangeFact";
import { deriveBarOverBarChange, type BarCloseCandidate } from "./deriveLastBarClose";
import { CHANGE_UNAVAILABLE_TEXT, CHANGE_UNAVAILABLE_TITLE } from "./changeAbsence";

/** Bar times are SECONDS (the lightweight-charts convention). */
const S = 1000;
/** 15m bars opening at :00, :15, :30. */
const T0 = 1_700_000_000;
const BARS: readonly BarCloseCandidate[] = [
  { time: T0, close: 100 },
  { time: T0 + 900, close: 110 },
  { time: T0 + 1800, close: 121 },
];
/** Well past the last bar's close, so PROOF 2 names the newest bar. */
const NOW = (T0 + 1800) * S + 900 * S + 1;

describe("deriveBarOverBarChange — two provably closed bars, or nothing", () => {
  it("measures the newest closed bar against the one immediately before it", () => {
    const d = deriveBarOverBarChange(BARS, "15m", NOW);
    expect(d).not.toBeNull();
    expect(d!.close).toBe(121);
    expect(d!.referenceClose).toBe(110);
    expect(d!.chg).toBeCloseTo(11, 10);
    expect(d!.pct).toBeCloseTo(10, 10);
    expect(d!.timeframe).toBe("15m");
  });

  it("DELEGATES the closed-bar proof — a forming bar shifts BOTH endpoints", () => {
    // The whole reason this function calls deriveLastBarClose instead of
    // ranking bars itself. With the clock inside the newest bar's interval,
    // PROOF 2 fails, the runner-up becomes the endpoint, and the reference
    // must move back with it. A second owner of the proof would have left the
    // reference where it was and reported a delta across a bar that never
    // closed.
    const d = deriveBarOverBarChange(BARS, "15m", (T0 + 1800) * S + 1);
    expect(d!.close).toBe(110);
    expect(d!.referenceClose).toBe(100);
  });

  it("returns null with only one bar — one close is not a change", () => {
    expect(deriveBarOverBarChange([{ time: T0, close: 100 }], "15m", NOW)).toBeNull();
  });

  it("returns null with no bars, no timeframe, or no bar that has closed", () => {
    expect(deriveBarOverBarChange([], "15m", NOW)).toBeNull();
    expect(deriveBarOverBarChange(BARS, "", NOW)).toBeNull();
    expect(deriveBarOverBarChange(null, "15m", NOW)).toBeNull();
  });

  it("does not assume the array is sorted", () => {
    const shuffled = [BARS[2], BARS[0], BARS[1]];
    expect(deriveBarOverBarChange(shuffled, "15m", NOW)).toEqual(
      deriveBarOverBarChange(BARS, "15m", NOW),
    );
  });

  it("skips unusable bars rather than dividing by one", () => {
    // A zero close between the two real bars must not become the reference.
    const withJunk = [
      { time: T0, close: 100 },
      { time: T0 + 450, close: 0 },
      { time: T0 + 900, close: 110 },
      { time: T0 + 1800, close: 121 },
    ];
    expect(deriveBarOverBarChange(withJunk, "15m", NOW)!.referenceClose).toBe(110);
  });

  it("reports a genuinely flat pair as zero — not as an absence", () => {
    const flat = [
      { time: T0 + 900, close: 110 },
      { time: T0 + 1800, close: 110 },
    ];
    const d = deriveBarOverBarChange(flat, "15m", NOW);
    expect(d!.chg).toBe(0);
    expect(d!.pct).toBe(0);
  });
});

describe("chartHeaderChangeFact — the scope is printed, never assumed", () => {
  const BOB = deriveBarOverBarChange(BARS, "15m", NOW)!;

  it("a provider session change wins the slot and is named as one", () => {
    const f = chartHeaderChangeFact({ chg: -2.5, pct: -0.7 }, BOB);
    expect(f.kind).toBe("SESSION_CHANGE");
    expect(f.text).toBe("-2.50 (-0.70%)");
    expect(f.direction).toBe(-1);
  });

  it("THE LOAD-BEARING ASSERTION — a bar delta always carries its scope", () => {
    // Drop "vs prior 15m bar" and this cell becomes a fabricated session
    // change on the primary trading surface. Everything else in this file is
    // secondary to this line.
    const f = chartHeaderChangeFact(null, BOB);
    expect(f.kind).toBe("BAR_OVER_BAR");
    expect(f.text).toBe("+11.00 (+10.00%) vs prior 15m bar");
    expect(f.text).toContain("vs prior 15m bar");
  });

  it("the reason says outright that it is NOT the session change", () => {
    const f = chartHeaderChangeFact(null, BOB);
    expect(f.reason).toContain("IT IS NOT THE SESSION CHANGE");
    // And it still leads with the original sentence, so the quote provider's
    // absence is disclosed rather than papered over by the bar reading.
    expect(f.reason).toContain(CHANGE_UNAVAILABLE_TITLE);
  });

  it("names its two bars, so the figure can be checked against the chart", () => {
    const f = chartHeaderChangeFact(null, BOB);
    expect(f.reason).toContain("121.00");
    expect(f.reason).toContain("110.00");
  });

  it("with neither channel it keeps the EXISTING sentence verbatim", () => {
    const f = chartHeaderChangeFact(null, null);
    expect(f.kind).toBe("NONE");
    expect(f.measured).toBe(false);
    expect(f.direction).toBeNull();
    // Not a newly-composed wording — a second sentence for one absence is the
    // vacuous agreement `changeAbsence` exists to prevent.
    expect(f.text).toBe(CHANGE_UNAVAILABLE_TEXT);
  });

  it("a real sub-cent move is never formatted into a flat bar", () => {
    // The formatter must not manufacture an observation the data does not
    // support. At a fixed 2dp this printed "+0.00" — a flat bar that did not
    // happen, invented by the rendering rather than the feed.
    const f = chartHeaderChangeFact({ chg: 0.0004, pct: 0.00012 }, null);
    expect(f.text).not.toContain("+0.00 ");
    // The widening stops the MOMENT the digits stop saying zero — it is not a
    // request for full precision. 0.00012 at 4dp is "0.0001": rounded, which is
    // what a formatter is for, and NOT flat, which is what it must never
    // invent. Pinned as a literal so a future "just use toPrecision" cannot
    // quietly turn either half of that back into "+0.00".
    expect(f.text).toBe("+0.0004 (+0.0001%)");
  });

  it("an exactly-zero change still prints at two decimals", () => {
    // The widening applies to values that ARE nonzero. A genuine flat must not
    // grow spurious precision it never claimed.
    expect(chartHeaderChangeFact({ chg: 0, pct: 0 }, null).text).toBe("+0.00 (+0.00%)");
  });

  it("never calls an exactly-zero change 'up'", () => {
    expect(chartHeaderChangeFact({ chg: 0, pct: 0 }, null).direction).toBe(0);
    const flat = deriveBarOverBarChange(
      [{ time: T0 + 900, close: 110 }, { time: T0 + 1800, close: 110 }],
      "15m",
      NOW,
    );
    expect(chartHeaderChangeFact(null, flat).direction).toBe(0);
  });

  it("ANTI-OVERCORRECTION — bars never displace a real session change", () => {
    // The mirror of the defect. If this ever flipped, /charts would print a
    // 15-minute delta in place of a session change the provider supplied.
    for (const pct of [-5, 0, 5]) {
      expect(chartHeaderChangeFact({ chg: pct, pct }, BOB).kind).toBe("SESSION_CHANGE");
    }
  });

  it("refuses a non-finite session change rather than printing NaN", () => {
    expect(chartHeaderChangeFact({ chg: NaN, pct: 1 }, null).kind).toBe("NONE");
    expect(chartHeaderChangeFact({ chg: 1, pct: Infinity }, null).kind).toBe("NONE");
  });

  it("falls back to the bars when the session change is unusable", () => {
    // An unusable session figure is not a reason to also withhold the bar
    // reading — that would be the original defect reached by a new route.
    expect(chartHeaderChangeFact({ chg: NaN, pct: NaN }, BOB).kind).toBe("BAR_OVER_BAR");
  });
});
