/**
 * UNSETTLED OPTIONS AT EXPIRY — ESTIMATED from the underlying's close (Garden
 * 18 v2 §36/§37) — PURE.
 *
 * The order history never says how an option left open past expiry ended. The
 * underlying's daily close on the expiry date says whether it finished out of
 * the money (it almost certainly expired worthless) or in the money (it may
 * have been exercised / assigned). Either way this is ESTIMATED — a reading of
 * the market, never a broker fill — and it never enters realised P&L.
 */
import type { Episode } from "./webullLedger";
import type { LegacyOhlcvTuple } from "@/lib/marketData/canonicalBar";

export type Moneyness = "OUT OF THE MONEY" | "IN THE MONEY" | "UNKNOWN";

export interface ExpiryEstimate {
  readonly episodeId: string;
  readonly underlying: string;
  readonly expiry: string;
  readonly strike: number;
  readonly right: "C" | "P";
  readonly close: number | null;
  readonly moneyness: Moneyness;
  /** For a long that finished out of the money: what was paid in, plus fees, lost. Null otherwise. */
  readonly estimatedNet: number | null;
}

const nyDay = (sec: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(sec * 1000));

export function parseOptionKey(key: string): { underlying: string; expiry: string; strike: number; right: "C" | "P" } | null {
  const m = /^([A-Z.]+) (\d{4}-\d{2}-\d{2}) ([\d.]+)([CP])$/.exec(key.trim());
  return m ? { underlying: m[1], expiry: m[2], strike: Number(m[3]), right: m[4] as "C" | "P" } : null;
}

export function expiryEstimate(e: Episode, daily: readonly LegacyOhlcvTuple[]): ExpiryEstimate | null {
  const k = parseOptionKey(e.instrumentKey);
  if (!k) return null;
  const bar = daily.find(b => nyDay(b.time) === k.expiry) ?? null;
  const close = bar ? bar.close : null;
  const moneyness: Moneyness = close == null ? "UNKNOWN"
    : (k.right === "C" ? close > k.strike : close < k.strike) ? "IN THE MONEY" : "OUT OF THE MONEY";
  const estimatedNet = e.direction === "LONG" && moneyness === "OUT OF THE MONEY" ? Math.round(-(e.entryCost + e.fees) * 100) / 100 : null;
  return { episodeId: e.id, underlying: k.underlying, expiry: k.expiry, strike: k.strike, right: k.right, close, moneyness, estimatedNet };
}

export function summarizeExpiries(xs: readonly ExpiryEstimate[]) {
  const otm = xs.filter(x => x.moneyness === "OUT OF THE MONEY"), itm = xs.filter(x => x.moneyness === "IN THE MONEY"), unk = xs.filter(x => x.moneyness === "UNKNOWN");
  return { otm: otm.length, itm: itm.length, unknown: unk.length, estimatedLongOtmNet: Math.round(otm.reduce((s, x) => s + (x.estimatedNet ?? 0), 0) * 100) / 100 };
}
