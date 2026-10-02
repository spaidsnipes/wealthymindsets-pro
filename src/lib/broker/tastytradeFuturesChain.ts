import { parseFuturesNotation } from "@/lib/marketData/futuresNotation";

/**
 * TASTYTRADE'S NESTED FUTURES-OPTION CHAIN, READ BY ITS OWN SPEC
 * (developer.tastytrade.com/openapi/instruments.json,
 * FuturesNestedOptionChainSerializer): `futures` (the SPECIFIC contracts) and
 * `option-chains` grouped by `underlying-symbol` → `expirations` → `strikes`
 * { strike-price, call, put }.
 *
 * Garden 18 §LXXXI/§LXXXVII/§XCV: futures options are not equity options —
 * every option keeps its parent future (a specific contract, never the
 * continuous chart symbol), its option root, settlement and expiry. PURE.
 */

export interface FutureContract { readonly symbol: string; readonly streamer: string | null; readonly expiration: string | null; readonly dte: number | null; readonly activeMonth: boolean }
/** `call`/`put` are order symbols; `callStreamer`/`putStreamer` are DXLink's — both tastytrade's own, never assembled. */
export interface FopStrike { readonly strike: number; readonly call: string | null; readonly put: string | null; readonly callStreamer: string | null; readonly putStreamer: string | null }
/** tastytrade's price increments: `value` applies below `threshold` (absent on the last tier). */
export interface TickTier { readonly value: number; readonly threshold: number | null }
export interface FopExpiration {
  readonly parent: string;
  readonly optionRoot: string | null;
  readonly expiration: string;
  readonly dte: number | null;
  readonly type: string | null;
  readonly settlement: string | null;
  readonly tickSizes: readonly TickTier[];
  /** $ per point of option premium: tastytrade's notional-value ÷ display-factor (MNQ 0.02 / 0.01 = 2). Null when not stated. */
  readonly multiplier: number | null;
  /** When the option stops trading (tastytrade's own instant), or null. */
  readonly stopsTradingAt: string | null;
  readonly strikes: readonly FopStrike[];
}
export interface FuturesOptionChain { readonly futures: readonly FutureContract[]; readonly expirations: readonly FopExpiration[] }

/**
 * The expiration a chain should OPEN on: the first one still trading
 * (serving ES1! 2026-10-01 23:50 CDT: the panel opened on that day's 0DTE an
 * hour after it stopped — IVx 119.5% over dead quotes). Its own
 * `stopsTradingAt` decides; unknown is treated as still trading. PURE.
 */
