/**
 * SESSION WINDOW — which bars are "the session" for the Session Profile.
 *
 * Garden Pass 12, H-601 SESSION PROFILE: "Must clip to an actual session
 * definition. No arbitrary visual crop."
 *
 * Before this owner the chart cut every non-equity at ET MIDNIGHT. That is not
 * a session anywhere it was applied:
 *   - a CME Globex day opens at 18:00 ET the evening before, so midnight split
 *     every futures session in two and profiled its back half as "the session";
 *   - the FX day rolls at 17:00 ET (the New York close), not at midnight;
 *   - US equities were cut to RTH even when the chart itself showed the
 *     extended session (the Extended Hours switch was in the cache key and in
 *     nothing else).
 *
 * Each class now gets the definition its market actually uses, and the
 * definition is NAMED (`label`) so the glass can say which one it drew:
 *
 *   EQUITY / INDEX   RTH 09:30–16:00 ET, or ETH 04:00–20:00 ET when the chart
 *                    shows extended hours; one ET trading date per session.
 *   FUTURES          CME Globex day 18:00 ET → 17:00 ET; the 17:00–18:00 ET
 *                    maintenance hour belongs to no session. Except the CBOT
 *                    grains and CME livestock, which keep their own published
 *                    hours (see CBOT_GRAIN_ROOTS below).
 *   FOREX            the FX day, rolling at 17:00 ET.
 *   CRYPTO/UNKNOWN   the venue has NO session (canonicalBar SESSION_CONTINUOUS);
 *                    the chart's day is the ET calendar day, and the label says
 *                    that is the chart's day, not the venue's session.
 *   daily and longer each bar already IS a session, so the "session" is a
 *                    short window of the latest bars, and is named a window.
 *
 * ── THE OTHER SESSION RULE IN THE FAMILY, NAMED ────────────────────────────
 *
 * `viewModels/sessionsByGap` is the profile family's EMPIRICAL splitter
 * (developing value, Profile Memory, Composite): a long gap starts a session,
 * and a 24/7 feed is one session, so those readings refuse rather than cut at
 * a clock. This owner is the DEFINED clock the Session Profile needs — the
 * Founder required a Session VP on continuous markets (2026-08-09), and a
 * Globex or FX day is a published definition, not a gap. On clean sessioned
 * data the two agree (the Globex maintenance hour and the equity overnight
 * ARE the gaps). They can disagree where a feed fills those gaps; the named
 * follow-up is for sessionsByGap to consult this owner for sessioned classes.
 *
 * PURE. DETERMINISTIC. America/New_York via Intl (DST-correct).
 */

import { classifySymbol, futuresRootOf } from "./symbolAssetClass";
import { getTimeframe, normalizeTFId, type TFId } from "@/lib/timeframes";

export type SessionWindowKind =
  | "US_EQUITY_RTH"
  | "US_EQUITY_ETH"
  | "GLOBEX_DAY"
  | "CBOT_GRAINS_DAY"
  | "CME_LIVESTOCK_DAY"
  | "FX_DAY"
  | "CONTINUOUS_ET_DAY"
  | "CRYPTO_UTC_DAY"
  | "DAILY_WINDOW"
  | "NO_CLOCK";

/**
 * NOT EVERY FUTURE TRADES THE GLOBEX DAY (added 2026-09-25, GP12 truth pass).
 *
 * Every futures symbol used to get "GLOBEX 18:00–17:00 ET". That is the
 * published day for equity-index, energy, metals, rates and CFE VIX futures.
 * It is NOT the day for the CBOT grains or the CME livestock pits, whose
 * published hours (CT, one hour behind ET all year) are:
 *
 *   grains  (ZC ZW ZS ZM ZL KE)  19:00–07:45 and 08:30–13:20 CT
 *                                = 20:00–08:45 and 09:30–14:20 ET
 *   livestock (LE HE GF)         08:30–13:05 CT = 09:30–14:05 ET
 *
 * Under the Globex label, wheat's 08:45–09:30 ET break sat inside one
 * "session", so a gap reader would have called the pit's scheduled pause a
 * hole in the feed, and the Session Profile named a clock wheat does not keep.
 */
const CBOT_GRAIN_ROOTS = new Set(["ZC", "ZW", "ZS", "ZM", "ZL", "KE"]);
const CME_LIVESTOCK_ROOTS = new Set(["LE", "HE", "GF"]);

