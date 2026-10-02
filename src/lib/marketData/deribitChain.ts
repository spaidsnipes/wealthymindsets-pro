/**
 * DERIBIT OPTION CHAIN — VIEW ONLY (Garden 18 §LX, crypto traders).
 *
 * Serving BTC-USD, 2026-10-01 22:30 CDT: the crypto Derivatives tab was a
 * disabled button, while the product already read Deribit's PUBLIC book
 * summary for Derivatives Pressure. A crypto trader asks first for the chain.
 * This turns the same public answer into one: expiries, strikes, calls and
 * puts with bid / ask / mark, mark IV and open interest.
 *
 * TRUTH RULES
 *   · Deribit quotes option prices in the COIN. Every USD figure here is
 *     price × that row's own `underlying_price` (the expiry's forward), never
 *     the spot index and never a guess. A missing side stays null.
 *   · Nothing here is tradeable in WM: no order path is built on it.
 *   · The clock is Deribit's own (`creation_timestamp`), not the fetch time.
 *
 * PURE. DETERMINISTIC. No IO.
 */

export const DERIBIT_CHAIN_SOURCE = "DERIBIT_PUBLIC" as const;

export interface DeribitChainLeg {
  readonly instrument: string;
  readonly bidUsd: number | null;
  readonly askUsd: number | null;
  readonly markUsd: number | null;
  /** Mark IV as a fraction (0.52 = 52%). */
  readonly iv: number | null;
  /** Open interest, in contracts (1 contract = 1 coin). */
  readonly oi: number | null;
}

export interface DeribitChainStrike {
  readonly strike: number;
  readonly call: DeribitChainLeg | null;
  readonly put: DeribitChainLeg | null;
}

export interface DeribitChainExpiry {
  readonly expiration: string; // YYYY-MM-DD
  readonly dte: number;
  /** The expiry's own forward (Deribit `underlying_price`), USD. */
  readonly forward: number | null;
  readonly strikes: readonly DeribitChainStrike[];
}

export interface DeribitChain {
  readonly source: typeof DERIBIT_CHAIN_SOURCE;
  readonly currency: "BTC" | "ETH";
  /** Deribit's delivery index, USD. */
  readonly index: number | null;
  readonly asOf: string | null;
  readonly expiries: readonly DeribitChainExpiry[];
}

const NAME = /^(BTC|ETH)-(\d{1,2})([A-Z]{3})(\d{2})-(\d+(?:\.\d+)?)-([CP])$/;
const MONTHS: Readonly<Record<string, string>> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const usd = (coin: number | null, fwd: number | null): number | null =>
  coin != null && coin > 0 && fwd != null && fwd > 0 ? Math.round(coin * fwd * 100) / 100 : null;

export function normalizeDeribitChain(body: unknown, currency: "BTC" | "ETH", now: number, maxDte = 400): DeribitChain {
  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const list = Array.isArray(root?.result) ? (root!.result as unknown[]) : [];
  const byExp = new Map<string, { expMs: number; forward: number | null; strikes: Map<number, { call: DeribitChainLeg | null; put: DeribitChainLeg | null }> }>();
  let index: number | null = null;
  let asOf = 0;
  for (const raw of list) {
    const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    const name = typeof o?.instrument_name === "string" ? o.instrument_name : null;
    const m = name ? NAME.exec(name) : null;
    if (!o || !m || m[1] !== currency) continue;
    const [, , dd, mon, yy, k, cp] = m;
    const mm = MONTHS[mon];
    if (!mm) continue;
    const expiration = `20${yy}-${mm}-${dd.padStart(2, "0")}`;
    // Deribit options expire 08:00 UTC.
    const expMs = Date.parse(`${expiration}T08:00:00Z`);
    const strike = Number(k);
    if (!Number.isFinite(expMs) || !(strike > 0) || expMs < now || expMs > now + maxDte * 86_400_000) continue;
    const idx = num(o.estimated_delivery_price);
    if (index == null && idx != null && idx > 0) index = idx;
    const ts = num(o.creation_timestamp);
    if (ts != null && ts > asOf) asOf = ts;
    const fwd = num(o.underlying_price);
    let e = byExp.get(expiration);
    if (!e) { e = { expMs, forward: fwd, strikes: new Map() }; byExp.set(expiration, e); }
    if (e.forward == null && fwd != null) e.forward = fwd;
    const iv = num(o.mark_iv);
    const oi = num(o.open_interest);
    const leg: DeribitChainLeg = {
      instrument: name!,
      bidUsd: usd(num(o.bid_price), fwd),
      askUsd: usd(num(o.ask_price), fwd),
      markUsd: usd(num(o.mark_price), fwd),
      iv: iv != null && iv > 0 ? iv / 100 : null,
      oi: oi != null && oi >= 0 ? oi : null,
    };
    let s = e.strikes.get(strike);
    if (!s) { s = { call: null, put: null }; e.strikes.set(strike, s); }
    if (cp === "C") s.call = leg; else s.put = leg;
  }
  const expiries: DeribitChainExpiry[] = [...byExp.entries()]
    .sort((a, b) => a[1].expMs - b[1].expMs)
    .map(([expiration, e]) => ({
      expiration,
      dte: Math.max(0, Math.round(((e.expMs - now) / 86_400_000) * 10) / 10),
      forward: e.forward,
      strikes: [...e.strikes.entries()].sort((a, b) => a[0] - b[0]).map(([strike, v]) => ({ strike, call: v.call, put: v.put })),
    }));
  return {
    source: DERIBIT_CHAIN_SOURCE,
    currency,
    index,
    asOf: asOf > 0 ? new Date(asOf).toISOString() : null,
    expiries,
  };
}

/** The `n` strikes on each side of the forward (the at-the-money row is the first ≥ forward). */
export function deribitStrikesNear(e: DeribitChainExpiry, n: number): readonly DeribitChainStrike[] {
  if (e.forward == null || e.strikes.length === 0) return e.strikes.slice(0, 2 * n);
  let atm = e.strikes.findIndex(s => s.strike >= e.forward!);
  if (atm < 0) atm = e.strikes.length - 1;
  return e.strikes.slice(Math.max(0, atm - n), atm + n);
}