export function firstLiveExpiration<T extends { readonly stopsTradingAt: string | null; readonly expiration?: string }>(expirations: readonly T[], nowMs: number): T | null {
  // Equity chains carry no instant (serving SPY 2026-10-02 00:38 CDT opened on
  // the expired Oct 1): the date's US close stands in — 21:00Z, the later of
  // 16:00 EDT/EST, so a still-trading expiry is never skipped.
  const endOf = (e: T) => {
    const t = e.stopsTradingAt ? Date.parse(e.stopsTradingAt) : NaN;
    if (Number.isFinite(t)) return t;
    return e.expiration ? Date.parse(`${e.expiration}T21:00:00Z`) : NaN;
  };
  const live = expirations.find(e => { const t = endOf(e); return !Number.isFinite(t) || t > nowMs; });
  return live ?? expirations[0] ?? null;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const num = (v: unknown) => { const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN; return Number.isFinite(n) ? n : null; };

export function readFuturesOptionChain(data: unknown): FuturesOptionChain {
  const d = (data ?? {}) as { futures?: unknown[]; "option-chains"?: unknown[] };
  const futures: FutureContract[] = (d.futures ?? []).flatMap(f => {
    const o = f as Record<string, unknown>;
    const symbol = str(o.symbol);
    return symbol ? [{ symbol, streamer: str(o["streamer-symbol"]), expiration: str(o["expiration-date"]), dte: num(o["days-to-expiration"]), activeMonth: o["active-month"] === true }] : [];
  }).sort((a, b) => (a.dte ?? 1e9) - (b.dte ?? 1e9));
  const expirations: FopExpiration[] = [];
  for (const ch of d["option-chains"] ?? []) {
    const c = ch as Record<string, unknown>;
    for (const ex of (c.expirations as unknown[] | undefined) ?? []) {
      const e = ex as Record<string, unknown>;
      const parent = str(e["underlying-symbol"]) ?? str(c["underlying-symbol"]);
      const expiration = str(e["expiration-date"]);
      if (!parent || !expiration) continue;
      const strikes: FopStrike[] = ((e.strikes as unknown[] | undefined) ?? []).flatMap(s => {
        const k = s as Record<string, unknown>;
        const strike = num(k["strike-price"]);
        return strike != null ? [{ strike, call: str(k.call), put: str(k.put), callStreamer: str(k["call-streamer-symbol"]), putStreamer: str(k["put-streamer-symbol"]) }] : [];
      }).sort((a, b) => a.strike - b.strike);
      const tickSizes: TickTier[] = ((e["tick-sizes"] as unknown[] | undefined) ?? []).flatMap(t => {
        const o = t as Record<string, unknown>;
        const value = num(o.value);
        return value != null && value > 0 ? [{ value, threshold: num(o.threshold) }] : [];
      });
      const nv = num(e["notional-value"]), df = num(e["display-factor"]);
      const multiplier = nv != null && df != null && df > 0 ? Number((nv / df).toPrecision(10)) : null;
      expirations.push({ parent, optionRoot: str(e["option-root-symbol"]), expiration, dte: num(e["days-to-expiration"]), type: str(e["expiration-type"]), settlement: str(e["settlement-type"]), tickSizes, multiplier, stopsTradingAt: str(e["stops-trading-at"]), strikes });
    }
  }
  expirations.sort((a, b) => (a.dte ?? 1e9) - (b.dte ?? 1e9) || a.parent.localeCompare(b.parent));
  return { futures, expirations };
}

/**
 * TASTYTRADE'S NESTED EQUITY-OPTION CHAIN (`/option-chains/{sym}/nested`),
 * read into the SAME shape as the futures-option chain so equity options and
 * futures options are one experience (Garden 18 §LX): the underlying stands
 * where the parent future stands (its own streamer symbol), every expiration's
 * multiplier is the chain's shares-per-contract, and the chain's tick tiers
 * apply to every expiration. Different economics, one interaction. PURE.
 */
export function readEquityOptionChain(data: unknown): FuturesOptionChain {
  const items = ((data ?? {}) as { items?: unknown[] }).items ?? [];
  const futures: FutureContract[] = [];
  const expirations: FopExpiration[] = [];
  for (const it of items) {
    const c = it as Record<string, unknown>;
    const underlying = str(c["underlying-symbol"]);
    if (!underlying) continue;
    if (!futures.some(f => f.symbol === underlying)) futures.push({ symbol: underlying, streamer: underlying, expiration: null, dte: null, activeMonth: true });
    const shares = num(c["shares-per-contract"]);
    const tickSizes: TickTier[] = ((c["tick-sizes"] as unknown[] | undefined) ?? []).flatMap(t => {
      const o = t as Record<string, unknown>;
      const value = num(o.value);
      return value != null && value > 0 ? [{ value, threshold: num(o.threshold) }] : [];
    });
    for (const ex of (c.expirations as unknown[] | undefined) ?? []) {
      const e = ex as Record<string, unknown>;
      const expiration = str(e["expiration-date"]);
      if (!expiration) continue;
      const strikes: FopStrike[] = ((e.strikes as unknown[] | undefined) ?? []).flatMap(s => {
        const k = s as Record<string, unknown>;
        const strike = num(k["strike-price"]);
        return strike != null ? [{ strike, call: str(k.call), put: str(k.put), callStreamer: str(k["call-streamer-symbol"]), putStreamer: str(k["put-streamer-symbol"]) }] : [];
      }).sort((a, b) => a.strike - b.strike);
      expirations.push({ parent: underlying, optionRoot: str(c["root-symbol"]), expiration, dte: num(e["days-to-expiration"]), type: str(e["expiration-type"]), settlement: str(e["settlement-type"]), tickSizes, multiplier: shares != null && shares > 0 ? shares : null, stopsTradingAt: null, strikes });
    }
  }
  expirations.sort((a, b) => (a.dte ?? 1e9) - (b.dte ?? 1e9) || a.parent.localeCompare(b.parent));
  return { futures, expirations };
}

/** The futures product behind a chart symbol: NQ1! → NQ, /MNQZ6 → MNQ, ES1! → ES. Null when it is not a future. */
export function futuresProductFor(chartSymbol: string): string | null {
  return parseFuturesNotation(chartSymbol)?.root ?? null;
}

/** The strikes nearest a reference price (the chain is long; the trader starts at the money). */
export function strikesNear(strikes: readonly FopStrike[], price: number | null, n = 12): readonly FopStrike[] {
  if (price == null || !Number.isFinite(price) || strikes.length <= n) return strikes.slice(0, n);
  let i = 0;
  while (i < strikes.length - 1 && strikes[i].strike < price) i++;
  const from = Math.max(0, Math.min(strikes.length - n, i - Math.floor(n / 2)));
  return strikes.slice(from, from + n);
}

/** The increment tastytrade accepts at this price (first tier whose threshold is above it). Null when unknown. */
export function tickFor(tiers: readonly TickTier[], price: number): number | null {
  for (const t of tiers) if (t.threshold == null || price < t.threshold) return t.value;
  return tiers.length ? tiers[tiers.length - 1].value : null;
}

/** A price snapped to the nearest lawful increment, or null when no increment is known. */
export function snapToTick(tiers: readonly TickTier[], price: number): number | null {
  const tick = tickFor(tiers, price);
  if (tick == null || !Number.isFinite(price)) return null;
  const snapped = Math.round(price / tick) * tick;
  return Number(snapped.toFixed(6));
}
