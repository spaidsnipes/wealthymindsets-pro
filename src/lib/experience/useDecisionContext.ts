"use client";
import { useCallback, useSyncExternalStore } from "react";
import {
  decisionContextBus,
  type DecisionContext,
  type DecisionContextBus,
  type ExperienceMode,
} from "./decisionContextBus";
import type { LifecycleStage } from "./decisionLifecycle";

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
  /** The Command Deck's write of the ONE lifecycle stage (decisionLifecycle). */
  readonly setStage: (stage: LifecycleStage, symbol?: string) => void;
  /**
   * A room names the market it SHOWS; a different market resets the lifecycle.
   * Returns the detach, so a room's effect is `useEffect(() => attachSymbol(symbol), …)`
   * and the market stops being "in view" when the room unmounts or moves on —
   * a trade-bearing mode pressed off-market then binds to no market.
   */
  readonly attachSymbol: (symbol: string) => () => void;
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

  const setStage = useCallback(
    (stage: LifecycleStage, symbol?: string) => { bus.setStage(stage, symbol); },
    [bus],
  );
  const attachSymbol = useCallback(
    (symbol: string) => {
      bus.attachSymbol(symbol);
      return () => { bus.detachSymbol(symbol); };
    },
    [bus],
  );

  return { context, setMode, setQuestion, proposeMode, setStage, attachSymbol };
}
