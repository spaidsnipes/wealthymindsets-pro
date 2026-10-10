/**
 * PAPER IS NEVER MIXED INTO LIVE (coordinator ruling 2026-10-10). PURE.
 *
 * ONE predicate decides whether a journal record is a PAPER trade: its capture says the environment was PAPER
 * (the Alpaca paper capture writes exactly that, BROKER-REPORTED from Alpaca's paper readback). Every reader of the
 * journal book that produces RESULTS — Journal stats, Personal Edge, plan adherence, profile tiles, command deck,
 * learning genome, proof-lane edge, Morning Prep — asks this predicate and leaves paper out. The Journal list still
 * shows paper entries, visibly marked PAPER, with a Paper filter. `journalBookReaders.sentinel.test.ts` fails when a
 * new reader of the book does not route through here.
 */

/** The environment word a paper capture carries. */
export const PAPER_ENVIRONMENT = "PAPER" as const;

/** Is this saved journal record a paper trade? Anything unreadable is NOT paper (it is never silently dropped). */
export function isPaperEntry(record: unknown): boolean {
  if (!record || typeof record !== "object") return false;
  const cap = (record as { capture?: unknown }).capture;
  if (!cap || typeof cap !== "object") return false;
  const env = (cap as { environment?: unknown }).environment;
  return !!env && typeof env === "object" && (env as { value?: unknown }).value === PAPER_ENVIRONMENT;
}

/** The records that count toward LIVE results — every record except paper ones. Order kept. */
export function liveJournalRecords<T>(records: readonly T[]): T[] {
  return records.filter(r => !isPaperEntry(r));
}

/** How many paper records were left out — for a reader that says so. */
export function paperRecordCount(records: readonly unknown[]): number {
  return records.reduce<number>((n, r) => n + (isPaperEntry(r) ? 1 : 0), 0);
}
