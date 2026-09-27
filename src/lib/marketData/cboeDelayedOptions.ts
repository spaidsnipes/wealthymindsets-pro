/**
 * CBOE DELAYED OPTIONS — Derivatives Pressure's positioning input.
 *
 * Founder decision 2026-09-27 ("Cboe delayed"): the Alpaca snapshot chain has
 * gamma/IV but NO open interest (measured 0 of 1,000 TSLA rows), so walls and
 * climate could not be computed without inventing positioning. Cboe's delayed
 * quotes carry, per contract: open_interest (prior session), iv, gamma, volume.
 *
 * This file only NORMALIZES — it infers no side, dealer, or flow. Every row is
 * DELAYED; greeks/iv are Cboe model values; OI is a daily figure. The clocks
 * travel with the receipt so no surface can present OI as live positioning.
 *
 * PURE. DETERMINISTIC.
 */

export const CBOE_OPTIONS_SOURCE = "CBOE_DELAYED" as const;

/** Cboe names cash indices with a leading underscore. */
const INDEX_ROOTS = new Set(["SPX", "NDX", "RUT", "VIX", "XSP", "DJX"]);
export function cboeSymbolFor(symbol: string): string | null {
  const s = (symbol ?? "").trim().toUpperCase().replace(/^\^/, "");
  if (!/^[A-Z][A-Z.]{0,5}$/.test(s)) return null;
  return INDEX_ROOTS.has(s) ? `_${s}` : s;
}

export interface CboeOptionRow {
  readonly contract: string;
  readonly type: "call" | "put";
  readonly expiration: string; // YYYY-MM-DD
  readonly strike: number;
  readonly openInterest: number;
  readonly gamma: number | null;
  readonly iv: number | null;
  readonly volume: number | null;
}

export interface CboeOptionsReceipt {
  readonly source: typeof CBOE_OPTIONS_SOURCE;
  readonly underlying: string;
  /** The underlying's last price in the same delayed snapshot. */
  readonly spot: number | null;
  /** 30-day implied volatility (percent, e.g. 43.56). */
  readonly iv30: number | null;
  /** CHAIN_ASOF: Cboe's snapshot timestamp (ISO, treated as UTC by Cboe). */
  readonly chainAsOf: string | null;
  /** UNDERLYING_ASOF: the underlying's last trade time (exchange-local). */
  readonly underlyingAsOf: string | null;
  readonly rows: readonly CboeOptionRow[];
  /** Contracts dropped for an unreadable identity or a missing open interest. */
  readonly dropped: number;
}

const rec = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const OSI = /^([A-Z0-9_.]{1,6}?)(\d{6})([CP])(\d{8})$/;

export function normalizeCboeOptions(body: unknown, underlying: string, maxDte = 60, now = Date.now()): CboeOptionsReceipt {
  const root = rec(body);
  const data = rec(root?.data);
  const u = (underlying ?? "").trim().toUpperCase();
  const rows: CboeOptionRow[] = [];
  let dropped = 0;
  const list = Array.isArray(data?.options) ? (data!.options as unknown[]) : [];
  const horizon = now + maxDte * 86_400_000;
  for (const raw of list) {
    const o = rec(raw);
    const m = typeof o?.option === "string" ? OSI.exec(o.option) : null;
    if (!o || !m) { dropped++; continue; }
    const [, , d, cp, k] = m;
    const expiration = `20${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)}`;
    const expMs = Date.parse(`${expiration}T21:00:00Z`);
    const strike = Number(k) / 1000;
    const oi = num(o.open_interest);
    if (!Number.isFinite(expMs) || !(strike > 0) || oi == null || oi < 0) { dropped++; continue; }
    if (expMs < now || expMs > horizon) continue; // outside the pressure horizon, not an error
    rows.push({
      contract: o.option as string,
      type: cp === "C" ? "call" : "put",
      expiration,
      strike,
      openInterest: oi,
      gamma: num(o.gamma),
      iv: num(o.iv),
      volume: num(o.volume),
    });
  }
  const spot = num(data?.current_price);
  return {
    source: CBOE_OPTIONS_SOURCE,
    underlying: u,
    spot: spot != null && spot > 0 ? spot : null,
    iv30: num(data?.iv30),
    chainAsOf: typeof root?.timestamp === "string" ? root.timestamp : null,
    underlyingAsOf: typeof data?.last_trade_time === "string" ? data.last_trade_time : null,
    rows,
    dropped,
  };
}
