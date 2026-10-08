/**
 * SCANNER — the options evidence for FVG + options wall (Garden 19 §39).
 *
 * For one symbol that met an FVG condition: ask the existing Cboe DELAYED
 * route for its chain and hand it to the ONE options owner
 * (selectDerivativesPressure). Futures, crypto, forex and anything Cboe does
 * not list answer UNAVAILABLE with the reason — the scanner never falls back
 * to another provider and never invents a wall. Wall tests are read from the
 * last WALL_TEST_WINDOW_DAYS of the scanner's own closed bars, as the chart does.
 *
 * Read-only: one GET per symbol with a hit, never on every refresh.
 */
import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import { cboeSymbolFor, type CboeOptionsReceipt } from "@/lib/marketData/cboeDelayedOptions";
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
  let receipt: CboeOptionsReceipt | null = null;
  try {
    const r = await (input.fetchImpl ?? fetch)(`/api/market-data/cboe/options?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store", signal: input.signal });
    const j = (await r.json().catch(() => null)) as (CboeOptionsReceipt & { edge?: string }) | null;
    if (!r.ok || !j || !Array.isArray(j.rows)) {
      return { unavailable: `the Cboe delayed options route answered ${typeof j?.edge === "string" ? j.edge.toLowerCase().replace(/_/g, " ") : `HTTP ${r.status}`} for ${symbol}, so no option wall is read` };
    }
    receipt = j;
  } catch {
    if (input.signal?.aborted) return { unavailable: "the read was stopped" };
    return { unavailable: `the Cboe delayed options route could not be reached for ${symbol}, so no option wall is read` };
  }
  const since = nowMs - WALL_TEST_WINDOW_DAYS * 86_400_000;
  // PressureBar.time is epoch SECONDS (LegacyOhlcvTuple); CanonicalBar.asOf is ms — the ÷1000 is stated here.
  const pressureBars = bars.filter(b => b.asOf >= since).map(b => ({ time: Math.floor(b.asOf / 1000), open: b.open, high: b.high, low: b.low, close: b.close }));
  return { vm: selectDerivativesPressure(receipt, pressureBars, nowMs) };
}
