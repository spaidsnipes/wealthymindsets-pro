/**
 * CONTRACT ECONOMICS — what one price point is WORTH, per unit, for the
 * instrument on the chart. Garden 16 §17: "a chart can look right and still be
 * financially wrong."
 *
 * Found in source (2026-09-26): the risk rail printed the stop distance in
 * price points only — "STOP / INVALIDATION … · risk 5.00 (0.08%)". The same
 * five points read identically on TSLA ($5.00 per share), ES1! ($250.00 per
 * contract) and GC1! ($500.00 per contract). Nothing on the chart carried the
 * chain PRICE MOVE → TICKS → POINT VALUE → CURRENCY.
 *
 * WHAT THIS OWNS: the TICK SIZE of the contracts that already carry a
 * published point value, and the arithmetic that joins the two. The POINT
 * VALUE stays with its one owner, `CONTRACT_MULTIPLIERS` (src/lib/paperTrade.ts),
 * read here directly so a missing entry is seen as missing, not as 1x.
 *
 * WHAT IT KEYS ON: the futures ROOT from `futuresRootOf` (the one asset-class
 * owner), so `ES1!`, `ES=F` and `/ES` get the same money and a micro (`MES1!`)
 * never inherits its big brother's multiplier.
 *
 * Values are exchange contract specifications, cross-checked against the
 * broker's own instrument record (Webull US_FUTURES, 2026-09-26: ESZ6 size 50
 * min_tick 0.25 XCME · NQZ6 20 / 0.25 XCME · RTYZ6 50 / 0.10 XCME · GCZ6 100 /
 * 0.10 XCEC · CLX6 1000 / 0.01 XNYM). US equities quote in $0.01 at and above
 * $1.00 and $0.0001 below it (SEC Rule 612).
 *
 * REFUSALS ARE NAMED, NEVER PRICED: a futures root with no published point
 * value, spot FX (money depends on the trader's lot), a cash index (not
 * tradable), a crypto pair not quoted in USD, an unknown instrument. A
 * plausible wrong number reads as authoritative; a named refusal does not.
 *
 * PURE. DETERMINISTIC. No module state — a symbol switch cannot carry money
 * from one instrument to the next.
 */

import { CONTRACT_MULTIPLIERS } from "@/lib/paperTrade";
import { classifySymbol, futuresRootOf, type AssetClass } from "./symbolAssetClass";

/**
 * Minimum price increment for every contract that has a point value. Keys
 * mirror `CONTRACT_MULTIPLIERS` exactly (a Sentinel pins it): a point value
 * with no tick, or a tick with no point value, is half a contract spec.
 */
export const CONTRACT_TICK_SIZES: Readonly<Record<string, number>> = Object.freeze({
  "NQ1!": 0.25,
  "ES1!": 0.25,
  "RTY1!": 0.1,
  "GC1!": 0.1,
  "CL1!": 0.01,
});

/** SEC Rule 612 minimum quoting increments for US equities. */
export const EQUITY_TICK_AT_OR_ABOVE_ONE_DOLLAR = 0.01;
export const EQUITY_TICK_BELOW_ONE_DOLLAR = 0.0001;

export type EconomicsUnit = "contract" | "share" | "coin";

export type EconomicsRefusal =
  | "NO_POINT_VALUE"
  | "SPOT_FX_LOT"
  | "CASH_INDEX"
  | "CRYPTO_NOT_USD"
  | "UNKNOWN_INSTRUMENT";

export type InstrumentEconomics =
  | {
      readonly status: "PRICED";
      readonly symbol: string;
      readonly assetClass: AssetClass;
      /** The contract root for futures (`ES`), the symbol itself otherwise. */
      readonly root: string;
      readonly unit: EconomicsUnit;
      readonly currency: "USD";
      /** Currency value of a one-point move for ONE unit. */
      readonly pointValue: number;
      /** Minimum price increment, or null when it is not on file (crypto venues differ). */
      readonly tickSize: number | null;
      readonly tickValue: number | null;
    }
  | {
      readonly status: "REFUSED";
      readonly symbol: string;
      readonly assetClass: AssetClass;
      readonly root: string;
      readonly refusal: EconomicsRefusal;
      readonly reason: string;
    };

const upper = (s: string) => (s ?? "").trim().toUpperCase();

