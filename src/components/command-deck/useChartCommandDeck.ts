"use client";

/**
 * useChartCommandDeck — what the Command Deck drawer on /charts reads, compiled
 * ONCE, in the room, from what the room already holds. 2026-09-26, Garden 16
 * §10 + §11.
 *
 * WHY A HOOK AND NOT FORTY LINES INSIDE ChartsDashboard
 * ----------------------------------------------------
 * The drawer is fed by a dozen readings the deck page used to compile for
 * itself (job inference, emphasis, mirror, session watch, receipt, exit ramp,
 * the story with continuity). The chart room is 6,000 lines; inlining them
 * there would scatter one surface's inputs across it. This hook is called
 * EXACTLY ONCE, by the room, so it is the room's compilation — it simply lives
 * in its own file.
 *
 * WHAT IT MAY NOT DO — and a Sentinel reads this file for each of these:
 *
 *   · compile the MARKET. No `useMarketCanvasVM`, no `composeMarketCanvasVM`,
 *     no `selectDecisionChain`. The chain, the permission and the one story
 *     are handed in from the room's single `useMarketCanvasVM` call — the
 *     same objects the right rail reads. A second compile here could say
 *     PERMITTED over a rail that says WAIT.
 *   · open a wire. No `useWebSocket`, no `fetch`. The drawer reads the tape
 *     the chart already holds, through the room's props.
 *   · hold the PHASE. The trade phase is room state (ChartsDashboard owns
 *     `tradePhase`), because the one chain must answer it — and closing the
 *     drawer must not reset it.
 *
 * WHAT IT MAY DO: read the trader's OWN book. `useDecisionMemoryRecords` and
 * the job bus (`useDecisionContext`) are the trader's memory and the product's
 * one job owner, not market state; the spec names these as the subscriptions a
 * surface may hold.
 */

import { localDayKey } from "@/lib/journal/localDayKey";
import * as React from "react";

import type { CanonicalMarketState } from "@/lib/marketData/canonicalMarketState";
import type { DecisionChainVM, TradePhase } from "@/lib/marketData/viewModels/selectDecisionChain";
import type { OneStoryVM } from "@/lib/marketData/viewModels/selectOneStory";
import type { StoryVM } from "@/lib/marketData/viewModels/selectMarketStory";
import { useMarketStory } from "@/lib/marketData/viewModels/useMarketStory";
import type { PermissionVM } from "@/lib/traderMemory/viewModels/selectPermission";
import type { DecisionMemorySnapshot } from "@/lib/traderMemory/viewModels/selectProcessLandscape";
import type { JournalEntry } from "@/lib/journal/hydrateJournalEntries";
import { selectUnreviewedCloses, type UnreviewedCloses } from "@/lib/journal/selectUnreviewedCloses";
import { useDecisionContext } from "@/lib/experience/useDecisionContext";
import type { ExperienceMode } from "@/lib/experience/decisionContextBus";
import { inferJobMode } from "@/lib/experience/inferJobMode";
import { selectJobSuggestion, type JobSuggestion } from "@/lib/experience/selectJobSuggestion";
import { selectDeckEmphasis, type DeckEmphasis } from "@/lib/experience/selectDeckEmphasis";
import { deriveCompletionSignals } from "@/lib/experience/deriveCompletionSignals";
import { selectCompletionState } from "@/lib/experience/selectCompletionState";
import { composeExitRamp, type ExitRamp } from "@/lib/experience/composeExitRamp";
import { selectMirror, type MirrorVM } from "@/lib/traderMemory/viewModels/selectMirror";
import {
  selectATHOSIntervention,
  type ATHOSIntervention,
  type ATHOSMoment,
} from "@/lib/traderMemory/viewModels/selectATHOSIntervention";
import { useDecisionMemoryRecords } from "@/lib/traderMemory/useDecisionMemory";
import {
  selectDecisionReceipt,
  type DecisionReceiptVM,
} from "@/lib/traderMemory/viewModels/selectDecisionReceipt";

