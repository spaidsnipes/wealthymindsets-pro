/**
 * FX MARKET INFO (2026-10-02): a spot pair's Market Info read "company
 * fundamentals apply to equities only". What a forex trader opens it for is
 * the instrument's own facts: its pip, and which of the four trading centres
 * are open at this instant (local business hours 08:00–17:00 in each centre's
 * own time zone, weekdays — a clock fact, not a liquidity claim). PURE (clock
 * passed in).
 */
import { forexPairCodes } from "@/lib/marketData/canonicalIdentity";
import type { MetricRow } from "@/lib/marketData/tastyMarketMetrics";

const CENTRES: readonly { readonly name: string; readonly tz: string }[] = [
  { name: "Sydney", tz: "Australia/Sydney" },
  { name: "Tokyo", tz: "Asia/Tokyo" },
  { name: "London", tz: "Europe/London" },
  { name: "New York", tz: "America/New_York" },
];

function localClock(at: Date, tz: string): { day: number; minute: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at);
    const get = (t: string) => parts.find(p => p.type === t)?.value;
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday") ?? "");
    const minute = Number(get("hour")) * 60 + Number(get("minute"));
    return day >= 0 && Number.isFinite(minute) ? { day, minute } : null;
  } catch { return null; }
}

export function fxCentresOpen(at: Date): string[] {
  return CENTRES.filter(c => {
    const k = localClock(at, c.tz);
    return k != null && k.day >= 1 && k.day <= 5 && k.minute >= 8 * 60 && k.minute < 17 * 60;
  }).map(c => c.name);
}

export function readFxMarketInfo(symbol: string, at: Date): MetricRow[] {
  const codes = forexPairCodes(symbol);
  if (!codes) return [];
  const [base, quote] = codes;
  const pip = quote === "JPY" ? "0.01" : "0.0001";
  const open = fxCentresOpen(at);
  return [
    { label: "Pair", value: `${base} / ${quote}`, note: `price of 1 ${base} in ${quote}` },
    { label: "Pip", value: pip },
    { label: "Centres in business hours now", value: open.length ? open.join(" · ") : "none", note: "local 08:00–17:00, weekdays" },
    { label: "Central volume", value: "none", note: "spot FX trades over the counter" },
  ];
}
