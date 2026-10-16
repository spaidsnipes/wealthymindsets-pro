/**
 * PLATE 33 · TRADE LINES ON THE CHART (Garden 19 finish line, Founder 2026-10-15).
 * "Drag the lines. Units match the market: ticks and dollars for futures, pips for forex, premium plus
 * the stock trigger for options." Shares and dollars for stocks.
 *
 * Before: a position drawing carried one 10px chip, "Entry 30100.00  RR 3.00". Now each line names
 * itself at its right end — "Target 30,160.00 · +240 ticks · +$1,200", "Entry 30,100.00 · 3.0R",
 * "Stop 30,080.00 · −80 ticks · −$400" — from the one economics owner (contractEconomics.ts): per ONE
 * contract / share / coin, never a size the chart does not hold. Forex speaks pips. Pure.
 */
import { instrumentEconomics } from "@/lib/marketData/contractEconomics";
import { forexPairCodes } from "@/lib/marketData/canonicalIdentity";

const sgn = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "");
const fmtPx = (p: number, dp: number) => p.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const money = (v: number) => `${sgn(v)}$${Math.abs(v).toLocaleString("en-US", { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : 2 })}`;

/** The move from entry to `price` in the market's units, signed for the trade (profit positive). */
export function moveWords(symbol: string, side: "LONG" | "SHORT", entry: number, price: number): string {
  const move = side === "LONG" ? price - entry : entry - price;
  const pair = forexPairCodes(symbol);
  if (pair) {
    const pip = /JPY/.test(symbol.toUpperCase()) ? 0.01 : 0.0001;
    const pips = Math.round((move / pip) * 10) / 10;
    return `${sgn(pips)}${Math.abs(pips)} pips`;
  }
  const e = instrumentEconomics(symbol, entry);
  if (e.status !== "PRICED") return "";
  if (e.unit === "contract" && e.tickSize && e.tickValue) {
    const ticks = Math.round(move / e.tickSize);
    return `${sgn(ticks)}${Math.abs(ticks).toLocaleString("en-US")} ticks · ${money(ticks * e.tickValue)}`;
  }
  if (e.unit === "share") return `${money(move)} /share`;
  if (e.unit === "coin") return `${money(move)} /coin`;
  return "";
}

export interface TradeLineLabels {
  readonly entry: string;
  readonly target: string | null;
  readonly stop: string | null;
}

export function tradeLineLabels(
  symbol: string, side: "LONG" | "SHORT", entry: number, target: number | null, stop: number | null, dp: number,
): TradeLineLabels {
  const risk = stop != null ? Math.abs(entry - stop) : 0;
  const reward = target != null ? Math.abs(target - entry) : 0;
  const r = risk > 0 && target != null ? ` · ${(reward / risk).toFixed(1)}R` : "";
  const unit = (p: number) => { const w = moveWords(symbol, side, entry, p); return w ? ` · ${w}` : ""; };
  return {
    entry: `${side === "LONG" ? "Long" : "Short"} · Entry ${fmtPx(entry, dp)}${r}`,
    target: target != null ? `Target ${fmtPx(target, dp)}${unit(target)}` : null,
    stop: stop != null ? `Stop ${fmtPx(stop, dp)}${unit(stop)}` : null,
  };
}

/**
 * PLATE 33 · OPTIONS — "premium plus the stock trigger" (Options · TSLA 250C · on the stock chart).
 * With an option chosen in the room for THIS underlying, the drawn position reads in the option's terms:
 * the entry line is the stock TRIGGER ("Trigger 248.50 · buy call"), and target / stop say the premium the
 * contract would carry there. The premium is an ESTIMATE from the contract's own quote and Greeks
 * (mid + Δ·move + ½Γ·move², never under intrinsic) — marked "≈", and absent when the quote or Δ is missing.
 */
export interface OptionLegForLines {
  readonly underlying: string;
  readonly contractType: "call" | "put";
  readonly strike: number;
  readonly bid?: number; readonly ask?: number; readonly last?: number;
  readonly delta?: number; readonly gamma?: number;
}

const finite = (v: number | undefined): v is number => typeof v === "number" && Number.isFinite(v);

/** The contract's premium now: the mid when both sides quote, else the last trade; null when neither. */
export function optionPremiumNow(o: OptionLegForLines): number | null {
  if (finite(o.bid) && finite(o.ask) && o.bid > 0 && o.ask >= o.bid) return (o.bid + o.ask) / 2;
  return finite(o.last) && o.last > 0 ? o.last : null;
}

/** Estimated premium with the stock at `price`, from the stock at `entry`; null without a premium or Δ. */
export function optionPremiumAt(o: OptionLegForLines, entry: number, price: number): number | null {
  const p0 = optionPremiumNow(o);
  if (p0 == null || !finite(o.delta)) return null;
  const m = price - entry;
  const est = p0 + o.delta * m + 0.5 * (finite(o.gamma) ? o.gamma : 0) * m * m;
  const intrinsic = o.contractType === "call" ? Math.max(0, price - o.strike) : Math.max(0, o.strike - price);
  return Math.max(0.01, intrinsic, est);
}

export function optionTradeLineLabels(
  o: OptionLegForLines, entry: number, target: number | null, stop: number | null, dp: number,
): TradeLineLabels {
  const prem = (p: number) => { const v = optionPremiumAt(o, entry, p); return v == null ? "" : ` · premium ≈ ${v.toFixed(2)}`; };
  return {
    entry: `Trigger ${fmtPx(entry, dp)} · buy ${o.contractType}`,
    target: target != null ? `Target ${fmtPx(target, dp)}${prem(target)}` : null,
    stop: stop != null ? `Stop ${fmtPx(stop, dp)}${prem(stop)}` : null,
  };
}
