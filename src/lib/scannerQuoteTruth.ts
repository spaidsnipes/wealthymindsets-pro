/** LIVE is set only by the page from the watch lane (scannerLiveQuote), never by a scan round. */
export type ScannerQuoteQuality = "LIVE" | "LAST LIVE" | "STALE" | "UNAVAILABLE";

export interface ScannerQuoteTruth {
  quality: ScannerQuoteQuality;
  label: ScannerQuoteQuality;
  title: string;
}

/**
 * Scanner quotes currently arrive through the consolidated delayed quote path.
 * A row reused after a failed refresh must never keep the same freshness claim.
 */
export function scannerQuoteTruth(input: {
  receivedAt?: unknown;
  reusedPrevious: boolean;
}): ScannerQuoteTruth {
  if (typeof input.receivedAt !== "number" || !Number.isFinite(input.receivedAt) || input.receivedAt <= 0) {
    return {
      quality: "UNAVAILABLE",
      label: "UNAVAILABLE",
      title: "No timestamped quote evidence is available for this row.",
    };
  }
  if (input.reusedPrevious) {
    return {
      quality: "STALE",
      label: "STALE",
      title: "The latest refresh did not return this symbol; the previous live price is retained.",
    };
  }
  // Since 2026-10-12 every scan row is priced from tastytrade's live stream (no delayed quote is
  // asked). The page overlays LIVE while the price is moving; otherwise the row says it is the
  // LAST LIVE price it holds — never "delayed".
  return {
    quality: "LAST LIVE",
    label: "LAST LIVE",
    title: "The last live tastytrade price for this row, as of this scan round.",
  };
}
