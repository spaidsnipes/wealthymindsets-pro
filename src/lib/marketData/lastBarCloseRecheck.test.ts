/**
 * THE STALE TRUTH THAT NEEDED NO BUG TO APPEAR.
 *
 * `deriveLastBarClose` is pure and correct. Its second proof — "the newest
 * bar's open + one interval <= now" — is nonetheless NOT time-invariant: it
 * flips from false to true because the CLOCK ADVANCED, with no change to the
 * bars and no change to the timeframe.
 *
 * So a React caller that recomputes only when its INPUTS change will keep
 * publishing the runner-up bar for up to one whole interval after the newest
 * bar has provably closed. Nothing failed. Nothing threw. The screen simply
 * told the trader an older truth than the one it could prove.
 *
 * MEASURED LIVE on production /charts, 2026-09-15T18:23:39Z, TSLA 15m, both
 * numbers taken in ONE DOM read so neither can be blamed on read skew:
 *
 *   OHLCV strip    :  C 357.87   tooltip "this bar's interval has fully
 *                                elapsed … It will not change."
 *   decision spine :  357.47 LAST 15m BAR CLOSE   ·  asOf 18:14:00Z
 *
 * Two prices, one page, one instrument, one moment, both wearing the word
 * "close". Canon Weakness #1 — multi-price disagreement on one page. Each
 * owner was internally honest; 357.47 really WAS the last provably closed bar
 * as of 18:14. The defect is that 18:14 was nine minutes ago and nothing was
 * ever going to ask again.
 *
 * ── WHY THE FIX IS A RE-ASK AND NOT A RELAXATION ──────────────────────
 * The tempting "fix" is to let the deriver name the newest bar. That trades a
 * one-bar understatement for a published close that never happened — §35
 * PROTECTED TRUTH forbids it, and `deriveLastBarClose`'s own header argues the
 * point at length. The conservatism stays. What changes is WHEN the question
 * is asked: exactly once, at the instant its answer can change by itself.
 *
 * ── WHY A UNIT GATE CAN HOLD THIS ─────────────────────────────────────
 * `tsc --noEmit` is blind: a missing dependency in a `useEffect` array is
 * well-typed. The old behaviour also renders perfectly on a busy tape, because
 * an unrelated tick re-runs the effect within a second and hides the staleness
 * — it is only visible when the tape goes quiet, which is precisely when no
 * fixture would be looking. The scheduling arithmetic has to be pinned pure.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { deriveLastBarClose, lastBarCloseRecheckAtMs } from "./deriveLastBarClose";
import type { OHLCVBar } from "../pine/types";

/** `OHLCVBar.time` is SECONDS — the lightweight-charts convention. */
const bar = (timeSec: number, close: number): OHLCVBar => ({
  time: timeSec,
  open: close,
  high: close,
  low: close,
  close,
  volume: 100,
});

const MIN = 60_000;
/** 2026-09-15T17:45:00Z and 18:00:00Z, in seconds — the measured bars. */
const T1745 = Date.UTC(2026, 8, 15, 17, 45, 0) / 1000;
const T1800 = Date.UTC(2026, 8, 15, 18, 0, 0) / 1000;
const BARS = [bar(T1745, 357.47), bar(T1800, 357.87)];

