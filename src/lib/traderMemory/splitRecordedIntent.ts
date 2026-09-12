/**
 * THE TRADER'S WORDS, SEPARATED FROM THE MACHINE'S.
 *
 * `OptionExpressionIntent` writes one decision as one sentence. That is the
 * right thing to WRITE — a single string survives any storage layer, and one
 * canonical DECISION_ID stays attached to one canonical record. It is the
 * wrong thing to READ.
 *
 * What comes back months later looks like this:
 *
 *   Review NVDA expression: NVDA260918C00180000; call; strike 180; expiry
 *   2026-09-18. Purpose: gap fill into the 180 shelf. Reference source alpaca;
 *   reviewed provider …; fidelity INDICATIVE; quote timestamp …; … No order
 *   requested.
 *
 * The trader's own thesis — the only part nobody else could have written, and
 * the only part worth re-reading — sits buried mid-sentence between a contract
 * identifier and a provenance dump, typographically identical to both. A
 * decision record that cannot show you your own reasoning is an audit log, not
 * a memory.
 *
 * This module changes nothing about what is WRITTEN. It is a projection: one
 * record, one identity, read three ways. Anything already recorded splits
 * correctly, because the split is derived from the template that produced it.
 *
 * IT FAILS CLOSED. If either boundary is missing — an older template, a
 * different producer, a truncated row — nothing is guessed. `parsed` is false,
 * every part is null, and `raw` is handed back verbatim so the surface shows
 * the whole string rather than a confidently mislabelled fragment. Presenting
 * a machine's provenance under the heading "your reasoning" would be worse
 * than presenting an unsplit blob, because the trader would believe it.
 *
 * REVIVE LEDGER — broken on purpose 2026-09-12, both restored byte-identically.
 *   1. `lastIndexOf(THESIS_CLOSE)` → `indexOf`. vitest EXIT=1, failed by name
 *      on "keeps the whole thesis when the trader's own words contain the
 *      closing phrase"; tsc EXIT=0.
 *   2. Dropped `!thesis` from the fail-closed guard. vitest EXIT=1, failed by
 *      name on "hands back the whole record for a blank thesis"; tsc EXIT=0.
 * Third module this session where tsc stayed green through a real behavioural
 * break. String-splitting logic is entirely invisible to the type system; the
 * suite is the only gate standing here.
 */

/** The exact seams `OptionExpressionIntent` writes. Changing the template on
 * that surface without changing these is the one way this module can start
 * lying, so they are pinned by name in the test beside it. */
const THESIS_OPEN = " Purpose: ";
const THESIS_CLOSE = ". Reference source ";

export interface RecordedIntentParts {
  /** What was under review: underlying, OSI symbol, side, strike, expiry. */
  readonly contract: string | null;
  /** The trader's own words. Null unless the record actually carried them. */
  readonly thesis: string | null;
  /** The attached evidence: source, provider, rights, fidelity, timestamps. */
  readonly provenance: string | null;
  /** Always the untouched record, whether or not the split succeeded. */
  readonly raw: string;
  readonly parsed: boolean;
}

const unsplit = (raw: string): RecordedIntentParts =>
  ({ contract: null, thesis: null, provenance: null, raw, parsed: false });

export function splitRecordedIntent(intent: string): RecordedIntentParts {
  const raw = intent;
  const open = intent.indexOf(THESIS_OPEN);
  if (open < 0) return unsplit(raw);

  // LAST, not first. The trader's thesis is free text and may contain the
  // closing phrase; the machine tail is generated once and never repeats it,
  // so the final occurrence is always the true seam. Taking the first would
  // let a trader who quoted this sentence silently truncate their own record.
  const close = intent.lastIndexOf(THESIS_CLOSE);
  if (close <= open + THESIS_OPEN.length) return unsplit(raw);

  const contract = intent.slice(0, open).trim();
  const thesis = intent.slice(open + THESIS_OPEN.length, close).trim();
  // `THESIS_CLOSE` opens with the sentence break, so the provenance begins at
  // the word "Reference" — the reader gets a sentence, not a fragment.
  const provenance = intent.slice(close + 2).trim();

  // An empty part is not a part. A blank thesis means the record does not
  // carry one, and rendering an empty heading would imply the trader chose to
  // say nothing when in fact the template simply did not capture it.
  if (!contract || !thesis || !provenance) return unsplit(raw);
  return { contract, thesis, provenance, raw, parsed: true };
}
