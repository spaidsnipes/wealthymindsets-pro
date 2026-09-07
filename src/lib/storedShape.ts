/**
 * WHAT CAN BE READ OUT OF UNTRUSTED PARSED JSON.
 *
 * These three questions — "is this an object", "is this a number I can do
 * arithmetic with", "is this a string with content in it" — are asked
 * everywhere WM reads bytes it did not just write: localStorage, a broker
 * response, a receipt file. They were being answered in at least three private
 * copies (`journalRecordShape`, `parseExecutionReceipt`, and the ad-hoc
 * `typeof x === "string"` checks scattered through the surfaces).
 *
 * H21: one owner, never a second copy of a rule. A duplicated guard does not
 * announce itself by failing — it announces itself when one copy is corrected
 * and the others quietly are not.
 *
 * This module is deliberately tiny and domain-free. It answers what a VALUE is.
 * What a RECORD means is the domain owner's question (`journalRecordShape`
 * for the book, `cachedSession` for identity), and those modules build on
 * these.
 */

/** A parsed object. Arrays and null are not records, despite `typeof`. */
export function isStoredRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A number WM can do arithmetic with, or undefined.
 *
 * `null` (what `JSON.stringify` writes for NaN), missing fields, numeric
 * STRINGS and Infinity are all undefined here. The string case matters most:
 * `100 + "250.00"` is `"100250.00"`, so a stored string does not merely fail
 * to add — it fabricates a number three orders of magnitude wrong.
 */
export function readStoredNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** A non-empty string, or undefined. Whitespace is not content. */
export function readStoredText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}