describe("lastBarCloseRecheckAtMs — re-ask the clock-dependent proof", () => {
  it("REPRODUCES THE LIVE DEFECT: same bars, same timeframe, answer changes with the clock alone", () => {
    // This is the whole atom in four lines. Nothing about the evidence changed
    // between these two calls — only `now`.
    const at1814 = Date.UTC(2026, 8, 15, 18, 14, 0);
    const at1823 = Date.UTC(2026, 8, 15, 18, 23, 39);

    expect(deriveLastBarClose(BARS, "15m", at1814)?.close).toBe(357.47);
    expect(deriveLastBarClose(BARS, "15m", at1823)?.close).toBe(357.87);
  });

  it("names the exact instant the answer flips — the newest bar's own close", () => {
    const at1814 = Date.UTC(2026, 8, 15, 18, 14, 0);
    const flipAt = lastBarCloseRecheckAtMs(BARS, "15m", at1814);
    expect(flipAt).toBe(Date.UTC(2026, 8, 15, 18, 15, 0));

    // And it is a REAL flip point, not an arbitrary timestamp: one ms before,
    // the deriver still says 357.47; at the instant itself, 357.87.
    expect(deriveLastBarClose(BARS, "15m", flipAt! - 1)?.close).toBe(357.47);
    expect(deriveLastBarClose(BARS, "15m", flipAt!)?.close).toBe(357.87);
  });

  it("returns null once the newest bar has closed — this schedules no poll", () => {
    // NOT A POLLER. After the flip, only a NEW BAR can change the answer, and
    // a new bar is an input change the caller already reacts to. If this
    // returned a timestamp here, the caller would re-arm forever and republish
    // canonical state on a treadmill.
    const after = Date.UTC(2026, 8, 15, 18, 23, 39);
    expect(lastBarCloseRecheckAtMs(BARS, "15m", after)).toBeNull();
    // Exactly at the boundary the deriver already says "closed" (inclusive
    // `<=`), so there is nothing left to wait for.
    expect(lastBarCloseRecheckAtMs(BARS, "15m", Date.UTC(2026, 8, 15, 18, 15, 0))).toBeNull();
  });

  it("declines rather than guesses whenever the deriver would also decline", () => {
    const now = Date.UTC(2026, 8, 15, 18, 14, 0);
    // No parseable timeframe → the deriver cannot run proof 2 at ANY clock, so
    // waiting can never change its answer. Scheduling a wake-up would be a
    // promise of a change that cannot come.
    expect(lastBarCloseRecheckAtMs(BARS, "not-a-timeframe", now)).toBeNull();
    expect(lastBarCloseRecheckAtMs(BARS, "", now)).toBeNull();
    expect(lastBarCloseRecheckAtMs(BARS, null, now)).toBeNull();
    // No usable clock → same reasoning.
    expect(lastBarCloseRecheckAtMs(BARS, "15m", null)).toBeNull();
    expect(lastBarCloseRecheckAtMs(BARS, "15m", Number.NaN)).toBeNull();
    expect(lastBarCloseRecheckAtMs(BARS, "15m", 0)).toBeNull();
    // No bars → nothing to time.
    expect(lastBarCloseRecheckAtMs([], "15m", now)).toBeNull();
    expect(lastBarCloseRecheckAtMs(null, "15m", now)).toBeNull();
  });

  it("times the NEWEST bar even when the array is unsorted", () => {
    // Shares `rankBars` with the deriver precisely so this cannot drift. A
    // scheduler that timed the LAST ELEMENT would arm against the wrong bar on
    // any provider that returns newest-first.
    const now = Date.UTC(2026, 8, 15, 18, 14, 0);
    const reversed = [...BARS].reverse();
    expect(lastBarCloseRecheckAtMs(reversed, "15m", now)).toBe(
      lastBarCloseRecheckAtMs(BARS, "15m", now),
    );
  });

  it("ignores unusable bars, exactly as the deriver does", () => {
    // A zero-close or zero-time bar is not evidence. If the scheduler counted
    // one as "newest" it would arm against a bar the deriver refuses to see.
    const now = Date.UTC(2026, 8, 15, 18, 14, 0);
    const polluted = [...BARS, bar(T1800 + 900, 0), bar(0, 999)];
    expect(lastBarCloseRecheckAtMs(polluted, "15m", now)).toBe(
      Date.UTC(2026, 8, 15, 18, 15, 0),
    );
  });

  it("scales with the timeframe rather than assuming one", () => {
    const now = Date.UTC(2026, 8, 15, 18, 1, 0);
    expect(lastBarCloseRecheckAtMs([bar(T1800, 1)], "1m", now)).toBeNull();
    expect(lastBarCloseRecheckAtMs([bar(T1800, 1)], "5m", now)).toBe(T1800 * 1000 + 5 * MIN);
    expect(lastBarCloseRecheckAtMs([bar(T1800, 1)], "1h", now)).toBe(T1800 * 1000 + 60 * MIN);
  });
});

describe("the publisher actually re-asks — the wire, not just the arithmetic", () => {
  // VACUITY GUARD + BREADCRUMB. The pure function above can be perfect while
  // nothing calls it; that is exactly how `bars` was once forwarded into this
  // hook and silently dropped (see the header of chartMarketStatePublisher).
  // A pure selector with no consumer is a feature that is built, shipped,
  // deployed and unreachable.
  const SRC = readFileSync(
    resolve(__dirname, "chartMarketStatePublisher.ts"),
    "utf8",
  );

  it("VACUITY GUARD: the scan read the publisher", () => {
    expect(
      SRC.length,
      "chartMarketStatePublisher.ts read back nearly empty — the assertions " +
        "below would pass while policing nothing",
    ).toBeGreaterThan(5_000);
  });

  it("imports and calls the re-ask scheduler", () => {
    expect(SRC).toMatch(/import\s*\{[^}]*lastBarCloseRecheckAtMs[^}]*\}\s*from\s*"\.\/deriveLastBarClose"/);
    expect(SRC).toContain("lastBarCloseRecheckAtMs(bars ?? null, timeframe, Date.now())");
  });

  it("the publishing effect DEPENDS on the recheck nonce", () => {
    // The load-bearing line. Arming a timer that bumps state changes nothing
    // unless the publishing effect lists that state as a dependency — and a
    // missing dependency is well-typed, silent, and invisible on a busy tape.
    expect(
      SRC,
      "the publish effect does not depend on `recheck`; the timer fires, state " +
        "bumps, and canonical state is never republished — the live defect " +
        "measured at 2026-09-15T18:23:39Z returns",
    //
    // ANCHORED ON THE EFFECT, NOT ON ITS NEIGHBOURS. This assertion used to
    // read /connected,\s*bars,\s*recheck\s*\]/ — three adjacent names. On
    // 2026-09-18 a legitimate new dependency (`barSource`) was inserted
    // between `bars` and `recheck` and this test went red while the property
    // it guards was still perfectly intact. A sentinel that fails on a correct
    // change teaches the next reader to edit the test reflexively, which is
    // exactly how a real failure gets waved through.
    //
    // `[symbol,` is what distinguishes the PUBLISHING effect's array from the
    // timer-arming effect's `[bars, timeframe, recheck]` one directory up, so
    // the anchor is still specific. `[^\]]*` cannot run past the closing
    // bracket, so `recheck` must genuinely be inside THIS array.
    ).toMatch(/\}, \[symbol,[^\]]*\brecheck\s*\]/);
  });

  it("the timer is cleared on re-run — no leaked republish after unmount", () => {
    expect(SRC).toMatch(/const timer = setTimeout\([\s\S]{0,120}?\);\s*return \(\) => clearTimeout\(timer\)/);
  });

  it("still passes the captured clock into the deriver", () => {
    // OVER-CORRECTION GUARD. Re-asking is only meaningful because the deriver
    // receives a clock at all. If a later change drops `capturedAt`, proof 2
    // can never succeed and the re-ask becomes ceremony.
    expect(SRC).toContain(
      "deriveLastBarClose(input.bars ?? null, input.timeframe, input.capturedAt)",
    );
  });
});
