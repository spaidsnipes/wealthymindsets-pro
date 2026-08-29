import type { CanonicalMarketState } from "./canonicalMarketState";

export type HeroPriceChronology =
  | { readonly state: "OBSERVED_AGE"; readonly ageMs: number; readonly label: string; readonly detail: string }
  | { readonly state: "UNVERIFIED"; readonly ageMs: null; readonly label: string; readonly detail: string }
  | { readonly state: "MISSING"; readonly ageMs: null; readonly label: null; readonly detail: string };

function formatAge(ageMs: number): string {
  if (ageMs < 1_000) return `${ageMs}ms`;
  if (ageMs < 60_000) return `${(ageMs / 1_000).toFixed(1)}s`;
  return `${(ageMs / 60_000).toFixed(1)}m`;
}

/**
 * Fail-closed presentation adapter for the Command Deck hero.
 *
 * A transport/server receipt timestamp is not proof of market observation
 * time. Until CanonicalMarketState carries an explicit chronology-resolution
 * field, only a LIVE packet with a valid observed -> available -> captured
 * sequence may display an exact age. Delayed/proxy/replay packets retain their
 * truthful quality label but never turn a receipt-time delta into market truth.
 */
export function selectHeroPriceChronology(state: CanonicalMarketState | null): HeroPriceChronology {
  if (!state || state.price.last == null) {
    return {
      state: "MISSING",
      ageMs: null,
      label: null,
      detail: "No canonical price observation is available.",
    };
  }

  const { eventAt, availableAt } = state.price;
  const chronologyValid =
    eventAt != null &&
    availableAt != null &&
    Number.isFinite(eventAt) &&
    Number.isFinite(availableAt) &&
    Number.isFinite(state.capturedAt) &&
    eventAt > 0 &&
    availableAt >= eventAt &&
    state.capturedAt >= availableAt;

  if (state.qualityState !== "LIVE" || !chronologyValid) {
    return {
      state: "UNVERIFIED",
      ageMs: null,
      label: "observation age unverified",
      detail: `${state.qualityState.toLowerCase()} price evidence does not prove an exact market-observation age.`,
    };
  }

  const ageMs = state.capturedAt - eventAt;
  return {
    state: "OBSERVED_AGE",
    ageMs,
    label: `observed ${formatAge(ageMs)} ago`,
    detail: "Exact age is derived from validated canonical observation chronology.",
  };
}
