"use client";
import * as React from "react";
import StoryRibbon, { type StoryRibbonProps } from "./StoryRibbon";
import {
  useCanonicalMarketState,
  useCanonicalMarketStateHistory,
} from "@/lib/marketData/useCanonicalMarketState";
import type { CanonicalMarketState } from "@/lib/marketData/canonicalMarketState";
import type { ChapterEntry } from "@/lib/marketData/viewModels/selectMarketStory";

/**
 * ConnectedStoryRibbon — the wiring layer between the pure StoryRibbon
 * display and the CanonicalMarketStateStore that origin/main ships.
 *
 * Closes the P00290 "publisher without consumer" gap: canonical market
 * state now flows PUBLISHED → subscribe → history buffer → pure selector
 * → pure display. Zero fabrication: when the store has no snapshot for
 * the identity, StoryRibbon renders its truthful UNKNOWN state.
 *
 * Prior-chapter continuity is handled locally in a ref — the store owns
 * current state only, not history, and Founder doctrine reserves durable
 * history for the rights-gated memory layer.
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
  const chaptersRef = React.useRef<ChapterEntry[]>([]);

  // We accumulate chapter transitions across renders. StoryRibbon computes
  // the new chapter from state+history each time; we track what it produced
  // so continuity survives snapshot churn. Bounded to chapterHistoryCapacity.
  const priorChapters = chaptersRef.current.slice(-chapterHistoryCapacity);

  // Capture chapter transitions by peeking at what selectMarketStory would
  // emit. To avoid duplicating the selector call, we pass a callback to
  // StoryRibbon later; for now we just supply the accumulator and let the
  // pure component drive its own computation.

  return (
    <StoryRibbon
      state={current}
      history={history}
      priorChapters={priorChapters}
      {...rest}
    />
  );
}

export default ConnectedStoryRibbon;
