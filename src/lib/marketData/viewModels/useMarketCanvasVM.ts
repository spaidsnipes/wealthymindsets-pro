"use client";

/**
 * useMarketCanvasVM — the React hook that wires every store /
 * subscription the Market Canvas needs and composes the shared
 * compiler in one call.
 *
 * Consumers get one line:
 *
 *   const { canvas, chain, permission, oneStory, decisionWhy } =
 *     useMarketCanvasVM({ identity, ownerId });
 *
 * Internally it:
 *   1. Subscribes to canonical market state (current + rolling history).
 *   2. Loads decision memory (session decisions + journal snapshots).
 *   3. Passes everything to composeMarketCanvasVM.
 *
 * Any decision surface (Nectar deep-dive, /paper receipts, future
 * /charts overlay) adopts Phase 3 with a single hook call. No
 * duplicated pipeline; no divergent verdict.
 */

import * as React from "react";
import {
  useCanonicalMarketState,
  useCanonicalMarketStateHistory,
} from "../useCanonicalMarketState";
import type { CanonicalMarketState } from "../canonicalMarketState";
import { useDecisionMemory } from "@/lib/traderMemory/useDecisionMemory";
import { useJournalSnapshots } from "@/lib/traderMemory/adapters/useJournalSnapshots";
import {
  composeMarketCanvasVM,
  type ComposeMarketCanvasOutput,
} from "./composeMarketCanvasVM";
import type { TradePhase } from "./selectDecisionChain";
import type { DecisionChainVM } from "./selectDecisionChain";

export interface UseMarketCanvasInput {
  /** Canonical identity to subscribe to. Null suspends. */
  readonly identity: Pick<
    CanonicalMarketState,
    "instrumentId" | "session" | "timeframeContext"
  > | null;
  /** Owner (user) ID for permission compilation. */
  readonly ownerId: string | null;
  /** Optional trade phase. Defaults to PREPARATION. */
  readonly phase?: TradePhase;
  /** Optional pre-compiled chain (skip internal chain compile). */
  readonly chain?: DecisionChainVM | null;
  /** Max snapshots retained for rolling-window selectors. Default 6. */
  readonly historyCapacity?: number;
}

/**
 * Compile the Market Canvas + every intermediate VM from the stores
 * a decision surface subscribes to. Silent-safe on null identity.
 */
export function useMarketCanvasVM(
  input: UseMarketCanvasInput,
): ComposeMarketCanvasOutput {
  const state = useCanonicalMarketState(input.identity);
  const history = useCanonicalMarketStateHistory(
    input.identity,
    input.historyCapacity ?? 6,
  );
  const storeDecisions = useDecisionMemory(input.ownerId);
  const journalDecisions = useJournalSnapshots(input.ownerId);

  const sessionDecisions = React.useMemo(() => {
    const ids = new Set(storeDecisions.map((d) => d.decisionId));
    return [
      ...storeDecisions,
      ...journalDecisions.filter((d) => !ids.has(d.decisionId)),
    ];
  }, [storeDecisions, journalDecisions]);

  // Stable timestamp per render pass — the compiler is pure so this
  // is fine. We deliberately DO NOT freeze Date.now() outside the
  // render (session-static clock) because permission rule freshness
  // and evidence age are meant to reflect the live clock.
  const nowMs = Date.now();

  return React.useMemo(
    () =>
      composeMarketCanvasVM({
        state: state ?? null,
        history,
        sessionDecisions,
        ownerId: input.ownerId ?? "",
        nowMs,
        phase: input.phase,
        chain: input.chain ?? null,
      }),
    // nowMs intentionally excluded from deps — a fresh Date.now()
    // each render is expected, and the compiler cost is O(canvas VM)
    // which is small.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, history, sessionDecisions, input.ownerId, input.phase, input.chain],
  );
}

export default useMarketCanvasVM;
