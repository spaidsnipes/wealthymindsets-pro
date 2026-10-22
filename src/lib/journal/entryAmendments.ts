/**
 * ADD WHAT WAS MISSING — append-only, dated, never a rewrite (Megazord order §5: "correction audit trail on
 * journal edits"; Founder 2026-10-22: finish it).
 *
 * A saved Journal entry stays exactly as it was saved. What the trader did not record then (entryCompleteness)
 * can be added later as a NOTE beside the entry: dated, marked as added after the outcome, and never edited or
 * removed. The Journal's reads keep counting only what was recorded at the time, so a later note cannot turn a
 * loss into a "followed plan" in hindsight; the note is there for the trader and the review.
 *
 * Only a field the entry is missing can take a note. PURE: no React, no storage.
 */

import type { CompletenessGap } from "./entryCompleteness";

export const ENTRY_AMENDMENTS_STORAGE_KEY = "wm_journal_amendments" as const;
/** A note is a sentence, not an essay. */
export const AMENDMENT_MAX_CHARS = 280;
/** Per entry. Enough for every missing field a few times over; bounds storage. */
export const AMENDMENTS_PER_ENTRY = 20;

export type AmendmentField = CompletenessGap["id"];
export type EntryAmendment = { readonly field: AmendmentField; readonly value: string; readonly at: number };
export type AmendmentBook = Readonly<Record<string, readonly EntryAmendment[]>>;

const FIELDS: readonly AmendmentField[] = ["PROCESS", "PLANNED_RISK", "MFE", "SETUP", "LESSON"];
export const PROCESS_NOTE_VALUES = ["Followed my plan", "Broke my rules"] as const;

const isAmendment = (a: unknown): a is EntryAmendment => {
  const x = a as EntryAmendment;
  return !!x && typeof x === "object" && FIELDS.includes(x.field) && typeof x.value === "string" && x.value.trim() !== ""
    && x.value.length <= AMENDMENT_MAX_CHARS && typeof x.at === "number" && Number.isFinite(x.at);
};

/** The stored book, keeping only well-formed notes. Unreadable storage is an empty book, never a guess. */
export function readAmendmentBook(raw: string | null): AmendmentBook {
  if (!raw) return {};
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return {}; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: Record<string, EntryAmendment[]> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (!Array.isArray(v)) continue;
    const kept = v.filter(isAmendment).slice(0, AMENDMENTS_PER_ENTRY);
    if (kept.length) out[k] = kept;
  }
  return out;
}

export type AppendResult =
  | { readonly ok: true; readonly book: AmendmentBook }
  | { readonly ok: false; readonly reason: "NOT_MISSING" | "EMPTY" | "TOO_LONG" | "FULL" | "BAD_PROCESS" };

/**
 * The book with one more note on `entryKey`. Existing notes are carried over untouched (append-only); a field the
 * entry already recorded is refused, so a note can only fill a gap, never contradict what was saved.
 */
export function appendAmendment(book: AmendmentBook, entryKey: string, missing: readonly AmendmentField[],
  field: AmendmentField, value: string, at: number): AppendResult {
  if (!missing.includes(field)) return { ok: false, reason: "NOT_MISSING" };
  const v = value.trim();
  if (!v) return { ok: false, reason: "EMPTY" };
  if (v.length > AMENDMENT_MAX_CHARS) return { ok: false, reason: "TOO_LONG" };
  if (field === "PROCESS" && !(PROCESS_NOTE_VALUES as readonly string[]).includes(v)) return { ok: false, reason: "BAD_PROCESS" };
  const prior = book[entryKey] ?? [];
  if (prior.length >= AMENDMENTS_PER_ENTRY) return { ok: false, reason: "FULL" };
  return { ok: true, book: { ...book, [entryKey]: [...prior, { field, value: v, at }] } };
}

/** How a note reads on the entry: when, that it came after the outcome, and what it says. */
export function amendmentLine(a: EntryAmendment, fieldName: string, dateText: string): string {
  return `Added ${dateText}, after the outcome · ${fieldName}: ${a.value}`;
}
