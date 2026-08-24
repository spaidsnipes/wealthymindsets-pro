"use client";
import { useCallback, useSyncExternalStore } from "react";
import {
  decisionContextBus,
  type DecisionContext,
  type DecisionContextBus,
  type ExperienceMode,
} from "./decisionContextBus";

/**
 * useDecisionContext — thin, concurrent-safe React binding over the
 * DecisionContextBus singleton (or an injected bus for tests/stories).
 *
 * Returns the current DecisionContext plus stable callbacks to drive it. The
 * shell reads `mode`/`question` to reorganize emphasis around the human's
 * current job; user controls call `setMode`, market signals call `proposeMode`
 * (hysteresis-gated inside the bus).
 *
 * Server snapshot mirrors the bus's deterministic default so SSR and the first
 * client render agree (no hydration mismatch).
 */
export interface UseDecisionContext {
  readonly context: DecisionContext;
  readonly setMode: (mode: ExperienceMode, question?: string) => void;
  readonly setQuestion: (question: string) => void;
  readonly proposeMode: (mode: ExperienceMode) => void;
}

export function useDecisionContext(
  bus: DecisionContextBus = decisionContextBus,
): UseDecisionContext {
  const subscribe = useCallback((onChange: () => void) => bus.subscribe(onChange), [bus]);
  const getSnapshot = useCallback(() => bus.getContext(), [bus]);

  const context = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setMode = useCallback(
    (mode: ExperienceMode, question?: string) => { bus.setMode(mode, question); },
    [bus],
  );
  const setQuestion = useCallback((question: string) => { bus.setQuestion(question); }, [bus]);
  const proposeMode = useCallback((mode: ExperienceMode) => { bus.proposeMode(mode); }, [bus]);

  return { context, setMode, setQuestion, proposeMode };
}