export interface ChartCommandDeckInput {
  readonly ownerId: string | null;
  /** The room's live cadence clock — never a second clock read here. */
  readonly nowMs: number;
  /** ROOM state. The drawer's phase control writes it; the chain reads it. */
  readonly phase: TradePhase;
  /** `chartCanvasState` — the room's one canonical subscription. */
  readonly state: CanonicalMarketState | null;
  /** `continuationHistory` — the room's one history subscription. */
  readonly history: readonly CanonicalMarketState[];
  /** `chartCanvasVM.chain` — compiled WITH `phase` by the room's one call. */
  readonly chain: DecisionChainVM | null;
  /** `chartCanvasVM.permission` — the Steward verdict the rail also reads. */
  readonly permission: PermissionVM;
  /** `chartCanvasVM.oneStory` — the story the right rail prints. */
  readonly oneStory: OneStoryVM;
  /** `useSessionDecisions` — the one merge of live memory and the journal. */
  readonly sessionDecisions: readonly DecisionMemorySnapshot[];
  /** The same subscription's journal entries — not a second journal read. */
  readonly journalEntries: readonly JournalEntry[];
  /** `chartPassportVM.resolvedCount` — how much of the market has resolved. */
  readonly resolvedObjectCount: number;
}

export interface ChartCommandDeck {
  /** The job the trader is in — the product's one job owner, read. */
  readonly job: ExperienceMode;
  /** Accept a suggested job. Suggest, never gate: nothing calls this but a press. */
  readonly acceptJob: (mode: ExperienceMode) => void;
  readonly jobSuggestion: JobSuggestion;
  readonly emphasis: DeckEmphasis;
  /** The story WITH continuity — the one `useMarketStory` call on /charts. */
  readonly story: StoryVM;
  readonly state: CanonicalMarketState | null;
  readonly history: readonly CanonicalMarketState[];
  readonly chain: DecisionChainVM | null;
  readonly permission: PermissionVM;
  /**
   * The room's one story, handed back unchanged — the plate's headline (the
   * right-of-way word and its reason) is the SAME object the right rail
   * prints, never a second reading (2026-09-27, deck canon).
   */
  readonly oneStory: OneStoryVM;
  readonly mirror: MirrorVM;
  /** What WM is watching, minus what the trader dismissed this session. */
  readonly interventions: readonly ATHOSIntervention[];
  readonly dismissIntervention: (interventionId: string) => void;
  readonly receipt: DecisionReceiptVM;
  readonly exitRamp: ExitRamp;
  readonly unreviewedCloses: UnreviewedCloses;
}

/**
 * The deck page's own phase → moment map, carried rather than re-invented.
 * Two maps would let the same phase wake different detectors in two rooms.
 */
export const PHASE_MOMENT: Readonly<Record<TradePhase, ATHOSMoment>> = {
  PREPARATION: "IDLE",
  APPROACH: "PRE_ENTRY",
  DECISION: "AT_ENTRY_TRIGGER",
  POSITION: "IN_POSITION",
  POST_EXIT: "POST_EXIT",
  REVIEW: "SESSION_REVIEW",
};

/** The session identity string every compiler on the deck page spells this way. */
function sessionIdentityAt(nowMs: number): string {
  return `session-${new Date(nowMs).toISOString().slice(0, 10)}`;
}

