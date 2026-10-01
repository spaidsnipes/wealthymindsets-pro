/**
 * TRADE REVIEW — Garden 18 §XC/§XCI. "Profit is not the only teacher."
 *
 * Eight separate questions about one decision story, each answered by the
 * human: HELD (it went as it should), BROKE (it did not), or unjudged. Plus
 * the human's own words — the lesson, and what they would repeat. Broker facts
 * (orders, fills, fees) are never edited here; this is the trader's half of
 * the story, kept on this device and keyed by the story (its Decision_ID).
 * PURE parsing + one storage owner.
 */

export const REVIEW_DIMENSIONS = ["READ", "DECISION", "EXPRESSION", "EXECUTION", "RISK", "MANAGEMENT", "DISCIPLINE", "RESULT"] as const;
export type ReviewDimension = (typeof REVIEW_DIMENSIONS)[number];
export type ReviewMark = "HELD" | "BROKE";

export const REVIEW_QUESTION: Readonly<Record<ReviewDimension, string>> = {
  READ: "Did I read the market right?",
  DECISION: "Was the decision earned before I acted?",
  EXPRESSION: "Did the instrument / contract express the idea well?",
  EXECUTION: "Did I get in and out the way I planned?",
  RISK: "Did the risk fit, and was the stop where it belonged?",
  MANAGEMENT: "Did I manage it by plan, not by feeling?",
  DISCIPLINE: "Did I follow my own rules?",
  RESULT: "Did the result match the process?",
};

export interface StoryReview {
  readonly marks: Readonly<Partial<Record<ReviewDimension, ReviewMark>>>;
  readonly lesson: string;
  readonly repeat: string;
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
    for (const d of REVIEW_DIMENSIONS) {
      const m = (o.marks as Record<string, unknown> | undefined)?.[d];
      if (m === "HELD" || m === "BROKE") marks[d] = m;
    }
    out[k] = {
      marks,
      lesson: typeof o.lesson === "string" ? o.lesson.slice(0, MAX_TEXT) : "",
      repeat: typeof o.repeat === "string" ? o.repeat.slice(0, MAX_TEXT) : "",
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

export function readStoryReviews(): Readonly<Record<string, StoryReview>> {
  try { return parseStoryReviews(localStorage.getItem(STORY_REVIEW_STORAGE_KEY)); } catch { return {}; }
}

export function writeStoryReview(key: string, review: StoryReview): Readonly<Record<string, StoryReview>> {
  const all = { ...readStoryReviews(), [key]: { ...review, lesson: review.lesson.slice(0, MAX_TEXT), repeat: review.repeat.slice(0, MAX_TEXT) } };
  try { localStorage.setItem(STORY_REVIEW_STORAGE_KEY, JSON.stringify(all)); } catch { /* this visit only */ }
  return all;
}
