"use client";
import * as React from "react";
import StoryRibbon, { type StoryRibbonProps } from "./StoryRibbon";
import {
  useCanonicalMarketState,
  useCanonicalMarketStateHistory,
} from "@/lib/marketData/useCanonicalMarketState";
import type { CanonicalMarketState } from "@/lib/marketData/canonicalMarketState";
import { useMarketStory } from "@/lib/marketData/viewModels/useMarketStory";

/**
 * ConnectedStoryRibbon — the wiring layer between the pure StoryRibbon
 * display and the CanonicalMarketStateStore that origin/main ships.
 *
 * Closes the P00290 "publisher without consumer" gap: canonical market
 * state now flows PUBLISHED → subscribe → history buffer → pure selector
 * → pure display. Zero fabrication: when the store has no snapshot for
 * the identity, StoryRibbon renders its truthful UNKNOWN state.
 *
 * CONTINUITY IS DELEGATED TO `useMarketStory`, NOT RE-IMPLEMENTED HERE.
 *
 * This docblock used to say continuity was "handled locally in a ref". It was
 * not. `chaptersRef` was declared, read, and NEVER WRITTEN TO — so the ribbon
 * was handed an empty accumulator on every render and the chapter clock could
 * only ever read zero. A DOCBLOCK IS NOT AN IMPLEMENTATION; the claim survived
 * because this component has no mount, and an unmounted component's lies are
 * never contradicted by a screen.
 *
 * The one owner of chapter continuity is `useMarketStory`. This component
 * subscribes, compiles ONCE through that hook, and hands the result down, so a
 * future mount cannot end up disagreeing with /command-deck about which
 * chapter the market is in.
 *
 * The store owns current state only, not history, and Founder doctrine
 * reserves durable history for the rights-gated memory layer — so nothing here
 * is persisted across sessions.
 */

export interface ConnectedStoryRibbonProps
  extends Omit<StoryRibbonProps, "state" | "history" | "priorChapters"> {
  /** Identity of the market state to subscribe to. null suspends the subscription. */
  identity: Pick<CanonicalMarketState, "instrumentId" | "session" | "timeframeContext"> | null;
  /** Max snapshots retained for guards that need a rolling window. Default 6. */
  historyCapacity?: number;
  /** Max chapter entries retained for continuity display. Default 6. */
  chapterHistoryCapacity?: number;
}

export function ConnectedStoryRibbon({
  identity,
  historyCapacity = 6,
  chapterHistoryCapacity = 6,
  ...rest
}: ConnectedStoryRibbonProps) {
  const current = useCanonicalMarketState(identity);
  const history = useCanonicalMarketStateHistory(identity, historyCapacity);
  const story = useMarketStory(current, history, { cap: chapterHistoryCapacity });

  // `story` is passed explicitly so StoryRibbon renders THIS compilation
  // rather than starting a second one of its own. Two selector calls on one
  // screen are two owners of one fact.
  return <StoryRibbon state={current} history={history} story={story} {...rest} />;
}

export default ConnectedStoryRibbon;
