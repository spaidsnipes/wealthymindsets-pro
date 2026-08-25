/**
 * selectDeckEmphasis — pure job-emphasis mapping for the /command-deck
 * decision column.
 *
 * Founder transformation thesis (2026-08-24): "The market stays the same. The
 * interface changes its emphasis around the human's current job." `shellLayout`
 * already resolves the shell-level emphasis (rail, canvas weight, live focus).
 * This selector resolves the complementary, deck-level decision: given the
 * human's current job-mode, WHICH of the decision surfaces LEADS and which
 * contextual drawers open by default (Auto-Quiet).
 *
 * It changes ONLY presentation emphasis — never market truth, never which data
 * is shown. Every surface stays reachable in every mode; the job only decides
 * what leads and what is quieted into a collapsed drawer. PURE — no React, no
 * I/O, no clock.
 */

import type { ExperienceMode } from "./decisionContextBus";

export const DECK_EMPHASIS_VERSION = "wm.deck-emphasis.v1" as const;

/** The decision-column surfaces the job-mode can re-emphasise. */
export type DeckSurface = "STORY" | "WHY" | "PASSPORT" | "RECEIPT";

export interface DeckEmphasis {
  readonly version: typeof DECK_EMPHASIS_VERSION;
  readonly mode: ExperienceMode;
  /** The single surface that leads the decision column in this job. */
  readonly lead: DeckSurface;
  /**
   * The full physical top-to-bottom ranking of the four decision surfaces for
   * this job — a permutation of every DeckSurface, `lead` first. The deck maps
   * each surface's index here onto a CSS `order` so the lead surface rises to
   * the top WITHOUT any surface leaving the DOM. Presentation-only.
   */
  readonly order: readonly DeckSurface[];
  /** WHY / WHY NOT gets visual emphasis (decision-at-the-trigger jobs). */
  readonly emphasizeWhy: boolean;
  /** Market Object Passport drawer opens by default (market-study jobs). */
  readonly passportOpen: boolean;
  /** Decision Receipt drawer opens by default (management + reflection jobs). */
  readonly receiptOpen: boolean;
  /** One-line reason this emphasis fits the job — for a11y / tooltip honesty. */
  readonly rationale: string;
}

interface EmphasisBase {
  readonly lead: DeckSurface;
  readonly order: readonly DeckSurface[];
  readonly emphasizeWhy: boolean;
  readonly passportOpen: boolean;
  readonly receiptOpen: boolean;
  readonly rationale: string;
}

const EMPHASIS: Readonly<Record<ExperienceMode, EmphasisBase>> = {
  // Reflection before the bell: the One Story frames the plan; nothing forced open.
  PREP: {
    lead: "STORY",
    order: ["STORY", "WHY", "PASSPORT", "RECEIPT"],
    emphasizeWhy: false,
    passportOpen: false,
    receiptOpen: false,
    rationale: "Planning the session — the One Story frames the day, no live drawer forced.",
  },
  // No position: study what the market objects actually are.
  OBSERVE: {
    lead: "PASSPORT",
    order: ["PASSPORT", "STORY", "WHY", "RECEIPT"],
    emphasizeWhy: false,
    passportOpen: true,
    receiptOpen: false,
    rationale: "Watching with no position — the Object DNA leads the study.",
  },
  // Holding a thesis: the trigger question is whether right-of-way is open.
  WAIT: {
    lead: "WHY",
    order: ["WHY", "STORY", "PASSPORT", "RECEIPT"],
    emphasizeWhy: true,
    passportOpen: false,
    receiptOpen: false,
    rationale: "Waiting for permission — WHY / WHY NOT leads the decision.",
  },
  // Placing the planned decision: keep the blocker ledger front and centre.
  EXECUTE: {
    lead: "WHY",
    order: ["WHY", "STORY", "PASSPORT", "RECEIPT"],
    emphasizeWhy: true,
    passportOpen: false,
    receiptOpen: false,
    rationale: "Placing the decision — WHY / WHY NOT confirms the path is clear.",
  },
  // Stewarding an open position: the receipt's management trail leads.
  MANAGE: {
    lead: "RECEIPT",
    order: ["RECEIPT", "WHY", "STORY", "PASSPORT"],
    emphasizeWhy: false,
    passportOpen: false,
    receiptOpen: true,
    rationale: "Managing the position — the Decision Receipt's management trail leads.",
  },
  // Reviewing: the sealed receipt is the object of study.
  REVIEW: {
    lead: "RECEIPT",
    order: ["RECEIPT", "STORY", "WHY", "PASSPORT"],
    emphasizeWhy: false,
    passportOpen: false,
    receiptOpen: true,
    rationale: "Reviewing — the sealed Decision Receipt is the object of study.",
  },
  // Training a weakness: the receipt carries the lessons to drill.
  LEARN: {
    lead: "RECEIPT",
    order: ["RECEIPT", "STORY", "WHY", "PASSPORT"],
    emphasizeWhy: false,
    passportOpen: false,
    receiptOpen: true,
    rationale: "Training the weakness — the receipt carries the lessons to drill.",
  },
} as const;

