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
  readonly emphasizeWhy: boolean;
  readonly passportOpen: boolean;
  readonly receiptOpen: boolean;
  readonly rationale: string;
}

const EMPHASIS: Readonly<Record<ExperienceMode, EmphasisBase>> = {
  // Reflection before the bell: the One Story frames the plan; nothing forced open.
  PREP: {
    lead: "STORY",
    emphasizeWhy: false,
    passportOpen: false,
    receiptOpen: false,
    rationale: "Planning the session — the One Story frames the day, no live drawer forced.",
  },
  // No position: study what the market objects actually are.
  OBSERVE: {
    lead: "PASSPORT",
    emphasizeWhy: false,
    passportOpen: true,
    receiptOpen: false,
    rationale: "Watching with no position — the Object DNA leads the study.",
  },
  // Holding a thesis: the trigger question is whether right-of-way is open.
  WAIT: {
    lead: "WHY",
    emphasizeWhy: true,
    passportOpen: false,
    receiptOpen: false,
    rationale: "Waiting for permission — WHY / WHY NOT leads the decision.",
  },
  // Placing the planned decision: keep the blocker ledger front and centre.
  EXECUTE: {
    lead: "WHY",
    emphasizeWhy: true,
    passportOpen: false,
    receiptOpen: false,
    rationale: "Placing the decision — WHY / WHY NOT confirms the path is clear.",
  },
  // Stewarding an open position: the receipt's management trail leads.
  MANAGE: {
    lead: "RECEIPT",
    emphasizeWhy: false,
    passportOpen: false,
    receiptOpen: true,
    rationale: "Managing the position — the Decision Receipt's management trail leads.",
  },
  // Reviewing: the sealed receipt is the object of study.
  REVIEW: {
    lead: "RECEIPT",
    emphasizeWhy: false,
    passportOpen: false,
    receiptOpen: true,
    rationale: "Reviewing — the sealed Decision Receipt is the object of study.",
  },
  // Training a weakness: the receipt carries the lessons to drill.
  LEARN: {
    lead: "RECEIPT",
    emphasizeWhy: false,
    passportOpen: false,
    receiptOpen: true,
    rationale: "Training the weakness — the receipt carries the lessons to drill.",
  },
} as const;

/**
 * Resolve the decision-column emphasis for a job-mode. Total over every
 * ExperienceMode; the mapping is deterministic and presentation-only.
 */
export function selectDeckEmphasis(mode: ExperienceMode): DeckEmphasis {
  const base = EMPHASIS[mode];
  return { version: DECK_EMPHASIS_VERSION, mode, ...base };
}

export default selectDeckEmphasis;
