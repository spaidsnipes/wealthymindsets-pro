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
 *                    maintenance hour belongs to no session.
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

import { classifySymbol } from "./symbolAssetClass";

export type SessionWindowKind =
  | "US_EQUITY_RTH"
  | "US_EQUITY_ETH"
  | "GLOBEX_DAY"
  | "FX_DAY"
  | "CONTINUOUS_ET_DAY"
  | "DAILY_WINDOW";

export interface SessionWindow {
  readonly kind: SessionWindowKind;
  /** What the glass may print about the bars it profiled. */
  readonly label: string;
  /** Daily-or-longer only: how many of the latest bars form the window. */
  readonly windowBars: number | null;
}

const DAILY_OR_LONGER = /^(D|1D|W|1W|M|1M|3M|6M|1Y|2Y|3Y|5Y)$/;
const DAILY_WINDOW_BARS: Readonly<Record<string, number>> = {
  "1D": 5, "1W": 4, "1M": 3, "3M": 4, "6M": 4, "1Y": 3, "2Y": 3, "3Y": 3, "5Y": 3,
};

export function sessionWindowFor(symbol: string, timeframe: string, extendedHours: boolean): SessionWindow {
  if (DAILY_OR_LONGER.test(timeframe)) {
    const n = DAILY_WINDOW_BARS[timeframe] ?? 5;
    return { kind: "DAILY_WINDOW", label: `LAST ${n} BARS · each ${timeframe} bar is already a whole session`, windowBars: n };
  }
  const cls = classifySymbol(symbol);
  if (cls === "EQUITY" || cls === "INDEX") {
    return extendedHours
      ? { kind: "US_EQUITY_ETH", label: "SESSION · ETH 04:00–20:00 ET", windowBars: null }
      : { kind: "US_EQUITY_RTH", label: "SESSION · RTH 09:30–16:00 ET", windowBars: null };
  }
  if (cls === "FUTURES") return { kind: "GLOBEX_DAY", label: "SESSION · GLOBEX 18:00–17:00 ET", windowBars: null };
  if (cls === "FOREX") return { kind: "FX_DAY", label: "SESSION · FX DAY · 17:00 ET ROLL", windowBars: null };
  return { kind: "CONTINUOUS_ET_DAY", label: "DAY · ET MIDNIGHT · continuous market, no venue session", windowBars: null };
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
    case "US_EQUITY_RTH": {
      const p = etParts(sec);
      return p.minute >= 570 && p.minute < 960 ? p.date : null;
    }
    case "US_EQUITY_ETH": {
      const p = etParts(sec);
      return p.minute >= 240 && p.minute < 1200 ? p.date : null;
    }
    case "GLOBEX_DAY": {
      const p = etParts(sec);
      if (p.minute >= 1020 && p.minute < 1080) return null; // 17:00–18:00 ET maintenance
      return p.minute >= 1080 ? etParts(sec + 6 * 3600).date : p.date;
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
