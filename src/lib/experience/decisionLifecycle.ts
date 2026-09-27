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
 *     stage       mode row shows   deck word     deck rail lights        chain reads
 *     OBSERVE     OBSERVE          Observing     OBSERVING               PREPARATION   ← lifecycle start
 *     PREP        PREP             Preparing     PREPARING               PREPARATION
 *     WAIT        WAIT             Approach      PREPARING               APPROACH
 *     EXECUTE     EXECUTE          Decide        PREPARING               DECISION
 *     MANAGE      MANAGE           In Trade      IN TRADE + MANAGING     POSITION
 *     POST_EXIT   REVIEW           Post-Exit     POST-EXIT / REVIEW      POST_EXIT
 *     REVIEW      REVIEW           Review        POST-EXIT / REVIEW      REVIEW
 *
 *   (2026-09-27, deck canon: the deck's stops are §32's five —
 *   LIFECYCLE_RAIL below. "In Trade" is the chain's POSITION phase, never the
 *   DECISION: a stage that is still deciding does not claim a trade.)
 *
 *   Every press round-trips on its own control: press a mode → that mode is
 *   current; press a deck phase → that phase is current. The table's two
 *   collapses (OBSERVE/PREP both start at the deck's Observing press; POST_EXIT/REVIEW share the
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
 * which belongs to whichever market first attaches it — unless it claims a
 * trade (see `stageAttachedTo`).
 */
export function lifecyclePhaseFor(
  ctx: { readonly stage: LifecycleStage | null; readonly stageSymbol: string | null },
  symbol: string,
): TradePhase {
  return phaseForStage(stageAttachedTo(ctx, symbol));
}

/**
 * The stages that CLAIM A TRADE on a market: deciding it, holding it, having
 * just left it. A stage said with no market attached (MANAGE pressed on a room
 * that names no symbol) is not a trade on whichever market opens next.
 */
export const TRADE_BEARING_STAGES: readonly LifecycleStage[] = ["EXECUTE", "MANAGE", "POST_EXIT"] as const;

export function isTradeBearingStage(stage: LifecycleStage | null): boolean {
  return stage !== null && TRADE_BEARING_STAGES.includes(stage);
}

/**
 * THE ONE RULE for "what stage is the trader in ON THIS MARKET" — read by
 * `lifecyclePhaseFor` in render and by the bus when a room attaches, so the
 * render and the owner can never disagree:
 *   · declared on another market → the lifecycle start;
 *   · declared on no market → kept when it claims no trade (OBSERVE/PREP/WAIT/
 *     REVIEW), the start when it does (EXECUTE/MANAGE/POST_EXIT) — a trade is
 *     only ever a trade on the market it was said on;
 *   · declared on THIS market → itself.
 * A non-lifecycle job (LEARN, stage null) reads the start.
 */
export function stageAttachedTo(
  ctx: { readonly stage: LifecycleStage | null; readonly stageSymbol: string | null },
  symbol: string,
): LifecycleStage {
  if (ctx.stageSymbol !== null && ctx.stageSymbol !== symbol) return LIFECYCLE_START;
  if (ctx.stageSymbol === null && isTradeBearingStage(ctx.stage)) return LIFECYCLE_START;
  return ctx.stage ?? LIFECYCLE_START;
}

/**
 * WHICH MARKET A STAGE WRITTEN WITHOUT ONE IS SAID ON (verifier LOW, round 4).
 * The Workspace mode row lives in the shell, not in a room, so it names no
 * symbol. Pressed in a room that shows no market (/journal) after /charts TSLA
 * had attached, MANAGE used to inherit TSLA as its market — and /charts TSLA
 * then read POSITION although the trader never said so on TSLA.
 *   · a trade-bearing stage is said on the market IN VIEW (`showing`), or on
 *     none — never on the last market that happened to attach;
 *   · any other stage is said on the market in view, else stays where it was.
 */
export function stageSymbolForWrite(
  stage: LifecycleStage | null,
  showing: string | null,
  current: string | null,
): string | null {
  if (isTradeBearingStage(stage)) return showing;
  return showing ?? current;
}

/** The deck's six phases, in §32's order — every phase control renders THIS order. */
export const DECK_PHASE_ORDER: readonly TradePhase[] = [
  "PREPARATION",
  "APPROACH",
  "DECISION",
  "POSITION",
  "POST_EXIT",
  "REVIEW",
] as const;

/**
 * THE RAIL — §32's five stops, drawn as ONE rail on the Command Deck plate.
 * 2026-09-27, Garden 16 §32 (+ §9 side-by-side, §10 "record the song", §36).
 *
 *   OBSERVING → PREPARING → IN TRADE → MANAGING → POST-EXIT / REVIEW
 *
 * The Founder's five words, in the Founder's order, recorded — not rewritten.
 * Each stop is a set of STAGES (what lights it) and a set of PRESSES (the
 * chain phases its buttons write through `stageForPhase`).
 *
 * IN TRADE IS THE POSITION PHASE, NOT THE DECISION (verifier LOW, round 4).
 * The first cut put "In Trade" on EXECUTE — the chain's DECISION phase
 * ("signal fired, deciding"), while the Position node read UNOBSERVED: an
 * execution word with no trade behind it. The chain owns the grain: DECISION
 * is still before the trade, and POSITION is "in a trade, managing"
 * (selectDecisionChain). So:
 *   · the DECISION press sits in PREPARING beside APPROACH, each named by its
 *     chain phase ("Approach", "Decide" — as the last stop's presses are
 *     "Post-Exit", "Review"), so a decision-phase stop never claims a trade;
 *   · IN TRADE and MANAGING are §32's two words for the chain's ONE POSITION
 *     phase, so the MANAGE stage lights both, as one span; its one press
 *     ("In Trade") lives on IN TRADE, and MANAGING carries no second button
 *     that would write the same stage.
 *
 *   stop               lit by stages       presses (phase → stage it writes)
 *   OBSERVING          OBSERVE             PREPARATION → OBSERVE
 *   PREPARING          PREP, WAIT, EXECUTE APPROACH → WAIT, DECISION → EXECUTE
 *   IN TRADE           MANAGE              POSITION    → MANAGE
 *   MANAGING           MANAGE              (none — the same phase, lit with it)
 *   POST-EXIT/REVIEW   POST_EXIT, REVIEW   POST_EXIT, REVIEW
 *
 * Every stage lights one CONTIGUOUS span of stops, and every press lands
 * inside its own stop — the tests pin both. The MANAGE stage is the trader's
 * declaration; whether a position exists is the Position node's read (§36:
 * QUOTE ≠ POSITION), never this rail's.
 */
export type LifecycleRailStopId = "OBSERVING" | "PREPARING" | "IN_TRADE" | "MANAGING" | "POST_EXIT_REVIEW";

export interface LifecycleRailStop {
  readonly id: LifecycleRailStopId;
  /** §32's own word for the stop. */
  readonly label: string;
  readonly stages: readonly LifecycleStage[];
  readonly presses: readonly TradePhase[];
}

export const LIFECYCLE_RAIL: readonly LifecycleRailStop[] = [
  { id: "OBSERVING", label: "Observing", stages: ["OBSERVE"], presses: ["PREPARATION"] },
  { id: "PREPARING", label: "Preparing", stages: ["PREP", "WAIT", "EXECUTE"], presses: ["APPROACH", "DECISION"] },
  { id: "IN_TRADE", label: "In Trade", stages: ["MANAGE"], presses: ["POSITION"] },
  { id: "MANAGING", label: "Managing", stages: ["MANAGE"], presses: [] },
  { id: "POST_EXIT_REVIEW", label: "Post-Exit / Review", stages: ["POST_EXIT", "REVIEW"], presses: ["POST_EXIT", "REVIEW"] },
] as const;

/** The stops a stage lights, in rail order. Total: every stage lights ≥ 1. */
export function railStopsForStage(stage: LifecycleStage): readonly LifecycleRailStop[] {
  const stops = LIFECYCLE_RAIL.filter((s) => s.stages.includes(stage));
  if (stops.length === 0) throw new Error(`decisionLifecycle: stage ${stage} is on no rail stop`);
  return stops;
}

/** The FIRST stop a stage lights — the stop its press lives on. */
export function railStopForStage(stage: LifecycleStage): LifecycleRailStop {
  return railStopsForStage(stage)[0];
}

/**
 * The deck's word for a stage — the rail's vocabulary, with a split stop's
 * presses said by their chain phase words (Approach, Decide; Post-Exit,
 * Review). The Workspace
 * read-back, /command-deck and the deck's rail all read THIS, so the faces of
 * the one lifecycle cannot name a stage two ways.
 */
export const STAGE_WORD: Readonly<Record<LifecycleStage, string>> = {
  OBSERVE: "Observing",
  PREP: "Preparing",
  WAIT: "Approach",
  EXECUTE: "Decide",
  MANAGE: "In Trade",
  POST_EXIT: "Post-Exit",
  REVIEW: "Review",
};

/**
 * The chain headline's word for each phase ("Managing — …"). It lived as a
 * second phase-word table inside selectDecisionChain; the round-4 one-owner
 * scan (case-insensitive) found its "Post-exit". Phase words have one owner.
 */
export const DECK_PHASE_HEADLINE: Readonly<Record<TradePhase, string>> = {
  PREPARATION: "Preparing",
  APPROACH: "Approaching",
  DECISION: "Deciding",
  POSITION: "Managing",
  POST_EXIT: "Post-exit",
  REVIEW: "Reviewing",
};

/**
 * The stage a room's rail lights, for ITS market — `lifecyclePhaseFor`'s twin.
 * A stage declared on another symbol does not travel (the lifecycle START is
 * lit); `null` is a non-lifecycle job (LEARN), which lights NO stop rather than
 * inventing one.
 */
export function lifecycleStageFor(
  ctx: { readonly stage: LifecycleStage | null; readonly stageSymbol: string | null },
  symbol: string,
): LifecycleStage | null {
  if (ctx.stageSymbol !== null && ctx.stageSymbol !== symbol) return LIFECYCLE_START;
  if (ctx.stage === null) return null;
  return stageAttachedTo(ctx, symbol);
}

/**
 * A deck press's word: the word of the stage it writes. Derived, never a second
 * table — "In Trade" is the word of MANAGE, so the POSITION press says it.
 */
export const DECK_PHASE_LABEL: Readonly<Record<TradePhase, string>> = {
  PREPARATION: STAGE_WORD[STAGE_FOR_PHASE.PREPARATION],
  APPROACH: STAGE_WORD[STAGE_FOR_PHASE.APPROACH],
  DECISION: STAGE_WORD[STAGE_FOR_PHASE.DECISION],
  POSITION: STAGE_WORD[STAGE_FOR_PHASE.POSITION],
  POST_EXIT: STAGE_WORD[STAGE_FOR_PHASE.POST_EXIT],
  REVIEW: STAGE_WORD[STAGE_FOR_PHASE.REVIEW],
};
