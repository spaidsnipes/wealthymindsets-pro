/** Minimum completed entries before WM may make comparative strategy claims. */
export const JOURNAL_COACH_MIN_SAMPLE = 20;

export function hasJournalCoachEvidence(entryCount: number): boolean {
  return Number.isFinite(entryCount) && entryCount >= JOURNAL_COACH_MIN_SAMPLE;
}
