/**
 * ONE CAMERA, NAMED SCOPES (F15A regime lighting × F14 "contradiction not
 * averaged"). Serving NQ1! 5m, 2026-10-06 08:43 CDT — three regime words on
 * one screen, none of them naming what it measured:
 *
 *   header        "REGIME BALANCE"                       canonical regime dimension —
 *                                                        the recent TAPE (direction × tick range)
 *   glass title   "REGIME · COMPRESSION · channel capped" selectRegime — the same TAPE's
 *                                                        volatility falling across snapshots
 *   rail          "EXPANDED · BREATHING OUT · ATR 1.83×"  Market Breathing — the chart's
 *                                                        CLOSED BARS (ATR vs its 120-bar median)
 *
 * The owners do not disagree by mistake: they read different windows. The
 * tape is the last minutes of prints; the bars are hours of the chart's
 * timeframe. Volatility can compress inside the newest minutes of an
 * expanded day. So nothing here re-derives or averages a regime. The glass
 * names the scope of its word (TAPE), and when the tape's volatility verdict
 * and the bars' breathing point opposite ways it says so on the title — a
 * named contradiction, never three silent claims.
 *
 * PURE. Reads the regime-lighting VM and the breathing reading; returns the
 * same VM with its title scoped, plus the receipt words.
 */
import type { RegimeLightingVM } from "@/lib/marketData/viewModels/selectRegimeLighting";
import type { MarketBreathing } from "./marketBreathing";

export type RegimeScopeState = "SCOPED" | "CONTRADICTION" | "BARS_UNREAD" | "NO_VERDICT";

export interface ScopedRegimeLighting {
  readonly vm: RegimeLightingVM;
  /** Receipt: SCOPED · CONTRADICTION:<tape>/<bars> · BARS_UNREAD · NO_VERDICT. */
  readonly receipt: string;
  readonly state: RegimeScopeState;
}

/** The tape verdict's volatility direction, or null when the verdict is not a volatility claim. */
function tapeVolatility(verdict: RegimeLightingVM["verdict"]): "COMPRESSED" | "EXPANDED" | null {
  if (verdict === "COMPRESSION") return "COMPRESSED";
  if (verdict === "EXPANSION") return "EXPANDED";
  return null;
}

export function scopeRegimeLighting(
  vm: RegimeLightingVM | null,
  breath: Pick<MarketBreathing, "state" | "atrRatio"> | null,
  timeframe: string,
): ScopedRegimeLighting | null {
  if (!vm) return null;
  if (!vm.verdict || !vm.title) return { vm: { ...vm, scope: "NO_VERDICT" }, receipt: "NO_VERDICT", state: "NO_VERDICT" };
  // "REGIME · X · …" → "TAPE REGIME · X · …": the word names what it measured.
  const scoped = vm.title.replace(/^REGIME · /, "TAPE REGIME · ");
  const tape = tapeVolatility(vm.verdict);
  if (!breath) return { vm: { ...vm, title: scoped, scope: "BARS_UNREAD" }, receipt: "BARS_UNREAD", state: "BARS_UNREAD" };
  if (tape && breath.state !== "NORMAL" && breath.state !== tape) {
    const tf = timeframe ? `${timeframe} ` : "";
    const title = `TAPE ${vm.verdict} ≠ ${tf}BARS ${breath.state} (ATR ${breath.atrRatio.toFixed(2)}×) · UNRESOLVED`;
    const receipt = `CONTRADICTION:${vm.verdict}/${breath.state}`;
    return { vm: { ...vm, title, scope: receipt }, receipt, state: "CONTRADICTION" };
  }
  return { vm: { ...vm, title: scoped, scope: "SCOPED" }, receipt: "SCOPED", state: "SCOPED" };
}
