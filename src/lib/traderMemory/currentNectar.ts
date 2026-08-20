import { getKnownSessionSymbols } from "@/lib/marketData/sessionSymbolStore";
import { aggregateNectar, type NectarAggregate } from "./nectarComparison";

/**
 * Single canonical reader of the CURRENT Nectar aggregate for a symbol from the
 * live sessionSymbolStore. One home used by the journal capture, the journal
 * compare view, and the Vault "since last visit" — so no consumer re-implements
 * the store→aggregate mapping (which is where drift creeps in). Returns null
 * when the symbol has no live observations (never fabricates).
 */
export function currentNectarForSymbol(symbol: string): NectarAggregate | null {
  const upper = symbol.toUpperCase();
  const rows = getKnownSessionSymbols()
    .filter((s) => s.symbol.toUpperCase() === upper)
    .map((s) => ({
      tradeCount: s.slot.stats.tradeCount,
      delta: s.slot.stats.delta,
      buyVol: s.slot.stats.buyVol,
      sellVol: s.slot.stats.sellVol,
      bigTradeCount: s.slot.stats.bigTradeCount,
      horizonSec: s.slot.horizon?.startedAtSec ?? null,
      lastTradeAtMs: s.slot.lastTradeAtMs ?? null,
    }));
  return aggregateNectar(rows);
}
