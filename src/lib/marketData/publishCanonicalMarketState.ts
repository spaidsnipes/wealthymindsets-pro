import {
  produceCanonicalMarketState,
  type ProduceMarketStateInput,
} from "./produceCanonicalMarketState";
import {
  canonicalMarketStateStore,
  type CanonicalMarketStateStore,
  type MarketStatePublishResult,
} from "./canonicalMarketStateStore";
import type { MarketQualityState } from "./canonicalMarketState";

export interface PublishCanonicalMarketStateOptions {
  readonly qualityState?: MarketQualityState;
  readonly staleAfterMs?: number;
  /** Test or isolated-runtime injection. Production uses the singleton owner. */
  readonly store?: CanonicalMarketStateStore;
}

/**
 * The canonical runtime command for Market State.
 *
 * Callers provide evidence available at time T. This command derives the
 * quality state, validates and freezes the packet, then publishes it through
 * the single runtime owner. No caller may bypass sealing or maintain a second
 * competing Market State map.
 */
export function publishCanonicalMarketState(
  input: ProduceMarketStateInput,
  options: PublishCanonicalMarketStateOptions = {},
): MarketStatePublishResult {
  const state = produceCanonicalMarketState(input, {
    qualityState: options.qualityState,
    staleAfterMs: options.staleAfterMs,
  });
  return (options.store ?? canonicalMarketStateStore).publish(state);
}
