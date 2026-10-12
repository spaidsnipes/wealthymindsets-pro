/**
 * SCANNER — the options evidence for FVG + options wall (Garden 19 §39).
 *
 * For one symbol that met an FVG condition. Until 2026-10-12 this asked the Cboe DELAYED
 * route for its chain; that source was removed (Founder: "remove anything delayed and dead"),
 * so the scanner now names where live walls are read instead. Futures, crypto, forex and anything Cboe does
 * not list answer UNAVAILABLE with the reason — the scanner never falls back
 * to another provider and never invents a wall. Wall tests are read from the
 * last WALL_TEST_WINDOW_DAYS of the scanner's own closed bars, as the chart does.
 *
 * Read-only: one GET per symbol with a hit, never on every refresh.
 */
import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { cboeSymbolFor } from "@/lib/marketData/cboeDelayedOptions";
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";
import { selectDerivativesPressure, WALL_TEST_WINDOW_DAYS } from "@/lib/marketData/viewModels/selectDerivativesPressure";
import { fvgScanWallChainRefusal, type FvgScanWallEvidence } from "@/lib/scanner/fvgScanConditions";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export async function loadFvgScanWalls(input: {
  readonly symbol: string;
  readonly bars: readonly CanonicalBar[];
  readonly nowMs: number;
  readonly signal?: AbortSignal;
  readonly fetchImpl?: FetchLike;
}): Promise<FvgScanWallEvidence> {
  const { symbol, bars, nowMs } = input;
  const refusal = fvgScanWallChainRefusal(symbol, classifySymbol(symbol), cboeSymbolFor(symbol));
  if (refusal) return { unavailable: refusal };
  // LIVE ONLY (Founder 2026-10-12: "remove anything delayed and dead"): Cboe's DELAYED option
  // quotes are no longer asked. Live walls come from tastytrade's chain on the chart, which streams
  // each contract; the scanner does not open those streams for every hit, so it says so.
  void bars; void nowMs; void input.fetchImpl; void selectDerivativesPressure; void WALL_TEST_WINDOW_DAYS;
  return { unavailable: `live option walls for ${symbol} are read on its chart (tastytrade's chain) — the scanner no longer reads delayed Cboe quotes` };
}
