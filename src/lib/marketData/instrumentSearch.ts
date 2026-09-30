import { rankSymbolHits, normalizeSymbolToken } from "./symbolSearchRank";

export type InstrumentSearchHit = { sym: string; label: string; cat: string; exchange?: string; aliases?: readonly string[] };

/** Rank the whole answer, so a local substring cannot bury a remote exact ticker. */
export function mergeInstrumentSearch(query: string, local: readonly InstrumentSearchHit[], remote: readonly InstrumentSearchHit[], limit = 30): InstrumentSearchHit[] {
  const seen = new Set<string>();
  return rankSymbolHits(query, [...local, ...remote].filter(hit => {
    const key = normalizeSymbolToken(hit.sym);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }), limit, { dropUnmatched: false });
}

export function instrumentSearchSelection(query: string, hits: readonly InstrumentSearchHit[]): string | null {
  // Raw text has a separate, explicit "Open as entered" action in both UIs.
  // Enter cannot mistake an unanswered human name for a canonical ticker.
  return query.trim() ? hits[0]?.sym ?? null : null;
}

/** Cancellation also gates delivery when a transport ignores AbortSignal. */
export async function fetchInstrumentSearch(query: string, signal: AbortSignal): Promise<InstrumentSearchHit[] | null> {
  const response = await fetch(`/api/symbol-search?q=${encodeURIComponent(query)}`, { cache: "no-store", signal });
  const json = await response.json() as { results?: InstrumentSearchHit[]; error?: string };
  if (signal.aborted) return null;
  if (!response.ok || json.error) throw new Error(json.error ?? `Search answered HTTP ${response.status}`);
  return (json.results ?? []).filter(hit => Boolean(hit.sym && hit.label));
}
