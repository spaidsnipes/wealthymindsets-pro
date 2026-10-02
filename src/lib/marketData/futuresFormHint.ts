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
import { spotMetalFutures } from "@/lib/yahooSymbol";

const CONTINUOUS = new Set(CURATED_SYMBOLS.map(s => s.sym).filter(s => /^[A-Z0-9]{1,4}1!$/.test(s)));

export function futuresFormHint(chartSymbol: string): string | null {
  const sym = chartSymbol.trim().toUpperCase();
  // Spot metals have no connected source; their refusal already names the
  // future in words (yahooSymbol.ts) — the door makes it one click. A door,
  // never a substitute: the future opens under its own name.
  const metal = spotMetalFutures(sym);
  if (metal) return metal.futures;
  if (!/^[A-Z0-9]{1,4}$/.test(sym)) return null;
  if (classifySymbol(sym) === "FUTURES") return null;
  const cont = `${sym}1!`;
  return CONTINUOUS.has(cont) ? cont : null;
}

/**
 * CFD NAMES → THE MARKET WM CAN OPEN (serving 2026-10-02 00:55 CDT: US30,
 * US500, US100, UKOIL are offered by search and chart nothing). Never a
 * substitute (searchResultCategory.test: "a near-neighbour presented as the
 * instrument asked for is a worse defect than a blank chart") — a DOOR that
 * names the different market it opens.
 */
const CFD_DOORS: Readonly<Record<string, { readonly symbol: string; readonly words: string }>> = {
  US30: { symbol: "DJI", words: "US30 is a CFD WM has no source for. The Dow cash index is a different market:" },
  US500: { symbol: "SPX", words: "US500 is a CFD WM has no source for. The S&P 500 cash index is a different market:" },
  US100: { symbol: "NDX", words: "US100 is a CFD WM has no source for. The Nasdaq-100 cash index is a different market:" },
  USOIL: { symbol: "CL1!", words: "USOIL is a CFD WM has no live source for. WTI crude futures are a different market:" },
  UKOIL: { symbol: "BZ1!", words: "UKOIL is a CFD WM has no source for. Brent crude futures are a different market:" },
};

export function cfdDoorFor(chartSymbol: string): { readonly symbol: string; readonly words: string } | null {
  return CFD_DOORS[(chartSymbol ?? "").trim().toUpperCase()] ?? null;
}
