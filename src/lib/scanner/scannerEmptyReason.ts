/**
 * WHY THE SCANNER LIST IS EMPTY — Garden 18 §4 (2026-10-06). PURE.
 *
 * The empty state said "No signals match current filters" for every empty
 * list — including when the scan itself failed (the refresh's catch swallowed
 * the error) or returned no symbols at all. That blamed the trader's filters
 * for a provider failure. An empty result now says which of three different
 * facts it is, and when it is the filters, WHICH filters.
 */

export interface ScannerEmptyInput {
  /** Rows the last successful scan produced. */
  readonly resultsCount: number;
  /** The most recent refresh threw before producing rows. */
  readonly scanFailed: boolean;
  /** When rows were last received (ms), or null if never. */
  readonly lastRefreshAt: number | null;
  readonly search: string;
  readonly signalsActive: number;
  readonly signalsTotal: number;
  readonly minVol: number;
  readonly minPct: number;
  readonly sectors: readonly string[];
}

export function scannerEmptyReason(i: ScannerEmptyInput): string {
  if (i.resultsCount === 0) {
    if (i.scanFailed) {
      return i.lastRefreshAt == null
        ? "The scan could not be read from the quote provider — no rows have been received yet. This is not a filter result."
        : `The latest scan could not be read from the quote provider (last rows received ${new Date(i.lastRefreshAt).toLocaleTimeString()}). This is not a filter result.`;
    }
    return "The scan returned no symbols — nothing was observed to filter. This is not a filter result.";
  }
  const narrowing: string[] = [];
  if (i.search.trim()) narrowing.push(`search "${i.search.trim()}"`);
  if (i.signalsActive < i.signalsTotal) narrowing.push(`${i.signalsActive} of ${i.signalsTotal} signal types`);
  if (i.minVol > 0) narrowing.push(`volume ≥ ${i.minVol}× average`);
  if (i.minPct > 0) narrowing.push(`move ≥ ${i.minPct}%`);
  if (i.sectors.length > 0) narrowing.push(`sector ${i.sectors.join(", ")}`);
  const read = `${i.resultsCount} ${i.resultsCount === 1 ? "symbol was" : "symbols were"} read`;
  return narrowing.length === 0
    ? `${read}; none carries a signal yet.`
    : `${read}; none passes ${narrowing.join(" · ")}.`;
}
