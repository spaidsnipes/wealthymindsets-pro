/**
 * INSTRUMENT-AWARE RISK — the ONE ticket's $ at the stop, per family (Founder
 * P0, 2026-10-10: "never apply a stock formula to futures, options or FX").
 *
 *   STOCK          shares × |entry − stop|
 *   EQUITY_OPTION  contracts × 100 × |premium entry − premium stop|
 *   FUTURE         ticks × tick value × contracts — the tick and point value
 *                  from contractEconomics (its one owner); a root with no
 *                  published spec is REFUSED, never priced at $1 a point
 *   FUTURE_OPTION  contracts × the expiry's OWN multiplier (from the chain) ×
 *                  premium distance — no multiplier in hand → REFUSED
 *   FX             pips × pip value × units — pip 0.01 on a JPY-quoted pair,
 *                  0.0001 otherwise; the pip value is turned into USD through
 *                  the quote currency (USD-quoted: as is · USD-based: ÷ price ·
 *                  a cross: × the quote→USD rate the trader supplies, else
 *                  REFUSED)
 *   CRYPTO         coins × |entry − stop|, USD-quoted products only
 *
 * Every priced answer carries RISK_ESTIMATE_CAVEAT: a stop is an order, not a
 * guarantee. PURE.
 */

import { instrumentEconomics } from "@/lib/marketData/contractEconomics";

import type { TradeFamily } from "./instrumentCapability";

export const RISK_ESTIMATE_CAVEAT = "estimated — slippage and gaps can exceed it";
export const EQUITY_OPTION_MULTIPLIER = 100;
export const FX_LOT_UNITS = { STANDARD: 100_000, MINI: 10_000, MICRO: 1_000 } as const;
export type FxLot = keyof typeof FX_LOT_UNITS;

export interface RiskInput {
  readonly family: TradeFamily;
  /** Chart / contract symbol (futures root, FX pair, crypto product). */
  readonly symbol: string;
  /** Shares, contracts, coins — or FX units (lots × lot size). */
  readonly qty: number;
  /** Price for stocks / futures / FX / crypto; PREMIUM for options. */
  readonly entry: number | null;
  readonly stop: number | null;
  readonly target?: number | null;
  /** FUTURE_OPTION only: the expiry's own multiplier from the chain. */
  readonly multiplier?: number | null;
  /** FX cross only: 1 unit of the QUOTE currency in USD (EUR/GBP → GBP→USD). */
  readonly quoteToUsd?: number | null;
  /**
   * The side being built. When known, a stop or target on the WRONG side of the entry is refused —
   * never priced as money (trade lane, 2026-10-10: a long's target below entry read "+$40.00").
   */
  readonly side?: "BUY" | "SELL" | null;
}

export type RiskAnswer =
  | {
      readonly status: "PRICED";
      readonly riskUsd: number | null;
      readonly rewardUsd: number | null;
      /** How the number was made, in trader words ("4 ticks × $1.25 × 2 contracts"). */
      readonly basis: string;
      readonly caveat: typeof RISK_ESTIMATE_CAVEAT;
      /** The stop / target sits on the wrong side of the entry for the side being built (its $ is null). */
      readonly stopWrongSide: boolean;
      readonly targetWrongSide: boolean;
    }
  | { readonly status: "REFUSED"; readonly reason: string };

const pos = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const trim = (n: number, p = 6) => String(Number(n.toPrecision(p)));

/** A spot pair's base and quote, from EUR/USD · EURUSD · EUR_USD · EURUSD=X. */
export function fxPair(symbol: string): { base: string; quote: string } | null {
  const s = (symbol ?? "").trim().toUpperCase().replace(/=X$/, "").replace(/[/_\-\s]/g, "");
  return /^[A-Z]{6}$/.test(s) ? { base: s.slice(0, 3), quote: s.slice(3) } : null;
}

/** One pip in price: 0.01 when the pair is quoted in yen, 0.0001 otherwise. */
export function fxPipSize(symbol: string): number | null {
  const p = fxPair(symbol);
  if (!p) return null;
  return p.quote === "JPY" ? 0.01 : 0.0001;
}

/**
 * USD value of ONE pip on `units` of the pair. USD-quoted: pip × units.
 * USD-based (USD/JPY): pip × units ÷ price. A cross needs the quote→USD rate.
 */
export function fxPipValueUsd(symbol: string, units: number, price: number | null, quoteToUsd?: number | null): { usd: number } | { refused: string } {
  const p = fxPair(symbol);
  const pip = fxPipSize(symbol);
  if (!p || pip == null) return { refused: `${symbol} is not a currency pair` };
  if (!pos(units)) return { refused: "size the trade in units or lots" };
  const inQuote = pip * units;
  if (p.quote === "USD") return { usd: inQuote };
  if (p.base === "USD") return pos(price) ? { usd: inQuote / price } : { refused: `the ${p.base}/${p.quote} price is needed to turn ${p.quote} pips into USD` };
  return pos(quoteToUsd) ? { usd: inQuote * quoteToUsd } : { refused: `type the ${p.quote}→USD rate to value a ${p.base}/${p.quote} pip in USD` };
}

function finish(riskUsd: number | null, rewardUsd: number | null, basis: string): RiskAnswer {
  return { status: "PRICED", riskUsd, rewardUsd, basis, caveat: RISK_ESTIMATE_CAVEAT, stopWrongSide: false, targetWrongSide: false };
}

