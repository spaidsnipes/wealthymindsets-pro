/**
 * decisionLifecycle — THE ONE OWNER OF "WHERE IS THE TRADER IN THIS DECISION."
 * 2026-09-27, Garden 16 §13 / §15 / §32 / §33.
 *
 * THE DEFECT (control walk, local /charts at 1440): the Workspace's Experience
 * mode row (PREP · OBSERVE · WAIT · EXECUTE · MANAGE · REVIEW · LEARN) and the
 * Command Deck's phase control (Prep · Approach · Decide · In Trade ·
 * Post-Exit · Review) were two owners of one fact. The deck's phase lived in
 * `ChartsDashboard` room state and recompiled the chain; the mode row wrote the
 * DecisionContextBus and nothing on /charts listened, so pressing it changed
 * only its own aria-current. §15: one owner per truth. §40: a control saved
 * with no consumer is DEAD.
 *
 * THE AUTHORITY THIS FILE ENCODES
 *   §32 — "Command Deck lifecycle: OBSERVING → PREPARING → IN TRADE → MANAGING
 *          → POST-EXIT / REVIEW. Attached to symbol, timeframe, Decision_ID,
 *          thesis, WAIT, risk, broker, orders, position, management, receipt."
 *   §13 — "COMMAND DECK = current decision/trade lifecycle control; ROOM = the
 *          trader's primary human job changed."
 *   Command Center — "PREPARING / LEARNING / REVIEWING / COMMUNITY? → ITS REAL
 *          EXPERIENCE." and Garden 11 — "LEARN = WOW Academy / structured
 *          mastery."
 *
 * THE MODEL
 *   ONE state, the LifecycleStage, is held by the DecisionContextBus (the
 *   singleton both controls already share). Its seven values are the six
 *   lifecycle modes of the Experience row PLUS POST_EXIT — the one lifecycle
 *   moment the deck names that the mode row does not. Both controls are
 *   PROJECTIONS of that one stage and both WRITE it:
 *
 *     stage       mode row shows   deck shows     chain reads
 *     OBSERVE     OBSERVE          Prep           PREPARATION   ← lifecycle start
 *     PREP        PREP             Prep           PREPARATION
 *     WAIT        WAIT             Approach       APPROACH
 *     EXECUTE     EXECUTE          Decide         DECISION
 *     MANAGE      MANAGE           In Trade       POSITION
 *     POST_EXIT   REVIEW           Post-Exit      POST_EXIT
 *     REVIEW      REVIEW           Review         REVIEW
 *
 *   Every press round-trips on its own control: press a mode → that mode is
 *   current; press a deck phase → that phase is current. The table's two
 *   collapses (OBSERVE/PREP share the deck's Prep; POST_EXIT/REVIEW share the
 *   row's REVIEW — §32 writes "POST-EXIT / REVIEW" as one stop) are the ONLY
 *   places the two vocabularies disagree in grain, and the tests pin them.
 *
 *   LEARN IS NOT A LIFECYCLE STAGE. It is a changed human job with a real
 *   experience (the Academy). `routeForMode("LEARN")` names that door; it is
 *   never silently mapped onto a trade phase.
 *
 * WHAT THIS FILE NEVER DOES (§33): mint, hold, or reset a Decision_ID. A
 * lifecycle stage is where the trader says they are; the decision's identity
 * is owned by the decision spine and is never born from a button press here.
 *
 * PURE — no React, no I/O.
 */

import type { ExperienceMode } from "./decisionContextBus";
import type { TradePhase } from "../marketData/viewModels/selectDecisionChain";

export type LifecycleStage =
  | "OBSERVE"
  | "PREP"
  | "WAIT"
  | "EXECUTE"
  | "MANAGE"
  | "POST_EXIT"
  | "REVIEW";

/** §32's order — OBSERVING first. */
export const LIFECYCLE_STAGES: readonly LifecycleStage[] = [
  "OBSERVE",
  "PREP",
  "WAIT",
  "EXECUTE",
  "MANAGE",
  "POST_EXIT",
  "REVIEW",
] as const;

/**
 * Where a lifecycle begins — on first arrival and on every new market (§32
 * "attached to symbol": a stage said on TSLA is not a stage on ES1!). It is the
 * bus's own default mode and it reads PREPARATION in the chain, so neither
 * control's resting face changes by unifying them.
 */
export const LIFECYCLE_START: LifecycleStage = "OBSERVE";

