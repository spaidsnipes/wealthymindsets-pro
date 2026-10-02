/**
 * DID YOU MEAN THE FUTURE? — serving chart, 2026-10-01 21:00 CDT.
 *
 * `/charts?symbol=NQ` is a stock ticker by the classifier's honest rule (ES is
 * Eversource, CL is Colgate — bare letters ARE stocks). So a trader who types
 * a futures root by hand lands on "NO BAR HISTORY", while tastytrade was
 * streaming /NQZ26 live the same minute. The search palette already answers
 * "NQ" with NQ1! first; this hands the same answer to the empty chart, so the
 * dead end becomes one click.
 *
 * Only a catalogued continuous contract is offered, never a guess. PURE.
 */
import { CURATED_SYMBOLS } from "@/lib/marketData/curatedSymbolCatalog";
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";

const CONTINUOUS = new Set(CURATED_SYMBOLS.map(s => s.sym).filter(s => /^[A-Z0-9]{1,4}1!$/.test(s)));

export function futuresFormHint(chartSymbol: string): string | null {
  const sym = chartSymbol.trim().toUpperCase();
  if (!/^[A-Z0-9]{1,4}$/.test(sym)) return null;
  if (classifySymbol(sym) === "FUTURES") return null;
  const cont = `${sym}1!`;
  return CONTINUOUS.has(cont) ? cont : null;
}
