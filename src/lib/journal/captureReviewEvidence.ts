/**
 * THE MACHINE'S HALF OF EACH REVIEW QUESTION — §J 2026-10-07. PURE.
 *
 * The review (storyReview) separates ten dimensions; the trader marks each.
 * This sets the captured broker / ticket facts beside the dimension they
 * inform, each still wearing its provenance label, so "the fill cost 2 ticks"
 * sits under SLIPPAGE and never inside RESULT. Dimensions with nothing
 * captured say so — DISCIPLINE is the trader's alone.
 */

import type { CapturedField, CaptureProvenance, JournalCaptureDraft } from "./journalCaptureFromFill";
import { REVIEW_DIMENSIONS, type ReviewDimension } from "./storyReview";

export interface ReviewEvidenceLine {
  readonly label: string;
  /** Printed value, or "unreported" — never a 0 stand-in. */
  readonly text: string;
  readonly provenance: CaptureProvenance;
}

const FIELDS: Readonly<Record<ReviewDimension, readonly (readonly [keyof JournalCaptureDraft, string])[]>> = {
  READ: [["view", "View"]],
  DECISION: [["decisionId", "Decision_ID"], ["orderIntentId", "ORDER_INTENT_ID"]],
  ADHERENCE: [["orderedQty", "Ordered qty"], ["filledQty", "Filled qty"], ["limitPx", "Limit"], ["stopPx", "Planned stop"], ["targetPx", "Planned target"]],
  EXPRESSION: [["instrumentType", "Instrument"], ["contract", "Contract"], ["datedContract", "Dated"]],
  EXECUTION: [["orderType", "Order type"], ["fillPx", "Fill"], ["filledAt", "Filled at"], ["account", "Account"]],
  SLIPPAGE: [["slippage", "vs touch"], ["slippageUsd", "Slippage $"], ["spread", "Spread at send"], ["quoteAgeAtSendMs", "Quote age ms"]],
  RISK: [["stopPx", "Planned stop"], ["plannedRiskUsd", "1R $"]],
  MANAGEMENT: [],
  DISCIPLINE: [],
  RESULT: [["pnlUsd", "P&L"], ["realizedR", "R"], ["fees", "Fees"]],
};

const show = (f: CapturedField<string | number>): string =>
  f.value == null ? "unreported" : typeof f.value === "number" ? String(Math.round(f.value * 10_000) / 10_000) : f.value;

export function reviewEvidenceFromCapture(draft: JournalCaptureDraft | null | undefined): Readonly<Record<ReviewDimension, readonly ReviewEvidenceLine[]>> {
  const out = {} as Record<ReviewDimension, ReviewEvidenceLine[]>;
  for (const d of REVIEW_DIMENSIONS) {
    out[d] = draft
      ? FIELDS[d].map(([k, label]) => {
        const f = draft[k] as CapturedField<string | number>;
        return { label, text: show(f), provenance: f.provenance };
      })
      : [];
  }
  return out;
}

/**
 * The review's key for a journal entry. A captured entry with a Decision_ID
 * shares BrokerTruthToday's story key (`broker|tail|decisionId`), so the
 * Journal entry and the broker story read and write ONE review, not two.
 */
export function journalReviewKey(entry: { readonly id: string; readonly capture?: JournalCaptureDraft | null }): string {
  const c = entry.capture;
  const d = c?.decisionId.value;
  const tail = c?.account.value?.replace(/^…/, "");
  if (c && d && tail) return `${c.broker.value ?? "tastytrade"}|${tail}|${d}`;
  return `journal|${entry.id}`;
}