// The root is read by the notation owner, not by a predicate typed here.
export { futuresRootOf };

interface ClockedSessionWindow {
  readonly kind: Exclude<SessionWindowKind, "NO_CLOCK">;
  /** What the glass may print about the bars it profiled. */
  readonly label: string;
  /** Daily-or-longer only: how many of the latest bars form the window. */
  readonly windowBars: number | null;
  /** The bar's length in minutes — a bar belongs to RTH/ETH if it OVERLAPS
   *  the window, not only if it opens inside it (a 09:00 1h bar holds the
   *  09:30 open; the chart's own isRegularSession keeps it). */
  readonly barMinutes: number;
}

/**
 * THE ANSWER FOR AN ID THE REGISTRY HAS NO CLOCK FOR (2026-09-26, Garden 16
 * §26 nit). This used to be a `throw` — thrown DURING RENDER, because
 * MainChart and the room call sessionWindowFor from their render bodies, so a
 * single stray id ("15s", "100T", a stale saved "3Y") took the chart down
 * instead of leaving its session tools empty. Now it is a named result: no
 * bar minutes (there are none to give — `null`, not an invented 1), no session
 * key for any bar (sessionKeyOf answers null), so every consumer draws nothing
 * and the label says why. Behaviour for every registry clock is unchanged.
 */
export interface NoClockSessionWindow {
  readonly kind: "NO_CLOCK";
  readonly label: string;
  readonly windowBars: null;
  readonly barMinutes: null;
}

export type SessionWindow = ClockedSessionWindow | NoClockSessionWindow;

const DAY_SEC = 86_400;

/**
 * "5m" → 5, "1h" → 60, "4h" → 240 — and null for anything that is not an
 * intraday clock in the timeframe registry.
 *
 * FAIL CLOSED (2026-09-26, Garden 16 §21 step 4). This used to be a private
 * regex that answered 1 for "tick and unknown frames": an N-tick id would have
 * been profiled as one-minute bars with nothing anywhere saying so. It also
 * matched case-insensitively, so "1M" (one MONTH) read as 1 minute. The size
 * now comes from the registry's own candle, and an id the registry does not
 * know has no minutes to give.
 */
export function barMinutesOf(timeframe: string): number | null {
  const id = normalizeTFId(timeframe.trim());
  if (!id) return null;
  const sec = getTimeframe(id).candleIntervalSec;
  return sec < DAY_SEC ? sec / 60 : null;
}

/**
 * Daily-or-longer is the registry's call (candle ≥ one day), not a second list
 * of ids. The regex this replaced also carried "3Y", which is not a TFId —
 * normalizeTFId("3Y") is null, so no chart could ever send it (retired
 * 2026-09-26 with its MainChart twins). "D"/"W"/"M" still read as daily
 * through normalizeTFId, as they did through the regex.
 */
function isDailyOrLonger(timeframe: string): boolean {
  const id = normalizeTFId(timeframe);
  return id !== null && getTimeframe(id).candleIntervalSec >= DAY_SEC;
}

/** How many of the latest bars form the window. A policy of this module's,
 *  keyed by the registry's own ids so it cannot name one that does not exist. */
const DAILY_WINDOW_BARS: Readonly<Partial<Record<TFId, number>>> = {
  "1D": 5, "1W": 4, "1M": 3, "3M": 4, "6M": 4, "1Y": 3, "2Y": 3, "5Y": 3,
};

