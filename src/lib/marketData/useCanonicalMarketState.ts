"use client";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import {
  canonicalMarketStateStore,
  type CanonicalMarketStateStore,
} from "./canonicalMarketStateStore";
import type { CanonicalMarketState } from "./canonicalMarketState";

/**
 * useCanonicalMarketState — thin React hook over CanonicalMarketStateStore.
 *
 * Subscribes to the singleton store (or an injected store for tests) for a
 * specific market identity (instrumentId + session + timeframeContext) and
 * returns the current sealed snapshot, or null when no snapshot has been
 * published for that identity yet.
 *
 * Concurrent-mode safe via useSyncExternalStore. Does NOT mutate state or
 * cause additional re-renders when a duplicate snapshot arrives (the store
 * itself rejects duplicates before notifying listeners).
 *
 * NEVER fabricates a state — null is a truthful "no evidence yet" and
 * consumers MUST render UNKNOWN in that case per Founder doctrine.
 */
export function useCanonicalMarketState(
  identity: Pick<CanonicalMarketState, "instrumentId" | "session" | "timeframeContext"> | null,
  store: CanonicalMarketStateStore = canonicalMarketStateStore,
): CanonicalMarketState | null {
  // Cache the identity object so subscribe fn identity is stable across renders
  // as long as its meaningful fields don't change.
  const identityRef = useRef(identity);
  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!identity) return () => {};
      return store.subscribe(identity, () => onStoreChange());
    },
    // Depend on stringified identity so React re-subscribes only when the
    // meaningful fields change, not on parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [identity?.instrumentId, identity?.session, JSON.stringify(identity?.timeframeContext ?? []), store],
  );

  const getSnapshot = useCallback((): CanonicalMarketState | null => {
    if (!identity) return null;
    return store.get(identity);
  }, // eslint-disable-next-line react-hooks/exhaustive-deps
  [identity?.instrumentId, identity?.session, JSON.stringify(identity?.timeframeContext ?? []), store]);

  // Server snapshot must also be null (never fabricate a state on the server).
  const getServerSnapshot = useCallback((): CanonicalMarketState | null => null, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * useCanonicalMarketStateHistory — accumulates recent snapshots for selectors
 * that need a rolling window (e.g. absorption detection via displacement over
 * N recent states).
 *
 * Bounded ring buffer — never grows unbounded. Callers pick the capacity.
 * Older snapshots drop off the tail.
 */
export function useCanonicalMarketStateHistory(
  identity: Pick<CanonicalMarketState, "instrumentId" | "session" | "timeframeContext"> | null,
  capacity: number = 6,
  store: CanonicalMarketStateStore = canonicalMarketStateStore,
): readonly CanonicalMarketState[] {
  const historyRef = useRef<CanonicalMarketState[]>([]);
  const current = useCanonicalMarketState(identity, store);

  useEffect(() => {
    if (!current) return;
    const last = historyRef.current[historyRef.current.length - 1];
    if (last && last.snapshotId === current.snapshotId) return;
    historyRef.current = [...historyRef.current, current].slice(-capacity);
  }, [current, capacity]);

  return historyRef.current;
}
