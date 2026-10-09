/**
 * TRADE REVIEW — Garden 18 §XC/§XCI. "Profit is not the only teacher."
 *
 * Ten separate questions about one decision story, each answered by the
 * human: HELD (it went as it should), BROKE (it did not), or unjudged, with
 * an optional note per question. Plus the human's own words — the lesson, and
 * what they would repeat. (§J 2026-10-07: ADHERENCE and SLIPPAGE joined the
 * original eight so "did I follow the plan" and "what did the fill cost" are
 * never folded into EXECUTION.) Broker facts
 * (orders, fills, fees) are never edited here; this is the trader's half of
 * the story, kept on this device and keyed by the story (its Decision_ID).
 * PURE parsing + one storage owner. Keyed by the signed-in member through the
 * one owner (managementOwner, Garden 19 2026-10-08): `wm_story_review_v1:<member>`.
 */

import { managementKey } from "./managementOwner";
import { readSelfReport, type SelfReportId } from "./selfReport";

export const REVIEW_DIMENSIONS = ["READ", "DECISION", "ADHERENCE", "EXPRESSION", "EXECUTION", "SLIPPAGE", "RISK", "MANAGEMENT", "DISCIPLINE", "RESULT"] as const;
export type ReviewDimension = (typeof REVIEW_DIMENSIONS)[number];
export type ReviewMark = "HELD" | "BROKE";

export const REVIEW_QUESTION: Readonly<Record<ReviewDimension, string>> = {
  READ: "Did I read the market right?",
  DECISION: "Was the decision earned before I acted?",
  ADHERENCE: "Did the order I sent match the plan I wrote (entry, size, stop, target)?",
  EXPRESSION: "Did the instrument / contract express the idea well?",
  EXECUTION: "Did I get in and out the way I planned?",
  SLIPPAGE: "What did the fill cost against the touch, and was it acceptable?",
  RISK: "Did the risk fit, and was the stop where it belonged?",
  MANAGEMENT: "Did I manage it by the conditions my plan recorded?",
  DISCIPLINE: "Did I follow my own rules?",
  RESULT: "Did the result match the process?",
};

export interface StoryReview {
  readonly marks: Readonly<Partial<Record<ReviewDimension, ReviewMark>>>;
  /** The trader's note per question — kept apart so each dimension is its own field. */
  readonly notes?: Readonly<Partial<Record<ReviewDimension, string>>>;
  readonly lesson: string;
  readonly repeat: string;
  /**
   * Garden 19 §28: the trader's own answer to "why did the plan change?" —
   * the ONLY source of an emotional or personal reason in plan review. Absent
   * means the reason is unknown; WM never fills it in.
   */
  readonly planWhy?: string;
  /**
   * Garden 19 §29: labels the TRADER put on this decision himself (selfReport.ts owns the words). Never
   * set by WM; absent means he has not labelled it.
   */
  readonly selfReport?: readonly SelfReportId[];
  readonly updatedAt: number;
}

export const STORY_REVIEW_STORAGE_KEY = "wm_story_review_v1";
const MAX_TEXT = 600;

export function parseStoryReviews(raw: string | null): Readonly<Record<string, StoryReview>> {
  let v: unknown;
  try { v = raw ? JSON.parse(raw) : {}; } catch { return {}; }
  if (!v || typeof v !== "object") return {};
  const out: Record<string, StoryReview> = {};
  for (const [k, r] of Object.entries(v as Record<string, unknown>)) {
    if (!r || typeof r !== "object" || k.length > 120) continue;
    const o = r as Record<string, unknown>;
    const marks: Partial<Record<ReviewDimension, ReviewMark>> = {};
    const notes: Partial<Record<ReviewDimension, string>> = {};
    for (const d of REVIEW_DIMENSIONS) {
      const m = (o.marks as Record<string, unknown> | undefined)?.[d];
      if (m === "HELD" || m === "BROKE") marks[d] = m;
      const n = (o.notes as Record<string, unknown> | undefined)?.[d];
      if (typeof n === "string" && n.trim() !== "") notes[d] = n.slice(0, MAX_TEXT);
    }
    out[k] = {
      marks,
      notes,
      lesson: typeof o.lesson === "string" ? o.lesson.slice(0, MAX_TEXT) : "",
      repeat: typeof o.repeat === "string" ? o.repeat.slice(0, MAX_TEXT) : "",
      ...(typeof o.planWhy === "string" && o.planWhy.trim() !== "" ? { planWhy: o.planWhy.slice(0, MAX_TEXT) } : {}),
      ...(readSelfReport(o.selfReport).length ? { selfReport: readSelfReport(o.selfReport) } : {}),
      updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : 0,
    };
  }
  return out;
}

/** Cycle a mark: unjudged → HELD → BROKE → unjudged. */
export function cycleMark(m: ReviewMark | undefined): ReviewMark | undefined {
  return m === undefined ? "HELD" : m === "HELD" ? "BROKE" : undefined;
}

/** "5 held · 2 broke · 1 open" — the review's one line. */
export function reviewSummary(r: StoryReview | undefined): string {
  const marks = Object.values(r?.marks ?? {});
  const held = marks.filter(m => m === "HELD").length;
  const broke = marks.filter(m => m === "BROKE").length;
  const open = REVIEW_DIMENSIONS.length - held - broke;
  return `${held} held · ${broke} broke · ${open} open`;
}

/** This member's review key; null for a guest or before auth resolves (nothing read, nothing written). */
export const storyReviewKey = (): string | null => managementKey(STORY_REVIEW_STORAGE_KEY);

export function readStoryReviews(): Readonly<Record<string, StoryReview>> {
  const key = storyReviewKey();
  if (!key) return {};
  try { return parseStoryReviews(localStorage.getItem(key)); } catch { return {}; }
}

export function writeStoryReview(key: string, review: StoryReview): Readonly<Record<string, StoryReview>> {
  const notes: Partial<Record<ReviewDimension, string>> = {};
  for (const d of REVIEW_DIMENSIONS) { const n = review.notes?.[d]; if (typeof n === "string" && n !== "") notes[d] = n.slice(0, MAX_TEXT); }
  // The trader's own labels are stored only when he chose some (an empty list is not written).
  const { selfReport: chosen, ...rest } = review;
  const labels = readSelfReport(chosen);
  const all = { ...readStoryReviews(), [key]: { ...rest, notes, lesson: review.lesson.slice(0, MAX_TEXT), repeat: review.repeat.slice(0, MAX_TEXT), ...(typeof review.planWhy === "string" ? { planWhy: review.planWhy.slice(0, MAX_TEXT) } : {}), ...(labels.length ? { selfReport: labels } : {}) } };
  const storeKey = storyReviewKey();
  if (storeKey) { try { localStorage.setItem(storeKey, JSON.stringify(all)); } catch { /* this visit only */ } }
  return all;
}
