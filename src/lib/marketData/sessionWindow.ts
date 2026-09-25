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

export type SessionWindowKind =
  | "US_EQUITY_RTH"
  | "US_EQUITY_ETH"
  | "GLOBEX_DAY"
  | "CBOT_GRAINS_DAY"
  | "CME_LIVESTOCK_DAY"
  | "FX_DAY"
  | "CONTINUOUS_ET_DAY"
  | "DAILY_WINDOW";

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

export interface SessionWindow {
  readonly kind: SessionWindowKind;
  /** What the glass may print about the bars it profiled. */
  readonly label: string;
  /** Daily-or-longer only: how many of the latest bars form the window. */
  readonly windowBars: number | null;
  /** The bar's length in minutes — a bar belongs to RTH/ETH if it OVERLAPS
   *  the window, not only if it opens inside it (a 09:00 1h bar holds the
   *  09:30 open; the chart's own isRegularSession keeps it). */
  readonly barMinutes: number;
}

/** "5m" → 5, "1h" → 60, "4h" → 240; tick and unknown frames → 1. */
export function barMinutesOf(timeframe: string): number {
  const m = /^(\d+)(m|h)$/i.exec(timeframe.trim());
  if (!m) return 1;
  const n = Number(m[1]);
  return m[2].toLowerCase() === "h" ? n * 60 : n;
}

const DAILY_OR_LONGER = /^(D|1D|W|1W|M|1M|3M|6M|1Y|2Y|3Y|5Y)$/;
const DAILY_WINDOW_BARS: Readonly<Record<string, number>> = {
  "1D": 5, "1W": 4, "1M": 3, "3M": 4, "6M": 4, "1Y": 3, "2Y": 3, "3Y": 3, "5Y": 3,
};

export function sessionWindowFor(symbol: string, timeframe: string, extendedHours: boolean): SessionWindow {
  if (DAILY_OR_LONGER.test(timeframe)) {
    const n = DAILY_WINDOW_BARS[timeframe] ?? 5;
    return { kind: "DAILY_WINDOW", label: `LAST ${n} BARS · each ${timeframe} bar is already a whole session`, windowBars: n, barMinutes: 1440 };
  }
  const barMinutes = barMinutesOf(timeframe);
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
  return { kind: "CONTINUOUS_ET_DAY", label: "DAY · ET MIDNIGHT · continuous market, no venue session", windowBars: null, barMinutes };
}

const ET = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function etParts(sec: number): { date: string; minute: number } {
  const o: Record<string, string> = {};
  for (const p of ET.formatToParts(new Date(sec * 1000))) o[p.type] = p.value;
  return { date: `${o.year}-${o.month}-${o.day}`, minute: Number(o.hour) * 60 + Number(o.minute) };
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
    case "DAILY_WINDOW":
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
