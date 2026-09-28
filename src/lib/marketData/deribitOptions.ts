/**
 * DERIBIT PUBLIC OPTIONS — Derivatives Pressure's positioning input for BTC and
 * ETH (Garden 16, 2026-09-27: on a weekend only crypto trades, and Cboe lists
 * no crypto options, so the pressure world refused every live chart).
 *
 * Deribit's public book summary (no credential, display only) carries, per
 * option: open_interest (in coins, CURRENT — not a prior-session figure),
 * mark_iv (percent, Deribit's mark model), and the underlying index. Only
 * NORMALIZES into the same receipt the Cboe lane produces, so ONE owner
 * (selectDerivativesPressure) compiles both. Infers no side, dealer or flow.
 *
 * PURE. DETERMINISTIC.
 */
import type { CboeOptionRow, CboeOptionsReceipt } from "./cboeDelayedOptions";

export const DERIBIT_OPTIONS_SOURCE = "DERIBIT_PUBLIC" as const;

/** BTC-USD / BTCUSD / BTC / XBT… → "BTC"; ETH likewise; anything else null. */
export function deribitCurrencyFor(symbol: string): "BTC" | "ETH" | null {
  const s = (symbol ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (s === "BTC" || s === "BTCUSD" || s === "BTCUSDT" || s === "XBT" || s === "XBTUSD") return "BTC";
  if (s === "ETH" || s === "ETHUSD" || s === "ETHUSDT") return "ETH";
  return null;
}

const MONTHS: Record<string, string> = { JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06", JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12" };
/** BTC-28SEP26-88000-P */
const NAME = /^(BTC|ETH)-(\d{1,2})([A-Z]{3})(\d{2})-(\d+(?:\.\d+)?)-([CP])$/;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** DVOL — Deribit's 30-day implied-volatility index (percent): the newest close, or null. */
export function dvolFrom(body: unknown): number | null {
  const r = body && typeof body === "object" ? (body as { result?: { data?: unknown } }).result : null;
  const rows = Array.isArray(r?.data) ? (r!.data as unknown[]) : [];
  const last = rows.length ? rows[rows.length - 1] : null;
  const close = Array.isArray(last) ? num(last[4]) : null;
  return close != null && close > 0 ? close : null;
}

export function normalizeDeribitOptions(body: unknown, currency: "BTC" | "ETH", maxDte = 60, now = Date.now(), iv30: number | null = null): CboeOptionsReceipt {
  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const list = Array.isArray(root?.result) ? (root!.result as unknown[]) : [];
  const rows: CboeOptionRow[] = [];
  let dropped = 0;
  let spot: number | null = null;
  let asOf = 0;
  const horizon = now + maxDte * 86_400_000;
  for (const raw of list) {
    const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    const m = typeof o?.instrument_name === "string" ? NAME.exec(o.instrument_name) : null;
    if (!o || !m || m[1] !== currency) { dropped++; continue; }
    const [, , dd, mon, yy, k, cp] = m;
    const mm = MONTHS[mon];
    const expiration = mm ? `20${yy}-${mm}-${dd.padStart(2, "0")}` : "";
    // Deribit options expire 08:00 UTC.
    const expMs = Date.parse(`${expiration}T08:00:00Z`);
    const strike = Number(k);
    const oi = num(o.open_interest);
    if (!Number.isFinite(expMs) || !(strike > 0) || oi == null || oi < 0) { dropped++; continue; }
    const idx = num(o.estimated_delivery_price);
    if (spot == null && idx != null && idx > 0) spot = idx;
    const ts = num(o.creation_timestamp);
    if (ts != null && ts > asOf) asOf = ts;
    if (expMs < now || expMs > horizon) continue;
    const iv = num(o.mark_iv);
    rows.push({
      contract: o.instrument_name as string,
      type: cp === "C" ? "call" : "put",
      expiration,
      strike,
      openInterest: oi,
      gamma: null,
      iv: iv != null && iv > 0 ? iv / 100 : null,
      volume: num(o.volume),
    });
  }
  return {
    source: DERIBIT_OPTIONS_SOURCE,
    underlying: `${currency}-USD`,
    spot,
    iv30,
    chainAsOf: asOf > 0 ? new Date(asOf).toISOString() : null,
    underlyingAsOf: asOf > 0 ? new Date(asOf).toISOString() : null,
    rows,
    dropped,
  };
}