export function sessionWindowFor(symbol: string, timeframe: string, extendedHours: boolean): SessionWindow {
  if (isDailyOrLonger(timeframe)) {
    const n = DAILY_WINDOW_BARS[timeframe as TFId] ?? 5;
    return { kind: "DAILY_WINDOW", label: `LAST ${n} BARS · each ${timeframe} bar is already a whole session`, windowBars: n, barMinutes: 1440 };
  }
  const barMinutes = barMinutesOf(timeframe);
  if (barMinutes === null) {
    // No clock, no session window: a bar of unknown span cannot be placed
    // inside 09:30–16:00 without inventing its length. The chart already
    // refuses the same ids (MainChart getIntervalSec, WM-CHART-P0-03).
    return {
      kind: "NO_CLOCK",
      label: `NO SESSION · "${timeframe}" is not a registry clock — not profiled as one-minute bars`,
      windowBars: null,
      barMinutes: null,
    };
  }
  const cls = classifySymbol(symbol);
  if (cls === "EQUITY" || cls === "INDEX") {
    return extendedHours
      ? { kind: "US_EQUITY_ETH", label: "SESSION · ETH 04:00–20:00 ET", windowBars: null, barMinutes }
      : { kind: "US_EQUITY_RTH", label: "SESSION · RTH 09:30–16:00 ET", windowBars: null, barMinutes };
  }
  if (cls === "FUTURES") {
    const root = futuresRootOf(symbol);
    if (root && CBOT_GRAIN_ROOTS.has(root)) {
      return { kind: "CBOT_GRAINS_DAY", label: "SESSION · CBOT GRAINS 20:00–08:45 + 09:30–14:20 ET", windowBars: null, barMinutes };
    }
    if (root && CME_LIVESTOCK_ROOTS.has(root)) {
      return { kind: "CME_LIVESTOCK_DAY", label: "SESSION · CME LIVESTOCK 09:30–14:05 ET", windowBars: null, barMinutes };
    }
    return { kind: "GLOBEX_DAY", label: "SESSION · GLOBEX 18:00–17:00 ET", windowBars: null, barMinutes };
  }
  if (cls === "FOREX") return { kind: "FX_DAY", label: "SESSION · FX DAY · 17:00 ET ROLL", windowBars: null, barMinutes };
  // Crypto never closes; its day is the industry's UTC day — 00:00 UTC, the
  // daily-candle boundary every major venue uses (Founder ruling 2026-10-02).
  if (cls === "CRYPTO") return { kind: "CRYPTO_UTC_DAY", label: "DAY · 00:00 UTC · crypto trades around the clock", windowBars: null, barMinutes };
  return { kind: "CONTINUOUS_ET_DAY", label: "DAY · ET MIDNIGHT · continuous market, no venue session", windowBars: null, barMinutes };
}

const ET = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** New-York calendar date (YYYY-MM-DD) + minute-of-day for unix seconds — one cached formatter. */
// PERFORMANCE (serving NQ 5m, 2026-10-06): Intl formatting per bar was 11 of
// the 12.8 ms the Expected Envelope spent on every live tick (it re-keys every
// loaded bar). A bar's New York date / minute never changes, so each second is
// formatted once. Bounded: the memo is dropped whole past ETPARTS_MEMO_MAX.
const ETPARTS_MEMO_MAX = 50_000;
const etPartsMemo = new Map<number, { readonly date: string; readonly minute: number }>();

export function etParts(sec: number): { readonly date: string; readonly minute: number } {
  const hit = etPartsMemo.get(sec);
  if (hit) return hit;
  const o: Record<string, string> = {};
  for (const p of ET.formatToParts(new Date(sec * 1000))) o[p.type] = p.value;
  const v = Object.freeze({ date: `${o.year}-${o.month}-${o.day}`, minute: Number(o.hour) * 60 + Number(o.minute) });
  if (etPartsMemo.size >= ETPARTS_MEMO_MAX) etPartsMemo.clear();
  etPartsMemo.set(sec, v);
  return v;
}

/**
 * The session a bar (its open, unix seconds) belongs to under `win`, or null
 * when it belongs to none (outside RTH/ETH, the Globex maintenance hour).
 * Sessions that open the evening before are keyed by the date they END on.
 */
