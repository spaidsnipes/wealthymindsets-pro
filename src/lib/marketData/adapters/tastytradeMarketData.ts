import { certifySource, type SourceCertification } from "../sourceCapabilityCertification";

export interface TastytradeMarketDataObservation {
  readonly configured: boolean;
  readonly connected: boolean;
  readonly quotes: boolean;
  readonly realTime: boolean | null;
  readonly note?: string;
}
/**
 * Admit Tastytrade to the canonical matrix without converting configuration,
 * account auth, or a quote-token grant into market-event evidence.
 */
export function certifyTastytradeMarketData(
  observation: TastytradeMarketDataObservation,
): SourceCertification {
  const note = !observation.configured
    ? "Tastytrade OAuth configuration is incomplete; no market-data probe was attempted."
    : !observation.connected
      ? "Tastytrade is configured but the authenticated account probe did not connect; the failed edge is not certified."
      : !observation.quotes
        ? "Tastytrade account access passed, but no quote-token capability was obtained."
        : "Tastytrade quote-token access was observed, but no timestamped market event has been normalized into the canonical store yet.";
  return certifySource("tastytrade", [{
    capability: "OPTIONS",
    status: "NOT_IMPLEMENTED",
    fidelity: "NONE",
    note: observation.note?.trim() || note,
  }]);
}
