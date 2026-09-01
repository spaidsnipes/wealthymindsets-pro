import type { ProviderTapeSource } from "./providerTapeElection";

export const REST_QUOTE_NO_TAPE_POLL_MS = 5_000;
export const REST_QUOTE_WITH_TAPE_POLL_MS = 15_000;

/** Snapshots support display context; they must not shadow or duplicate a tape. */
export function restQuoteNextPollDelayMs(tapeSource: ProviderTapeSource | null): number {
  return tapeSource ? REST_QUOTE_WITH_TAPE_POLL_MS : REST_QUOTE_NO_TAPE_POLL_MS;
}
