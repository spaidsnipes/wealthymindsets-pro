"use client";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import {
  activeSceneBus,
  type ActiveSceneBus,
  type ActiveScenePublication,
} from "./activeSceneBus";
import type { SceneCompilation } from "./compileScene";

/**
 * React bindings over the ActiveSceneBus singleton — mirrors the
 * decisionContextBus / useDecisionContext split so there is one house style for
 * "pure module + thin concurrent-safe hook".
 *
 * `usePublishScene` is for a ROUTE that owns a capital column.
 * `useActiveScene` is for the SHELL, which owns none and must never invent one.
 *
 * SSR NOTE: the server snapshot is `null` — no route has published during a
 * server render, and `null` means UNOBSERVED. That is the correct server
 * answer, and it makes the first client render agree with it, so the shell
 * never flashes a reduced navigation before the route has said anything. It
 * also means navigation reduction is a CLIENT effect, which is honest: the
 * server genuinely does not know what the trader's book holds.
 */

/**
 * Publish this route's compiled scene for the duration of the mount.
 *
 * Only call this from a route that actually OWNS a capital column. A route
 * without a broker or a book publishes a `capitalAtRisk: false` it cannot
 * back — see the `/command-deck` note in activeSceneBus.ts.
 */
export function usePublishScene(
  route: string,
  compilation: SceneCompilation | null,
  bus: ActiveSceneBus = activeSceneBus,
): void {
  // One token per mounted instance, so unmount can only clear its own claim.
  const tokenRef = useRef<ReturnType<ActiveSceneBus["claim"]> | null>(null);
  if (tokenRef.current === null) tokenRef.current = bus.claim();
  const token = tokenRef.current;

  useEffect(() => {
    if (compilation === null) return;
    bus.publish(token, route, compilation);
  }, [bus, token, route, compilation]);

  // Separate effect with an empty dep list: the release must run at UNMOUNT,
  // not on every compilation change. Folding it into the effect above would
  // clear and republish on every tick, which is a visible flicker in the shell.
  useEffect(() => () => { bus.release(token); }, [bus, token]);
}

/**
 * Read whatever route currently owns a capital column. `null` = UNOBSERVED:
 * no route on screen can see a book. Callers must not read that as "flat".
 */
export function useActiveScene(bus: ActiveSceneBus = activeSceneBus): ActiveScenePublication | null {
  const subscribe = useCallback((onChange: () => void) => bus.subscribe(onChange), [bus]);
  const getSnapshot = useCallback(() => bus.getActiveScene(), [bus]);
  const getServerSnapshot = useCallback(() => null, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * The single question the app shell is allowed to ask about capital.
 *
 * Returns a three-state answer rather than a boolean, because the difference
 * between "no exposure observed" and "nothing on screen can observe exposure"
 * is exactly the distinction §14.1 exists to protect. A boolean would collapse
 * them, and it would collapse them in the dangerous direction.
 */
export type CapitalObservation = "AT_RISK" | "NO_EXPOSURE_OBSERVED" | "UNOBSERVED";

export function useCapitalObservation(bus: ActiveSceneBus = activeSceneBus): CapitalObservation {
  const publication = useActiveScene(bus);
  return useMemo<CapitalObservation>(() => {
    if (publication === null) return "UNOBSERVED";
    return publication.compilation.capitalAtRisk ? "AT_RISK" : "NO_EXPOSURE_OBSERVED";
  }, [publication]);
}