export function sessionKeyOf(sec: number, win: SessionWindow): string | null {
  switch (win.kind) {
    // A bar belongs to the window if any part of it is inside it.
    case "US_EQUITY_RTH": {
      const p = etParts(sec);
      return p.minute + win.barMinutes > 570 && p.minute < 960 ? p.date : null;
    }
    case "US_EQUITY_ETH": {
      const p = etParts(sec);
      return p.minute + win.barMinutes > 240 && p.minute < 1200 ? p.date : null;
    }
    case "GLOBEX_DAY": {
      const p = etParts(sec);
      if (p.minute >= 1020 && p.minute < 1080) return null; // 17:00–18:00 ET maintenance
      return p.minute >= 1080 ? etParts(sec + 6 * 3600).date : p.date;
    }
    case "CBOT_GRAINS_DAY": {
      // Night 20:00→08:45 (keyed by the date it ENDS on) + day 09:30→14:20.
      // The 08:45–09:30 break and the 14:20–20:00 close belong to no session.
      const p = etParts(sec);
      if (p.minute >= 1200 || p.minute + win.barMinutes > 1200) return etParts(sec + 5 * 3600).date;
      if (p.minute < 525) return p.date;
      if (p.minute + win.barMinutes > 570 && p.minute < 860) return p.date;
      return null;
    }
    case "CME_LIVESTOCK_DAY": {
      const p = etParts(sec);
      return p.minute + win.barMinutes > 570 && p.minute < 845 ? p.date : null;
    }
    case "FX_DAY": {
      const p = etParts(sec);
      return p.minute >= 1020 ? etParts(sec + 7 * 3600).date : p.date;
    }
    case "CONTINUOUS_ET_DAY":
      return etParts(sec).date;
    case "CRYPTO_UTC_DAY":
      return new Date(sec * 1000).toISOString().slice(0, 10);
    case "DAILY_WINDOW":
    case "NO_CLOCK":
      return null;
  }
}

/** The latest session's bars (or the daily window), oldest first. */
export function selectSessionWindowBars<B extends { readonly time: number | string }>(
  bars: readonly B[],
  win: SessionWindow,
): B[] {
  if (win.kind === "DAILY_WINDOW") return bars.slice(-(win.windowBars ?? 5));
  let latest: string | null = null;
  for (let i = bars.length - 1; i >= 0 && latest == null; i--) latest = sessionKeyOf(Number(bars[i].time), win);
  if (latest == null) return [];
  return bars.filter(b => sessionKeyOf(Number(b.time), win) === latest);
}

/**
 * A CLOCK-ALIGNED HIGHER-TIMEFRAME BUCKET INSIDE ONE SESSION (T-210 / F10,
 * added 2026-09-26 for `selectMtfAncestry`).
 *
 * The 1H and 4H bars a multi-timeframe reading resamples are cut on the ET
 * wall clock (00:00, 04:00, 08:00 … for 4H; each hour for 1H) AND never cross
 * a session boundary this owner names: the key carries the session key, so a
 * Globex 16:00–20:00 bucket is two buckets (16:00–17:00 of one day, 18:00–20:00
 * of the next) and an RTH 08:00–12:00 bucket is its 09:30–12:00 portion.
 * A bar outside every session belongs to no bucket (null), exactly as
 * `sessionKeyOf` says. `startSec` / `endSec` are the bucket's CLOCK edges,
 * not the first / last bar's.
 *
 * Continuous markets other than crypto are bucketed on the ET clock (the
 * owner's CONTINUOUS_ET_DAY); crypto's day is 00:00 UTC (CRYPTO_UTC_DAY) and
 * its buckets split there because the session key does.
 */
export interface ClockBucket {
  readonly key: string;
  readonly startSec: number;
  readonly endSec: number;
}

export function clockBucketOf(sec: number, win: SessionWindow, spanMinutes: number): ClockBucket | null {
  if (!(spanMinutes > 0)) return null;
  const session = sessionKeyOf(sec, win);
  if (session == null) return null;
  // Crypto's buckets are aligned on its own UTC day (4H = 00:00, 04:00 … UTC).
  const p = win.kind === "CRYPTO_UTC_DAY"
    ? { date: new Date(sec * 1000).toISOString().slice(0, 10), minute: Math.floor((((sec % 86400) + 86400) % 86400) / 60) }
    : etParts(sec);
  const idx = Math.floor(p.minute / spanMinutes);
  const startSec = sec - (p.minute - idx * spanMinutes) * 60 - (((sec % 60) + 60) % 60);
  return { key: `${session}|${p.date}|${spanMinutes}:${idx}`, startSec, endSec: startSec + spanMinutes * 60 };
}

/**
 * The day boundary a 24/7 market's profile family should split on, or
 * undefined where gaps in the bars already mark sessions. Only crypto has
 * one today: 00:00 UTC.
 */
export function continuousDayKeyFor(symbol: string): ((sec: number) => string) | undefined {
  return classifySymbol(symbol) === "CRYPTO" ? (sec: number) => new Date(sec * 1000).toISOString().slice(0, 10) : undefined;
}