export function useChartCommandDeck(input: ChartCommandDeckInput): ChartCommandDeck {
  const {
    ownerId,
    nowMs,
    phase,
    state,
    history,
    chain,
    permission,
    oneStory,
    sessionDecisions,
    journalEntries,
    resolvedObjectCount,
  } = input;

  // THE ONE JOB OWNER. Same singleton the Workspace mode bar writes; the
  // drawer's suggestion chip writes it through the same door.
  const { context: jobContext, setMode } = useDecisionContext();
  const job = jobContext.mode;

  // THE STORY, WITH CONTINUITY — once. `composeMarketCanvasVM` builds a
  // chapter-less story for its own verdict; the ribbon needs the chapter
  // history, which only this hook keeps. One call, one ribbon.
  const story = useMarketStory(state, history);

  // The trader's sealed decisions. Its store's ingress has no production
  // callers today (decisionMemoryReachability pins it), so this is usually
  // empty — and the receipt then says so in words rather than inventing one.
  const decisionRecords = useDecisionMemoryRecords(ownerId);

  const unreviewedCloses = React.useMemo(
    () => selectUnreviewedCloses(journalEntries, localDayKey(new Date(nowMs))),
    [journalEntries, nowMs],
  );

  const latestDecisionRecord = React.useMemo(
    () =>
      decisionRecords.length === 0
        ? null
        : decisionRecords.reduce((latest, r) =>
            r.frozen.capturedAt > latest.frozen.capturedAt ? r : latest,
          ),
    [decisionRecords],
  );
  const receipt = React.useMemo(() => selectDecisionReceipt(latestDecisionRecord), [latestDecisionRecord]);

  // POSITION IS UNOBSERVED ON THIS SURFACE, and saying so is the rule (§14.1:
  // flat is a finding, never a default). /charts reads no broker book in the
  // room's scope; the deck page carries the same honest value.
  const jobInference = React.useMemo(
    () =>
      inferJobMode({
        position: "UNOBSERVED",
        hasUnreviewedClose:
          decisionRecords.some((r) => !!r.outcome && !r.review) || unreviewedCloses.hasUnreviewedClose,
        decision: oneStory.decision.value,
        hasResolvedMarketState: resolvedObjectCount > 0,
      }),
    [decisionRecords, unreviewedCloses.hasUnreviewedClose, oneStory.decision.value, resolvedObjectCount],
  );
  const jobSuggestion = React.useMemo(() => selectJobSuggestion(jobInference, job), [jobInference, job]);

  const emphasis = React.useMemo(
    () =>
      selectDeckEmphasis(job, {
        hasUnresolvedContradiction: oneStory.contradiction != null,
        hasSealedReceipt: !receipt.empty,
      }),
    [job, oneStory.contradiction, receipt.empty],
  );

  const mirror = React.useMemo(
    () => selectMirror({ ownerId: ownerId ?? "", decisions: sessionDecisions, nowMs }),
    [ownerId, sessionDecisions, nowMs],
  );

  // WHAT WM IS WATCHING — woken by the room's PHASE, fed the chain's own
  // dlar / clc so it cannot read a different market than the rail.
  const watch = React.useMemo(
    () =>
      selectATHOSIntervention({
        ownerId: ownerId ?? "",
        sessionIdentity: sessionIdentityAt(nowMs),
        nowMs,
        moment: PHASE_MOMENT[phase],
        sessionDecisions,
        marketState: state ?? undefined,
        dlar: chain?.dlar ?? null,
        clc: chain?.clc ?? null,
      }),
    [ownerId, nowMs, phase, sessionDecisions, state, chain],
  );

  // A REAL DISMISS. The deck page's handler was `console.debug` (spec
  // inventory item 40: P+NW). Here the trader's dismissal holds for the life
  // of the room: the intervention stops being raised in the drawer until the
  // room is left. Not persisted — a dismissal is about THIS sitting, and a
  // stored one would silence tomorrow's version of the same warning.
  const [dismissed, setDismissed] = React.useState<ReadonlySet<string>>(() => new Set());
  const dismissIntervention = React.useCallback((interventionId: string) => {
    setDismissed((current) => {
      if (current.has(interventionId)) return current;
      const next = new Set(current);
      next.add(interventionId);
      return next;
    });
  }, []);
  const interventions = React.useMemo(
    () => watch.interventions.filter((iv) => !dismissed.has(iv.id)),
    [watch.interventions, dismissed],
  );

  const exitRamp = React.useMemo(() => {
    const signals = deriveCompletionSignals({
      mode: job,
      decisionRecords,
      resolvedObjectCount,
      receiptEmpty: receipt.empty,
      decision: oneStory.decision.value,
      journalUnreviewedCloses: unreviewedCloses.today,
    });
    const assessment = selectCompletionState(signals);
    const done: string[] = [];
    if (!receipt.empty) done.push("Decision receipt sealed");
    if (resolvedObjectCount > 0) done.push(`${resolvedObjectCount} market object(s) resolved`);
    const saved: string[] = [];
    if (decisionRecords.length > 0) saved.push(`${decisionRecords.length} decision record(s) preserved`);
    return composeExitRamp({ assessment, done, saved, returnCondition: signals.returnCondition });
  }, [job, decisionRecords, resolvedObjectCount, receipt.empty, oneStory.decision.value, unreviewedCloses.today]);

  return React.useMemo(
    () => ({
      job,
      acceptJob: (mode: ExperienceMode) => setMode(mode),
      jobSuggestion,
      emphasis,
      story,
      state,
      history,
      chain,
      permission,
      oneStory,
      mirror,
      interventions,
      dismissIntervention,
      receipt,
      exitRamp,
      unreviewedCloses,
    }),
    [
      job,
      setMode,
      jobSuggestion,
      emphasis,
      story,
      state,
      history,
      chain,
      permission,
      oneStory,
      mirror,
      interventions,
      dismissIntervention,
      receipt,
      exitRamp,
      unreviewedCloses,
    ],
  );
}

export default useChartCommandDeck;
