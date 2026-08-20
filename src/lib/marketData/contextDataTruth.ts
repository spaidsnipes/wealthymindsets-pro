import type { CanonicalMarketState } from "./canonicalMarketState";

/** Public feed-health vocabulary from the 2026-08-20 Market Reality canon. */
export type ContextDataState =
  | "LIVE"
  | "NEAR-LIVE"
  | "DELAYED"
  | "HISTORICAL"
  | "DEGRADED"
  | "UNKNOWN";

export interface ContextDataReading {
  readonly value: ContextDataState;
  readonly detail: string;
}

/** Aligns with the canonical Market State producer's current stale window. */
export const CONTEXT_DATA_MAX_AGE_MS = 60_000;

/**
 * Transport connectivity is evidence, never permission to promote a quote to
 * LIVE. The sealed canonical state owns fidelity; this adapter only makes the
 * older MarketQualityState vocabulary safe for the current public surface.
 */
export function selectContextDataReading(
  state: CanonicalMarketState | null,
  connected: boolean,
  source: string | null,
  nowMs: number,
): ContextDataReading {
  const feedOn = connected && !!source && source !== "unavailable";
  if (!state) {
    return feedOn
      ? { value: "UNKNOWN", detail: "feed connected · state unresolved" }
      : { value: "UNKNOWN", detail: "no feed · no state" };
  }

  const eventAt = state.price.eventAt;
  const currentEventAge = eventAt == null ? Number.POSITIVE_INFINITY : nowMs - eventAt;

  switch (state.qualityState) {
    case "LIVE":
      if (!feedOn) return { value: "DEGRADED", detail: "last-known · feed offline" };
      if (!Number.isFinite(nowMs) || currentEventAge < 0 || currentEventAge > CONTEXT_DATA_MAX_AGE_MS) {
        return { value: "DEGRADED", detail: "live claim lacks a fresh event" };
      }
      return { value: "LIVE", detail: "fresh canonical event" };
    case "DELAYED":
      return feedOn
        ? { value: "DELAYED", detail: "canonical delayed state · not live" }
        : { value: "DEGRADED", detail: "last-known delayed · feed offline" };
    case "REPLAY":
      return { value: "HISTORICAL", detail: "replay evidence" };
    case "STALE":
      return { value: "DEGRADED", detail: "stale canonical event" };
    case "PARTIAL":
      return { value: "DEGRADED", detail: "partial market evidence" };
    case "PROXY":
      return { value: "UNKNOWN", detail: "proxy evidence · fidelity unresolved" };
    case "UNAVAILABLE":
      return { value: "UNKNOWN", detail: "market evidence unavailable" };
  }
}
