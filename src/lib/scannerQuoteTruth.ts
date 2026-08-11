export type ScannerQuoteQuality = "DELAYED" | "STALE" | "UNAVAILABLE";

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
      title: "The latest refresh did not return this symbol; the previous delayed quote is retained.",
    };
  }
  return {
    quality: "DELAYED",
    label: "DELAYED",
    title: "Consolidated quote may lag the live tape.",
  };
}
