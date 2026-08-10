import { describe, expect, it } from "vitest";
import { hasJournalCoachEvidence, JOURNAL_COACH_MIN_SAMPLE } from "./journalEvidence";

describe("journal evidence gate", () => {
  it("suppresses coaching conclusions for empty and undersized samples", () => {
    expect(hasJournalCoachEvidence(0)).toBe(false);
    expect(hasJournalCoachEvidence(JOURNAL_COACH_MIN_SAMPLE - 1)).toBe(false);
  });

  it("opens only at the declared sample threshold", () => {
    expect(hasJournalCoachEvidence(JOURNAL_COACH_MIN_SAMPLE)).toBe(true);
  });
});