export function instrumentEconomics(symbol: string, refPrice: number | null): InstrumentEconomics {
  const sym = upper(symbol);
  const assetClass = classifySymbol(sym);
  const refuse = (root: string, refusal: EconomicsRefusal, reason: string): InstrumentEconomics =>
    ({ status: "REFUSED", symbol: sym, assetClass, root, refusal, reason });

  if (assetClass === "FUTURES") {
    const root = futuresRootOf(sym) ?? sym;
    const key = `${root}1!`;
    const pv = Object.prototype.hasOwnProperty.call(CONTRACT_MULTIPLIERS, key) ? CONTRACT_MULTIPLIERS[key] : undefined;
    const tick = Object.prototype.hasOwnProperty.call(CONTRACT_TICK_SIZES, key) ? CONTRACT_TICK_SIZES[key] : undefined;
    if (!(typeof pv === "number" && pv > 0 && typeof tick === "number" && tick > 0)) {
      return refuse(root, "NO_POINT_VALUE", `no published point value on file for ${root}`);
    }
    return {
      status: "PRICED", symbol: sym, assetClass, root, unit: "contract", currency: "USD",
      pointValue: pv, tickSize: tick, tickValue: pv * tick,
    };
  }
  if (assetClass === "EQUITY") {
    const tick = refPrice != null && Number.isFinite(refPrice) && refPrice > 0 && refPrice < 1
      ? EQUITY_TICK_BELOW_ONE_DOLLAR
      : EQUITY_TICK_AT_OR_ABOVE_ONE_DOLLAR;
    return {
      status: "PRICED", symbol: sym, assetClass, root: sym, unit: "share", currency: "USD",
      pointValue: 1, tickSize: tick, tickValue: tick,
    };
  }
  if (assetClass === "CRYPTO") {
    if (!/USD$/.test(sym.replace(/[-/]/g, ""))) {
      return refuse(sym, "CRYPTO_NOT_USD", `${sym} is not quoted in USD`);
    }
    return {
      status: "PRICED", symbol: sym, assetClass, root: sym, unit: "coin", currency: "USD",
      pointValue: 1, tickSize: null, tickValue: null,
    };
  }
  if (assetClass === "FOREX") return refuse(sym, "SPOT_FX_LOT", "spot FX money depends on your lot size — not on this chart");
  if (assetClass === "INDEX") return refuse(sym, "CASH_INDEX", "a cash index is not tradable — its futures carry the money");
  return refuse(sym, "UNKNOWN_INSTRUMENT", "instrument class unknown — no money is guessed");
}

export type RiskEconomics =
  | {
      readonly status: "PRICED";
      readonly economics: Extract<InstrumentEconomics, { status: "PRICED" }>;
      readonly riskPoints: number;
      /** Stop distance in ticks, or null when the tick is not on file. */
      readonly stopTicks: number | null;
      readonly riskPerUnit: number;
      readonly rewardPerUnit: number | null;
      /** The sub-line under STOP / INVALIDATION. */
      readonly words: string;
      /** The sub-line under TARGET, or null with no target. */
      readonly rewardWords: string | null;
      readonly receipt: string;
    }
  | {
      readonly status: "REFUSED";
      readonly economics: InstrumentEconomics;
      readonly words: string;
      /** A refused instrument prices no reward either. */
      readonly rewardWords: null;
      readonly receipt: string;
    };

/** "$1,234.50" — fixed two decimals, grouped, locale-free (same bytes everywhere). */
export function formatUsd(n: number): string {
  const sign = n < 0 ? "-" : "";
  const [int, frac] = Math.abs(n).toFixed(2).split(".");
  return `${sign}$${int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${frac}`;
}

/** A whole tick count prints whole; an off-grid stop says it is approximate. */
export function formatTicks(t: number): string {
  const r = Math.round(t);
  return Math.abs(t - r) < 1e-6 * Math.max(1, Math.abs(t)) ? `${r}` : `≈${t.toFixed(1)}`;
}

/** Tick value words: cents stay cents ($0.01), sub-cent ticks keep their digits ($0.0001). */
function formatTickValue(v: number): string {
  return v >= 0.01 ? formatUsd(v) : `$${Number(v.toPrecision(4))}`;
}

export function selectRiskEconomics(
  symbol: string,
  plan: { readonly entry: number; readonly stop: number; readonly target: number | null },
): RiskEconomics {
  const economics = instrumentEconomics(symbol, plan.entry);
  if (economics.status === "REFUSED") {
    return {
      status: "REFUSED",
      economics,
      words: `$ risk withheld — ${economics.reason}`,
      rewardWords: null,
      receipt: `REFUSED:${economics.refusal}:${economics.root}`,
    };
  }
  const riskPoints = Math.abs(plan.entry - plan.stop);
  const rewardPoints = plan.target == null ? null : Math.abs(plan.target - plan.entry);
  const riskPerUnit = riskPoints * economics.pointValue;
  const rewardPerUnit = rewardPoints == null ? null : rewardPoints * economics.pointValue;
  const stopTicks = economics.tickSize == null ? null : riskPoints / economics.tickSize;
  const per = `per 1 ${economics.unit}`;
  const words = stopTicks != null && economics.tickValue != null
    ? `${formatTicks(stopTicks)} ticks × ${formatTickValue(economics.tickValue)} = ${formatUsd(riskPerUnit)} ${per}`
    : `${formatUsd(riskPerUnit)} ${per}`;
  const rewardWords = rewardPerUnit == null ? null : `reward ${formatUsd(rewardPerUnit)} ${per}`;
  const receipt = [
    "PRICED",
    economics.root,
    `tick=${economics.tickSize ?? "NA"}`,
    `pv=${economics.pointValue}`,
    `ticks=${stopTicks == null ? "NA" : formatTicks(stopTicks)}`,
    `risk=${riskPerUnit.toFixed(2)}`,
    `reward=${rewardPerUnit == null ? "NA" : rewardPerUnit.toFixed(2)}`,
    economics.unit,
  ].join(":");
  return { status: "PRICED", economics, riskPoints, stopTicks, riskPerUnit, rewardPerUnit, words, rewardWords, receipt };
}
