/**
 * SESSION-ANCHORED VWAP — serving, 2026-09-26 04:38 CDT.
 *
 * /charts?symbol=TSLA&tf=15m drew VWAP as ONE cumulative line over a week of
 * 15m bars (IND.vwap accumulated from the first loaded bar). The menu says
 * VWAP "resets at the start of each session". `sessionVwap` resets on the ONE
 * session owner, `sessionWindowFor` / `sessionKeyOf`, and these tests pin
 * that it does — per class, with its bands, and without inventing a value
 * where no volume traded.
 */
import { describe, expect, it } from "vitest";
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";
import { sessionKeyOf, sessionWindowFor } from "@/lib/marketData/sessionWindow";
import { sessionVwap, vwap, VWAP_DAILY_WITHHELD_REASON } from "./indicators";

/** Unix seconds for an America/New_York wall clock in EDT (UTC−4), Sept 2026. */
const et = (day: number, hh: number, mm = 0) => Date.UTC(2026, 8, day, hh + 4, mm) / 1000;
const bar = (time: number, tp: number, volume: number, spread = 1): LegacyOhlcvTuple =>
  ({ time, open: tp, high: tp + spread, low: tp - spread, close: tp, volume });
const tpOf = (b: LegacyOhlcvTuple) => (b.high + b.low + b.close) / 3;

/** Plain VWAP over a slice — the reference each session must equal. */
const refVwap = (bs: LegacyOhlcvTuple[]) => {
  const v = bs.reduce((a, b) => a + b.volume, 0);
  return bs.reduce((a, b) => a + tpOf(b) * b.volume, 0) / v;
};

describe("sessionVwap — equities reset at the RTH open", () => {
  // Mon 21 Sep and Tue 22 Sep 2026, 15m bars, RTH only (what the RTH chart holds).
  const day1 = [bar(et(21, 9, 30), 100, 1000), bar(et(21, 9, 45), 102, 3000), bar(et(21, 15, 45), 104, 2000)];
  const day2 = [bar(et(22, 9, 30), 120, 500), bar(et(22, 9, 45), 118, 1500)];
  const bars = [...day1, ...day2];
  const win = sessionWindowFor("TSLA", "15m", false);
  const out = sessionVwap(bars, win)!;

  it("names the session it anchored to", () => {
    expect(win.kind).toBe("US_EQUITY_RTH");
    expect(out.label).toBe(win.label);
  });

  it("each session's VWAP equals the VWAP of that session's bars alone", () => {
    expect(out.vwap[2]).toBeCloseTo(refVwap(day1), 10);
    expect(out.vwap[3]).toBeCloseTo(tpOf(day2[0]), 10); // first bar of day 2 = its own tp
    expect(out.vwap[4]).toBeCloseTo(refVwap(day2), 10);
  });

  it("MUTATION GUARD: a cumulative (never-resetting) VWAP gives a different day-2 value", () => {
    expect(Math.abs(vwap(bars)[4] - out.vwap[4])).toBeGreaterThan(1);
  });

  it("breaks the line between sessions, and only there", () => {
    expect(out.breakAfter).toEqual([false, false, true, false, false]);
  });

  it("a pre-market bar on an RTH window belongs to no session → NaN; ETH admits it", () => {
    const pre = [bar(et(22, 8, 0), 90, 700), ...day2];
    expect(Number.isNaN(sessionVwap(pre, win)!.vwap[0])).toBe(true);
    expect(sessionVwap(pre, win)!.vwap[1]).toBeCloseTo(tpOf(day2[0]), 10);
    const eth = sessionVwap(pre, sessionWindowFor("TSLA", "15m", true))!;
    expect(eth.vwap[0]).toBeCloseTo(90, 10);
    expect(eth.vwap[2]).toBeCloseTo(refVwap(pre), 10); // ETH: pre-market is in the session
  });
});

describe("sessionVwap — a 24/7 market resets at the owner's day boundary", () => {
  it("crypto resets where sessionKeyOf changes day, not mid-day", () => {
    const win = sessionWindowFor("BTCUSD", "15m", false);
    expect(win.kind).toBe("CONTINUOUS_ET_DAY");
    // 23:30 and 23:45 ET on the 21st, then 00:00 and 00:15 ET on the 22nd.
    const bars = [bar(et(21, 23, 30), 100, 10), bar(et(21, 23, 45), 110, 30), bar(et(22, 0, 0), 200, 5), bar(et(22, 0, 15), 210, 5)];
    expect(sessionKeyOf(bars[1].time, win)).not.toBe(sessionKeyOf(bars[2].time, win));
    const out = sessionVwap(bars, win)!;
    expect(out.vwap[1]).toBeCloseTo(refVwap(bars.slice(0, 2)), 10);
    expect(out.vwap[2]).toBeCloseTo(tpOf(bars[2]), 10);
    expect(out.vwap[3]).toBeCloseTo(205, 10);
    expect(out.breakAfter).toEqual([false, true, false, false]);
  });

  it("does NOT reset inside one owner day (a 20:00 ET / 00:00 UTC bar continues)", () => {
    const win = sessionWindowFor("BTCUSD", "15m", false);
    const bars = [bar(et(21, 19, 45), 100, 10), bar(et(21, 20, 0), 200, 10)];
    expect(sessionKeyOf(bars[0].time, win)).toBe(sessionKeyOf(bars[1].time, win));
    expect(sessionVwap(bars, win)!.vwap[1]).toBeCloseTo(150, 10);
  });
});

