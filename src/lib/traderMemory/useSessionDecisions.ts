"use client";

/**
 * useSessionDecisions — ONE compilation of "what this trader has decided",
 * for every surface that needs to read it.
 *
 * FOUND WRITTEN TWICE.
 *
 * The merge below (live decision-memory snapshots, plus the journal's
 * snapshots for any decision the store does not already hold) existed
 * verbatim in two places:
 *
 *   src/lib/marketData/viewModels/useMarketCanvasVM.ts  (the canvas compiler)
 *   src/app/command-deck/page.tsx                       (the deck's WORKSPACE)
 *
 * Bringing the deck's WORKSPACE equipment into the chart room needed a third
 * reader, and a third hand-written copy is the point at which "the same
 * merge" stops being true by construction and starts being true by
 * coincidence. Two rooms answering "what does my own record say" with two
 * independently-maintained merges is precisely the second semantic brain the
 * workspace canon bans: one compilation, many readers.
 *
 * WHY THIS RETURNS THE JOURNAL BOOK TOO.
 *
 * `useJournalBook` is deliberately a SINGLE subscription — its own header
 * records that two hooks reading the same localStorage key on one mount is
 * how a surface renders a coverage note that disagrees with the list above
 * it. The deck reads `coverage` and `entries` as well as the snapshots, so
 * this hook hands the whole read back rather than subscribing a second time
 * beside it. Callers that only want the merged list take `.decisions` and
 * ignore the rest.
 */

import * as React from "react";
import { useDecisionMemory } from "./useDecisionMemory";
import {
  useJournalBook,
  type JournalBookRead,
} from "./adapters/useJournalSnapshots";
import type { DecisionMemorySnapshot } from "./viewModels/selectProcessLandscape";

export interface SessionDecisionsRead {
  /**
   * Store decisions first, then journal decisions the store does not
   * already carry. Store order is preserved — it is the live record.
   */
  readonly decisions: readonly DecisionMemorySnapshot[];
  /** The same journal read the merge was built from — no second subscription. */
  readonly journal: JournalBookRead;
}

/**
 * Pure merge, extracted so the precedence rule can be tested without a
 * React harness — and so the rule lives in exactly one place.
 *
 * PRECEDENCE: the store wins on `decisionId` collision. The store holds the
 * live, in-session record; the journal holds what was written down. When
 * both describe one decision, the live one is the newer statement.
 */
export function mergeSessionDecisions(
  storeDecisions: readonly DecisionMemorySnapshot[],
  journalDecisions: readonly DecisionMemorySnapshot[],
): readonly DecisionMemorySnapshot[] {
  const ids = new Set(storeDecisions.map((d) => d.decisionId));
  return [...storeDecisions, ...journalDecisions.filter((d) => !ids.has(d.decisionId))];
}

/**
 * Subscribe to the trader's own record for `ownerId`. Null/empty owner
 * yields an empty, stable read — both underlying hooks are owner-guarded,
 * so this never leaks one trader's decisions into another's surface.
 */
export function useSessionDecisions(
  ownerId: string | null | undefined,
): SessionDecisionsRead {
  const storeDecisions = useDecisionMemory(ownerId ?? null);
  const journal = useJournalBook(ownerId ?? null);
  const journalDecisions = journal.snapshots;

  const decisions = React.useMemo(
    () => mergeSessionDecisions(storeDecisions, journalDecisions),
    [storeDecisions, journalDecisions],
  );

  return React.useMemo(() => ({ decisions, journal }), [decisions, journal]);
}

export default useSessionDecisions;
