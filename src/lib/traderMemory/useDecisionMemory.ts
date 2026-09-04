"use client";
import { useCallback, useSyncExternalStore } from "react";
import {
  decisionMemoryStore,
  type DecisionMemoryStore,
} from "./decisionMemoryStore";
import type { DecisionMemoryRecord } from "./decisionMemory";
import type { DecisionMemorySnapshot } from "./viewModels/selectProcessLandscape";

/**
 * useDecisionMemory — React hook subscribing to decisionMemoryStore for
 * an owner. Returns compact DecisionMemorySnapshot[] compatible with
 * every selector in src/lib/traderMemory/viewModels/*.
 *
 * Owner-scoped by contract — pass empty string / null to opt out.
 */
export function useDecisionMemory(
  ownerId: string | null | undefined,
  store: DecisionMemoryStore = decisionMemoryStore,
): readonly DecisionMemorySnapshot[] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!ownerId) return () => {};
      return store.subscribe(ownerId, () => onStoreChange());
    },
    [ownerId, store],
  );

  const getSnapshot = useCallback((): readonly DecisionMemorySnapshot[] => {
    if (!ownerId) return EMPTY;
    return store.snapshots(ownerId);
  }, [ownerId, store]);

  const getServerSnapshot = useCallback((): readonly DecisionMemorySnapshot[] => EMPTY, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Full DecisionMemoryRecord list — heavier; use when tests/replay
 *  need the immutable record graph, not just the compact snapshot. */
export function useDecisionMemoryRecords(
  ownerId: string | null | undefined,
  store: DecisionMemoryStore = decisionMemoryStore,
): readonly DecisionMemoryRecord[] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!ownerId) return () => {};
      return store.subscribe(ownerId, () => onStoreChange());
    },
    [ownerId, store],
  );

  const getSnapshot = useCallback((): readonly DecisionMemoryRecord[] => {
    if (!ownerId) return EMPTY_RECORDS;
    return store.list(ownerId);
  }, [ownerId, store]);

  const getServerSnapshot = useCallback((): readonly DecisionMemoryRecord[] => EMPTY_RECORDS, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const EMPTY: readonly DecisionMemorySnapshot[] = Object.freeze([]);
const EMPTY_RECORDS: readonly DecisionMemoryRecord[] = Object.freeze([]);
