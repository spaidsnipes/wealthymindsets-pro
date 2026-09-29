/**
 * A DAILY BAR IS A SESSION DATE, NOT A LOCAL CLOCK TIME.
 *
 * Daily-and-longer bars are stamped at the midnight that opens their session
 * — midnight New York for the US equity and futures feeds here, midnight UTC
 * for crypto dailies. Formatted in the trader's own zone they slide a day: in
 * Chicago the Aug 11 session printed "1D BAR · AUG 10, 23:00", and the axis
 * printed "Nov 2025" twice (Dec 1 00:00 ET is Nov 30 23:00 CT) — serving
 * TSLA 1D, 2026-09-28.
 *
 * The zone is read from the stamp itself (the zone in which it IS a
 * midnight), never guessed from the symbol; a stamp that is a midnight nowhere
 * we know keeps the trader's zone. Only the DATE is printed — a daily bar has
 * no time of day to show.
 *
 * PURE. DETERMINISTIC.
 */
import { getTimeframe, isTFId, type TFId } from "@/lib/timeframes";

/** Daily-or-longer, read from the ONE timeframe registry (no private list). */
export function isSessionTimeframe(tf: string | null | undefined): boolean {
  if (typeof tf !== "string" || !isTFId(tf.trim())) return false;
  return getTimeframe(tf.trim() as TFId).candleIntervalSec >= 86_400;
}

function isMidnightIn(sec: number, timeZone: string): boolean {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(sec * 1000));
    const h = Number(parts.find(p => p.type === "hour")?.value);
    const m = Number(parts.find(p => p.type === "minute")?.value);
    return (h === 0 || h === 24) && m === 0;
  } catch { return false; }
}

/** The zone in which this stamp is its session's midnight; the fallback otherwise. */
export function sessionDateZone(sec: number, fallbackTz: string | undefined): string | undefined {
  if (!Number.isFinite(sec)) return fallbackTz;
  if (isMidnightIn(sec, "America/New_York")) return "America/New_York";
  if (sec % 86_400 === 0) return "UTC";
  return fallbackTz;
}

export function fmtSessionDate(sec: number, fallbackTz: string | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  const timeZone = sessionDateZone(sec, fallbackTz);
  try {
    return new Intl.DateTimeFormat("en-US", { ...opts, timeZone }).format(new Date(sec * 1000));
  } catch {
    return new Date(sec * 1000).toDateString();
  }
}