/** Wrong-side exits are refused AFTER pricing, so every family follows the one rule. */
function sided(a: RiskAnswer, x: RiskInput): RiskAnswer {
  if (a.status !== "PRICED" || !x.side || !pos(x.entry)) return a;
  const long = x.side === "BUY";
  const stopWrongSide = pos(x.stop) && (long ? x.stop >= x.entry : x.stop <= x.entry);
  const targetWrongSide = pos(x.target) && (long ? x.target <= x.entry : x.target >= x.entry);
  return { ...a, riskUsd: stopWrongSide ? null : a.riskUsd, rewardUsd: targetWrongSide ? null : a.rewardUsd, stopWrongSide, targetWrongSide };
}

/** $ at the stop and at the target for one ticket — the family decides the formula. */
export function instrumentRisk(x: RiskInput): RiskAnswer {
  return sided(priceRisk(x), x);
}

function priceRisk(x: RiskInput): RiskAnswer {
  const { family, qty, entry, stop } = x;
  const target = x.target ?? null;
  if (!pos(qty)) return { status: "REFUSED", reason: "size the trade first" };
  if (!pos(entry)) return { status: "REFUSED", reason: family === "EQUITY_OPTION" || family === "FUTURE_OPTION" ? "type the premium you would pay or collect" : "entry fill unknown — set a limit to price the risk" };
  const dStop = pos(stop) ? Math.abs(entry - stop) : null;
  const dTarget = pos(target) ? Math.abs(target - entry) : null;

  switch (family) {
    case "STOCK": {
      const per = (d: number | null) => (d == null ? null : d * qty);
      return finish(per(dStop), per(dTarget), dStop == null ? `${trim(qty)} shares — set a stop` : `${trim(qty)} shares × $${trim(dStop)} to the stop`);
    }
    case "CRYPTO": {
      const e = instrumentEconomics(x.symbol, entry);
      if (e.status === "REFUSED") return { status: "REFUSED", reason: e.reason };
      const per = (d: number | null) => (d == null ? null : d * qty);
      return finish(per(dStop), per(dTarget), dStop == null ? `${trim(qty)} coins — set a stop` : `${trim(qty)} coins × $${trim(dStop)} to the stop`);
    }
    case "FUTURE": {
      const e = instrumentEconomics(x.symbol, entry);
      if (e.status === "REFUSED") return { status: "REFUSED", reason: e.reason };
      const tick = e.tickSize, tv = e.tickValue;
      if (tick == null || tv == null) return { status: "REFUSED", reason: `no tick size on file for ${e.root}` };
      const ticks = (d: number | null) => (d == null ? null : d / tick);
      const usd = (d: number | null) => { const t = ticks(d); return t == null ? null : t * tv * qty; };
      const t = ticks(dStop);
      return finish(usd(dStop), usd(dTarget), t == null
        ? `${e.root}: tick ${tick} = ${money(tv)} — set a stop`
        : `${trim(t, 5)} ticks × ${money(tv)} × ${trim(qty)} contract${qty === 1 ? "" : "s"}`);
    }
    case "EQUITY_OPTION":
    case "FUTURE_OPTION": {
      const m = family === "EQUITY_OPTION" ? EQUITY_OPTION_MULTIPLIER : x.multiplier;
      if (!pos(m)) return { status: "REFUSED", reason: "the futures option's multiplier comes from its chain — open the chain to price it" };
      const usd = (d: number | null) => (d == null ? null : d * m * qty);
      return finish(usd(dStop), usd(dTarget), dStop == null
        ? `${trim(qty)} × ${trim(m)} × premium — set a premium stop (max loss buying: ${money(entry * m * qty)})`
        : `${trim(qty)} contract${qty === 1 ? "" : "s"} × ${trim(m)} × $${trim(dStop)} premium to the stop`);
    }
    case "FX": {
      const pip = fxPipSize(x.symbol);
      if (pip == null) return { status: "REFUSED", reason: `${x.symbol} is not a currency pair` };
      const pv = fxPipValueUsd(x.symbol, qty, entry, x.quoteToUsd);
      if ("refused" in pv) return { status: "REFUSED", reason: pv.refused };
      const pips = (d: number | null) => (d == null ? null : d / pip);
      const usd = (d: number | null) => { const p = pips(d); return p == null ? null : p * pv.usd; };
      const p = pips(dStop);
      return finish(usd(dStop), usd(dTarget), p == null
        ? `pip ${pip} = ${money(pv.usd)} on ${trim(qty)} units — set a stop`
        : `${trim(p, 5)} pips × ${money(pv.usd)} per pip on ${trim(qty)} units`);
    }
  }
}

/**
 * SIZE TO RISK — the largest size whose $ at the stop stays inside `budgetUsd`, from the family's own
 * per-unit risk (instrumentRisk at qty 1). Whole units for shares / contracts; crypto rounds DOWN to
 * 0.0001 coin. Null when the per-unit risk is unknown or the budget cannot buy one unit — never 0, never
 * rounded up past the budget.
 */
export function qtyForRisk(x: Omit<RiskInput, "qty">, budgetUsd: number, fractional: boolean): number | null {
  if (!pos(budgetUsd)) return null;
  const one = instrumentRisk({ ...x, qty: 1, target: null });
  if (one.status !== "PRICED" || !pos(one.riskUsd)) return null;
  const raw = budgetUsd / one.riskUsd;
  const q = fractional ? Math.floor(raw * 10_000) / 10_000 : Math.floor(raw + 1e-9);
  return q > 0 ? q : null;
}
