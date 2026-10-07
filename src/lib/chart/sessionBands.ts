/**
 * SESSION BANDS — Asia / London / New York as first-class context on the
 * time axis (FX lane, 2026-10-06; Drive canon: "Sessions: London / New York
 * / Asia as first-class contextual states").
 *
 * A session here is a CLOCK FACT, the same rule Market Info's "Centres in
 * business hours" uses (fxMarketInfo.ts): local business hours 08:00–17:00 in
 * each centre's own time zone, local weekdays only, with the zone's daylight
 * saving applied by the platform's tz database. ASIA is Tokyo's day. It makes
 * no liquidity claim and reads no volume, so it works on spot FX — the market
 * that has no traded volume at all.
 *
 *   ASIA       Tokyo     08:00–17:00 Asia/Tokyo
 *   LONDON     London    08:00–17:00 Europe/London
 *   NEW YORK   New York  08:00–17:00 America/New_York
 *   OVERLAP    the London ∩ New York stretch, marked on its own
 *
 * PURE. DETERMINISTIC. No clock: the window is passed in.
 */
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";
import { forexPairCodes } from "@/lib/marketData/canonicalIdentity";
import { spotMetalFutures } from "@/lib/yahooSymbol";

export type SessionBandId = "ASIA" | "LONDON" | "NEW_YORK";

export interface SessionSpan {
  readonly id: SessionBandId | "LDN_NY_OVERLAP";
  /** Unix seconds, inclusive start / exclusive end. */
  readonly start: number;
  readonly end: number;
}

export const SESSION_BAND_CENTRES: readonly { readonly id: SessionBandId; readonly label: string; readonly tz: string }[] = [
  { id: "ASIA", label: "ASIA", tz: "Asia/Tokyo" },
  { id: "LONDON", label: "LONDON", tz: "Europe/London" },
  { id: "NEW_YORK", label: "NEW YORK", tz: "America/New_York" },
];

export const SESSION_BAND_LABEL: Readonly<Record<SessionSpan["id"], string>> = {
  ASIA: "ASIA", LONDON: "LONDON", NEW_YORK: "NEW YORK", LDN_NY_OVERLAP: "LDN/NY",
};

const OPEN_HOUR = 8;
const CLOSE_HOUR = 17;
const DAY = 86_400;

const FORMATTERS = new Map<string, Intl.DateTimeFormat>();
/** Offset (seconds) of `tz` from UTC at the instant `utcSec`. */
function tzOffsetSec(utcSec: number, tz: string): number {
  let f = FORMATTERS.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    FORMATTERS.set(tz, f);
  }
  const parts = f.formatToParts(new Date(utcSec * 1000));
  const g = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second")) / 1000;
  return asUtc - utcSec;
}

/** The UTC instant of local wall time y-m-d h:00 in `tz`. */
function zonedToUtc(y: number, m: number, d: number, h: number, tz: string): number {
  const guess = Date.UTC(y, m, d, h) / 1000;
  const first = guess - tzOffsetSec(guess, tz);
  return guess - tzOffsetSec(first, tz);
}

/** Each centre's business-hours spans touching [from, to], plus the London ∩ New York overlap. */
export function sessionSpans(from: number, to: number): SessionSpan[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
  // Guard: a camera wider than ~400 days is not a session question.
  if (to - from > 400 * DAY) return [];
  const out: SessionSpan[] = [];
  const byId = new Map<SessionBandId, SessionSpan[]>();
  for (const c of SESSION_BAND_CENTRES) {
    const list: SessionSpan[] = [];
    // Walk local calendar days from a day before to a day after the window.
    for (let t = from - DAY; t <= to + DAY; t += DAY) {
      const local = new Date((t + tzOffsetSec(t, c.tz)) * 1000);
      const y = local.getUTCFullYear(), m = local.getUTCMonth(), d = local.getUTCDate();
      const wd = local.getUTCDay();
      if (wd === 0 || wd === 6) continue;
      const start = zonedToUtc(y, m, d, OPEN_HOUR, c.tz);
      const end = zonedToUtc(y, m, d, CLOSE_HOUR, c.tz);
      if (end <= from || start >= to) continue;
      if (list.some(s => s.start === start)) continue;
      list.push({ id: c.id, start, end });
    }
    byId.set(c.id, list);
    out.push(...list);
  }
  for (const l of byId.get("LONDON") ?? []) {
    for (const n of byId.get("NEW_YORK") ?? []) {
      const s = Math.max(l.start, n.start), e = Math.min(l.end, n.end);
      if (e > s) out.push({ id: "LDN_NY_OVERLAP", start: s, end: e });
    }
  }
  return out.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}

/** Which centres are in business hours at `at` (unix seconds). */
export function sessionsAt(at: number): SessionBandId[] {
  return sessionSpans(at - 1, at + 1).filter(s => s.id !== "LDN_NY_OVERLAP" && s.start <= at && at < s.end).map(s => s.id as SessionBandId);
}

/** Default ON for spot FX (and spot metals) only — a trader of other markets turns it on. */
export function sessionBandsDefaultOn(symbol: string): boolean {
  const s = (symbol ?? "").trim().toUpperCase();
  if (!s) return false;
  if (spotMetalFutures(s)) return true;
  const cls = classifySymbol(s);
  return cls === "FOREX" || (cls === "UNKNOWN" && forexPairCodes(s) !== null);
}

/**
 * Time → logical bar index on the chart's own bars (fractional inside a bar,
 * clamped to the next bar across a closed gap such as the weekend), so a band
 * edge lands where the clock says even between bar opens. Null off the bars.
 */
export function logicalForTime(times: readonly number[], t: number, barSec: number): number | null {
  const n = times.length;
  if (n === 0 || !Number.isFinite(t)) return null;
  if (t <= times[0]) return 0;
  if (t >= times[n - 1]) return n - 1 + Math.min(1, (t - times[n - 1]) / Math.max(1, barSec));
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) lo = mid; else hi = mid;
  }
  const frac = Math.min(1, (t - times[lo]) / Math.max(1, Math.min(barSec, times[hi] - times[lo])));
  return lo + frac;
}

/** The per-frame cost this layer may spend before its receipt reads OVER. */
export const SESSION_BANDS_BUDGET_MS = 1.5;
