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

import { CONTRACT_MULTIPLIERS, contractSpecKey } from "@/lib/paperTrade";
import { classifySymbol, futuresRootOf, toYahooSymbol, type AssetClass } from "./symbolAssetClass";

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
  // Exchange minimum price fluctuations (2026-09-27; see CONTRACT_MULTIPLIERS).
  "MNQ1!": 0.25,     // $0.50 / tick
  "MES1!": 0.25,     // $1.25 / tick
  "YM1!": 1,         // $5.00 / tick
  "MYM1!": 1,        // $0.50 / tick
  "M2K1!": 0.1,      // $0.50 / tick
  "MCL1!": 0.01,     // $1.00 / tick
  "MGC1!": 0.1,      // $1.00 / tick
  "SI1!": 0.005,     // $25.00 / tick
  "NG1!": 0.001,     // $10.00 / tick
  "HG1!": 0.0005,    // $12.50 / tick
  "ZB1!": 0.03125,   // 1/32 point = $31.25
  "ZN1!": 0.015625,  // 1/64 point (half of 1/32) = $15.625
  "6E1!": 0.00005,   // $6.25 / tick
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
    // The row is found by the SAME function contractMultiplier uses, so the
    // rail's money and the paper book's money cannot pick different rows.
    const key = contractSpecKey(sym);
    const pv = key === null ? undefined : CONTRACT_MULTIPLIERS[key];
    const tick = key !== null && Object.prototype.hasOwnProperty.call(CONTRACT_TICK_SIZES, key) ? CONTRACT_TICK_SIZES[key] : undefined;
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
    // QUOTE CURRENCY IS ASKED OF THE NOTATION OWNER. Found in source
    // (2026-09-26): this was `/USD$/` over the typed string, so /paper's own
    // "BTC" and "ETH" — USD markets by the product's own definition — were
    // refused CRYPTO_NOT_USD. `toYahooSymbol` resolves every USD form (BTC,
    // BTCUSD, BTC/USD, BTC.COINBASE, a pinned base like SUI) to a
    // `{TICKER}-USD` market and deliberately leaves USDT/USDC unresolved, so
    // BTCUSDT stays refused: USDT is not USD.
    if (!toYahooSymbol(sym).endsWith("-USD")) {
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

/**
 * AN ORDERABLE PRICE — `price` on the instrument's own tick grid.
 *
 * Found on the glass (2026-09-26, TSLA 15m, Draw › Long Position): the plan's
 * anchors were raw pixel prices — ENTRY 369.9904, STOP 366.9931 — and the
 * rail had to say "≈299.7 ticks". No venue takes a stop at 366.9931, and on
 * ES a quarter-point grid makes an off-grid plan unorderable. A plan is placed
 * where an order could be: the nearest tick. Instruments with no tick on file
 * (spot FX, crypto venues, contracts without a published spec) are returned
 * unchanged — rounding to a guessed grid would be a second fabrication.
 */
export function snapToTick(symbol: string, price: number): number {
  if (!Number.isFinite(price)) return price;
  const e = instrumentEconomics(symbol, price);
  if (e.status !== "PRICED" || e.tickSize == null) return price;
  const decimals = (String(e.tickSize).split(".")[1] ?? "").length;
  return Number((Math.round(price / e.tickSize) * e.tickSize).toFixed(decimals));
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

/**
 * Money a trader can read at any size. Two decimals at and above a cent; below
 * a cent, enough digits to stay true (Sheriff, 2026-09-26: a sub-dollar stock's
 * rail read "37 ticks × $0.0001 = $0.00", a line that contradicts itself).
 */
export function formatMoney(n: number): string {
  if (n === 0 || Math.abs(n) >= 0.01) return formatUsd(n);
  return `${n < 0 ? "-" : ""}$${moneyDigits(Math.abs(n))}`;
}

/** The receipt's number: the same precision rule, no symbol, no grouping. */
export function moneyDigits(n: number): string {
  if (n === 0 || Math.abs(n) >= 0.01) return n.toFixed(2);
  const decimals = Math.min(8, Math.max(4, 1 - Math.floor(Math.log10(Math.abs(n)))));
  return n.toFixed(decimals);
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
  // A plan with a non-finite price is not money; it is named, never printed as $NaN.
  const finite = [plan.entry, plan.stop].every(Number.isFinite) && (plan.target == null || Number.isFinite(plan.target));
  if (!finite) {
    return {
      status: "REFUSED",
      economics,
      words: "$ risk withheld — the plan has no finite prices",
      rewardWords: null,
      receipt: `REFUSED:NO_PLAN_PRICES:${economics.root}`,
    };
  }
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
  const ticksWord = stopTicks == null ? null : formatTicks(stopTicks);
  // ON THE GRID the sum is ticks × tick value. OFF THE GRID (a plan saved before
  // anchors snapped) a rounded tick count would not multiply out, so the
  // line states the distance in points instead and still adds up.
  const words = ticksWord == null || economics.tickValue == null
    ? `${formatMoney(riskPerUnit)} ${per}`
    : ticksWord.startsWith("≈")
    ? `off tick grid · ${Number(riskPoints.toPrecision(7))} pts × ${formatMoney(economics.pointValue)} = ${formatMoney(riskPerUnit)} ${per}`
    : `${ticksWord} ${ticksWord === "1" ? "tick" : "ticks"} × ${formatTickValue(economics.tickValue)} = ${formatMoney(riskPerUnit)} ${per}`;
  const rewardWords = rewardPerUnit == null ? null : `reward ${formatMoney(rewardPerUnit)} ${per}`;
  const receipt = [
    "PRICED",
    economics.root,
    `tick=${economics.tickSize ?? "NA"}`,
    `pv=${economics.pointValue}`,
    `ticks=${stopTicks == null ? "NA" : formatTicks(stopTicks)}`,
    `risk=${moneyDigits(riskPerUnit)}`,
    `reward=${rewardPerUnit == null ? "NA" : moneyDigits(rewardPerUnit)}`,
    economics.unit,
  ].join(":");
  return { status: "PRICED", economics, riskPoints, stopTicks, riskPerUnit, rewardPerUnit, words, rewardWords, receipt };
}