/**
 * Concrete, live signals the deck already holds that can refine the SECONDARY
 * ordering of the decision surfaces within a job. These NEVER move the lead —
 * the job owns the lead — they only reorder what sits below it, and only on
 * defensible facts (a live blocker to raise, an empty receipt to sink).
 */
export interface DeckEmphasisSignals {
  /** A right-of-way blocker / contradiction is live and unresolved. */
  readonly hasUnresolvedContradiction?: boolean;
  /** At least one decision has been sealed (the Receipt has real content). */
  readonly hasSealedReceipt?: boolean;
}

/**
 * Resolve the decision-column emphasis for a job-mode. Total over every
 * ExperienceMode; the mapping is deterministic and presentation-only.
 *
 * When `signals` are supplied, the SECONDARY order (everything below the lead)
 * is refined on concrete facts — a live blocker raises WHY toward the top; an
 * empty Receipt sinks to the bottom so it never outranks a live surface. The
 * lead is NEVER changed (the job owns it) and the result stays a full
 * permutation. Omitting `signals` reproduces the pure per-job mapping exactly.
 */
export function selectDeckEmphasis(
  mode: ExperienceMode,
  signals?: DeckEmphasisSignals,
): DeckEmphasis {
  const base = EMPHASIS[mode];
  const order = signals ? refineOrder(base.lead, base.order, signals) : base.order;
  return { version: DECK_EMPHASIS_VERSION, mode, ...base, order };
}

/**
 * Refine the secondary order on live signals while preserving two invariants:
 * (1) the lead stays at index 0; (2) the result is a full permutation of the
 * same four surfaces. Pure and total.
 */
function refineOrder(
  lead: DeckSurface,
  order: readonly DeckSurface[],
  signals: DeckEmphasisSignals,
): readonly DeckSurface[] {
  // Work only on the tail below the lead so the lead can never move.
  let tail = order.filter((s) => s !== lead);

  // An empty Receipt should never outrank a live surface — sink it to last.
  if (signals.hasSealedReceipt === false) {
    tail = [...tail.filter((s) => s !== "RECEIPT"), ...tail.filter((s) => s === "RECEIPT")];
  }

  // A live, unresolved blocker deserves to sit directly under the lead so the
  // human sees what stands in the way — but only when WHY isn't already leading.
  if (signals.hasUnresolvedContradiction && lead !== "WHY") {
    tail = ["WHY", ...tail.filter((s) => s !== "WHY")];
  }

  return [lead, ...tail];
}

/**
 * The CSS `order` value for a decision surface under this emphasis — its index
 * in the job's ranking (lead === 0). A surface absent from the ranking (never
 * expected, since `order` is always a full permutation) sorts last so it can
 * never silently vanish above the fold. Pure and total.
 */
export function surfaceOrder(emphasis: DeckEmphasis, surface: DeckSurface): number {
  const idx = emphasis.order.indexOf(surface);
  return idx === -1 ? emphasis.order.length : idx;
}

export default selectDeckEmphasis;