const PHASE_FOR_STAGE: Readonly<Record<LifecycleStage, TradePhase>> = {
  OBSERVE: "PREPARATION", // "pre-market or between opportunities"
  PREP: "PREPARATION", // "Plan the session before the bell."
  WAIT: "APPROACH", // "Hold the thesis; wait for permission." / "watching a setup form"
  EXECUTE: "DECISION", // "Place the planned decision." / "signal fired, deciding"
  MANAGE: "POSITION", // "Steward the open position." / "in a trade, managing"
  POST_EXIT: "POST_EXIT",
  REVIEW: "REVIEW",
};

/**
 * The deck's write. PREPARATION writes the lifecycle START (OBSERVE): the deck
 * cannot tell observing from preparing, so it lands on where a lifecycle begins
 * rather than claiming the trader is planning a session.
 */
const STAGE_FOR_PHASE: Readonly<Record<TradePhase, LifecycleStage>> = {
  PREPARATION: LIFECYCLE_START,
  APPROACH: "WAIT",
  DECISION: "EXECUTE",
  POSITION: "MANAGE",
  POST_EXIT: "POST_EXIT",
  REVIEW: "REVIEW",
};

const MODE_FOR_STAGE: Readonly<Record<LifecycleStage, ExperienceMode>> = {
  OBSERVE: "OBSERVE",
  PREP: "PREP",
  WAIT: "WAIT",
  EXECUTE: "EXECUTE",
  MANAGE: "MANAGE",
  POST_EXIT: "REVIEW", // §32: "POST-EXIT / REVIEW" — one stop on the mode row
  REVIEW: "REVIEW",
};

export function phaseForStage(stage: LifecycleStage): TradePhase {
  return PHASE_FOR_STAGE[stage];
}

export function stageForPhase(phase: TradePhase): LifecycleStage {
  return STAGE_FOR_PHASE[phase];
}

export function modeForStage(stage: LifecycleStage): ExperienceMode {
  return MODE_FOR_STAGE[stage];
}

/** The Academy — Garden 11 "LEARN = WOW Academy"; wmDestinations' House door. */
export const ACADEMY_HREF = "/education";

export type ModeRoute =
  | { readonly kind: "STAGE"; readonly stage: LifecycleStage }
  | { readonly kind: "ROOM"; readonly room: "ACADEMY"; readonly href: string; readonly reason: string };

/**
 * What pressing a mode MEANS. Total over the seven modes: six are lifecycle
 * stages; LEARN is a changed human job and names its room instead.
 */
export function routeForMode(mode: ExperienceMode): ModeRoute {
  switch (mode) {
    case "LEARN":
      return {
        kind: "ROOM",
        room: "ACADEMY",
        href: ACADEMY_HREF,
        reason: "LEARN is not a trade-lifecycle stage — it is a changed job, and it opens the Academy.",
      };
    case "PREP":
    case "OBSERVE":
    case "WAIT":
    case "EXECUTE":
    case "MANAGE":
    case "REVIEW":
      return { kind: "STAGE", stage: mode };
  }
}

/** The stage a mode writes, or null for a non-lifecycle job (LEARN). */
export function stageForMode(mode: ExperienceMode): LifecycleStage | null {
  const r = routeForMode(mode);
  return r.kind === "STAGE" ? r.stage : null;
}

/**
 * The phase a room compiles its chain with, for ITS market. A stage declared on
 * another symbol does not travel (§32 "attached to symbol"); a non-lifecycle
 * job (LEARN, set elsewhere) has no phase and reads as the lifecycle start
 * rather than inventing one. `stageSymbol === null` means "not yet attached",
 * which belongs to whichever market first attaches it.
 */
export function lifecyclePhaseFor(
  ctx: { readonly stage: LifecycleStage | null; readonly stageSymbol: string | null },
  symbol: string,
): TradePhase {
  if (ctx.stageSymbol !== null && ctx.stageSymbol !== symbol) return phaseForStage(LIFECYCLE_START);
  return phaseForStage(ctx.stage ?? LIFECYCLE_START);
}

/** Words for the room's read-back line under the mode row. */
export const DECK_PHASE_LABEL: Readonly<Record<TradePhase, string>> = {
  PREPARATION: "Prep",
  APPROACH: "Approach",
  DECISION: "Decide",
  POSITION: "In Trade",
  POST_EXIT: "Post-Exit",
  REVIEW: "Review",
};
