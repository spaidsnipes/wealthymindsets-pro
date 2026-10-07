/**
 * Reads the referenced FVG's ledger through the ONE bar source and the ONE
 * engine (fvgBarSource + detectFvgs) — the same path the journal's reference
 * field uses — so Review can see what happened to the territory after the
 * decision. Read only; asked only when the trader presses for it.
 */
import { detectFvgs, type FvgLedger } from "@/lib/marketData/fvg/fvgEngine";
import { fetchFvgBars } from "@/lib/marketData/fvg/fvgBarSource";
import { parseFvgObjectId } from "./fvgDecisionReference";

export async function loadFvgLedgerFor(objectId: string, nowMs: number, fetcher?: Parameters<typeof fetchFvgBars>[0]["fetcher"]): Promise<{ ledger: FvgLedger } | { reason: string }> {
  const id = parseFvgObjectId(objectId);
  if (!id) return { reason: "the reference is not an FVG object id" };
  const bars = await fetchFvgBars({ symbol: id.symbol, timeframe: id.timeframe, bars: 3000, nowMs, fetcher });
  if (!bars.ok) return { reason: bars.reason };
  return { ledger: detectFvgs(bars.bars, { symbolId: id.symbol, timeframe: id.timeframe }) };
}