describe("sessionVwap — futures follow the Globex day", () => {
  it("resets at 18:00 ET; the maintenance hour belongs to no session", () => {
    const win = sessionWindowFor("ES1!", "15m", false);
    expect(win.kind).toBe("GLOBEX_DAY");
    const bars = [bar(et(21, 16, 45), 100, 10), bar(et(21, 17, 15), 999, 10), bar(et(21, 18, 0), 200, 10)];
    const out = sessionVwap(bars, win)!;
    expect(out.vwap[0]).toBeCloseTo(100, 10);
    expect(Number.isNaN(out.vwap[1])).toBe(true);
    expect(out.vwap[2]).toBeCloseTo(200, 10);
    expect(out.breakAfter[0]).toBe(true); // next DRAWN point is the new session
  });
});

describe("sessionVwap — σ bands reset with the session", () => {
  const win = sessionWindowFor("TSLA", "15m", false);
  const bars = [bar(et(21, 9, 30), 100, 100), bar(et(21, 9, 45), 110, 100), bar(et(22, 9, 30), 50, 100), bar(et(22, 9, 45), 52, 300)];
  const out = sessionVwap(bars, win)!;

  it("σ is the volume-weighted SD of typical price about the session VWAP", () => {
    expect(out.sigma[0]).toBe(0);
    expect(out.sigma[1]).toBeCloseTo(5, 10);       // tps 100,110 equal weight → σ 5
    // day 2: tps 50 (w100), 52 (w300): mean 51.5, var = (100·2.25 + 300·0.25)/400 = 0.75
    expect(out.sigma[3]).toBeCloseTo(Math.sqrt(0.75), 10);
  });

  it("the first bar of a new session has zero-width bands (MUTATION: a carried σ would be 5)", () => {
    expect(out.sigma[2]).toBe(0);
  });
});

describe("sessionVwap — volume-zero bars", () => {
  const win = sessionWindowFor("TSLA", "15m", false);

  it("no volume yet in the session → NaN, never the typical price", () => {
    const bars = [bar(et(21, 9, 30), 100, 0), bar(et(21, 9, 45), 104, 50)];
    const out = sessionVwap(bars, win)!;
    expect(Number.isNaN(out.vwap[0])).toBe(true);
    expect(Number.isNaN(out.sigma[0])).toBe(true);
    expect(out.vwap[1]).toBeCloseTo(104, 10);
  });

  it("a zero-volume bar mid-session carries the running VWAP", () => {
    const bars = [bar(et(21, 9, 30), 100, 50), bar(et(21, 9, 45), 500, 0), bar(et(21, 10, 0), 102, 50)];
    const out = sessionVwap(bars, win)!;
    expect(out.vwap[1]).toBeCloseTo(100, 10);
    expect(out.vwap[2]).toBeCloseTo(101, 10);
  });

  it("a session with no volume at all draws nothing (and a volumeless feed draws no VWAP)", () => {
    const bars = [bar(et(21, 9, 30), 100, 0), bar(et(21, 9, 45), 101, 0)];
    expect(sessionVwap(bars, win)!.vwap.every(v => Number.isNaN(v))).toBe(true);
  });

  it("a volumeless session between two traded ones still breaks the line", () => {
    const bars = [bar(et(21, 9, 30), 100, 10), bar(et(22, 9, 30), 101, 0), bar(et(23, 9, 30), 102, 10)];
    expect(sessionVwap(bars, win)!.breakAfter).toEqual([true, false, false]);
  });
});

describe("sessionVwap — daily and longer", () => {
  it("returns null (withheld with a named reason): each bar is already a session", () => {
    const win = sessionWindowFor("TSLA", "1D", false);
    expect(win.kind).toBe("DAILY_WINDOW");
    expect(sessionVwap([bar(et(21, 0), 100, 10)], win)).toBeNull();
    expect(VWAP_DAILY_WITHHELD_REASON).toMatch(/withheld/i);
  });
});
