/**
 * SESSION VOLUME PROFILE — pure projection logic (WM-VP-P0-01)
 *
 * These functions are the truthful core of the WM Session VP. They are pure
 * (no React, no network, no clock except the explicit `Date.now()` used to pin
 * the live trading day) so the panel's behaviour can be unit-tested per failure
 * mode. The VP component is a thin presentational layer over these.
 *
 * Architectural invariant (Forge WM-VP-P0-01 root-cause): the VP is a PURE
 * projection of the exact candle series the chart rendered — it never fetches
 * its own candles. That is why there is no `fetch` anywhere in this module.
 */

export interface SessionLevel {
  price: number;
  bid:   number;
  ask:   number;
  total: number;
  delta: number;
}

export interface Candle {
  time:   number;
  open:   number;
  high:   number;
  low:    number;
  close:  number;
  volume: number;
}

export interface TapeTick {
  price: number;
  size:  number;
  side?: string;
}

export type SessionWindow = "RTH" | "ETH" | "24H" | "2D" | "1W" | "1M";

/** New-York calendar date (YYYY-MM-DD) + minute-of-day for an epoch-seconds ts. */
export const nyParts = (epochSeconds: number): { date: string; minute: number } => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(epochSeconds * 1000));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value ?? 0);
  const year = get("year"), month = get("month"), day = get("day");
  return {
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    minute: get("hour") * 60 + get("minute"),
  };
};

/**
 * Select the candles that belong to the current session window.
 *
 * WM-VP-P0-01 Fix 2 (kills F-B): for the single-session windows (RTH/ETH/24H)
 * the session is pinned to the LIVE trading day, never "the last date present
 * in the array". If today's intraday bars have not arrived yet the result is
 * empty, so the panel shows an honest "awaiting bars" state rather than
 * silently rendering YESTERDAY's profile mislabeled as today.
 */
export function selectSessionCandles(candles: Candle[], window: SessionWindow): Candle[] {
  if (!candles.length) return [];
  const annotated = candles
    .filter(c => c.volume > 0 && c.high >= c.low)
    .map(c => ({ candle: c, ...nyParts(c.time) }));
  if (!annotated.length) return [];

  if (window === "RTH" || window === "ETH" || window === "24H") {
    const start = window === "RTH" ? 570 : window === "ETH" ? 240 : 0;
    const end = window === "RTH" ? 960 : window === "ETH" ? 1200 : 1440;
    const eligible = annotated.filter(x => x.minute >= start && x.minute < end);
    if (!eligible.length) return [];
    const today = nyParts(Math.floor(Date.now() / 1000)).date;
    return eligible.filter(x => x.date === today).map(x => x.candle);
  }

  const distinctDates = [...new Set(annotated.map(x => x.date))];
  const keep = window === "2D" ? 2 : window === "1W" ? 7 : 30;
  const dates = new Set(distinctDates.slice(-keep));
  return annotated.filter(x => dates.has(x.date)).map(x => x.candle);
}

/** Bar-derived volume profile: distribute each candle's volume across the price
 *  bins it spans. Honest — reported OHLCV only, no synthesized bid/ask. */
export function buildSessionLevels(candles: Candle[]): SessionLevel[] {
  if (!candles.length) return [];
  const low = Math.min(...candles.map(c => c.low));
  const high = Math.max(...candles.map(c => c.high));
  const range = high - low;
  if (!(range > 0)) return [];

  const count = 48;
  const binSize = range / count;
  const totals = Array.from({ length: count }, () => 0);
  for (const candle of candles) {
    const first = Math.max(0, Math.min(count - 1, Math.floor((candle.low - low) / binSize)));
    const last = Math.max(first, Math.min(count - 1, Math.floor((candle.high - low) / binSize)));
    const perBin = candle.volume / (last - first + 1);
    for (let i = first; i <= last; i++) totals[i] += perBin;
  }

  return totals.map((total, i) => ({
    price: low + (i + 0.5) * binSize,
    bid: 0,
    ask: 0,
    total,
    delta: 0,
  })).reverse();
}

/**
 * WM-VP-P0-01 Fix 3 (F-C): fold accumulated live tape into an EXISTING bar-bin
 * grid. A real executed trade is added to its single nearest price bin. Pure —
 * never mutates the input.
 */
export function foldTape(base: SessionLevel[], tape: TapeTick[]): SessionLevel[] {
  if (!tape.length) return base;
  const out = base.map(l => ({ ...l }));
  for (const t of tape) {
    let nearest = 0, min = Infinity;
    for (let i = 0; i < out.length; i++) {
      const d = Math.abs(out[i].price - t.price);
      if (d < min) { min = d; nearest = i; }
    }
    const add = Math.max(0, t.size);
    if (t.side === "sell") out[nearest].bid += add;
    else if (t.side === "buy") out[nearest].ask += add;
    out[nearest].total += add;
    out[nearest].delta = out[nearest].ask - out[nearest].bid;
  }
  return out;
}

/**
 * WM-VP-P0-01 Fix 3 (F-C): when the bar layer is EMPTY (e.g. a provider that
 * carries no session candles) but live tape IS flowing, build a profile from
 * the tape alone so the live layer still paints. Bar-emptiness must never
 * suppress a non-empty tick layer.
 */
export function buildTapeLevels(tape: TapeTick[]): SessionLevel[] {
  if (!tape.length) return [];
  const prices = tape.map(t => t.price);
  const low = Math.min(...prices), high = Math.max(...prices);
  const range = high - low;
  const count = range > 0 ? 48 : 1;
  const binSize = range > 0 ? range / count : 1;
  const bins: SessionLevel[] = Array.from({ length: count }, (_, i) => ({
    price: low + (i + 0.5) * binSize, bid: 0, ask: 0, total: 0, delta: 0,
  }));
  for (const t of tape) {
    let idx = range > 0 ? Math.floor((t.price - low) / binSize) : 0;
    if (idx >= count) idx = count - 1;
    if (idx < 0) idx = 0;
    const add = Math.max(0, t.size);
    if (t.side === "sell") bins[idx].bid += add;
    else if (t.side === "buy") bins[idx].ask += add;
    bins[idx].total += add;
    bins[idx].delta = bins[idx].ask - bins[idx].bid;
  }
  return bins.filter(b => b.total > 0).reverse();
}
