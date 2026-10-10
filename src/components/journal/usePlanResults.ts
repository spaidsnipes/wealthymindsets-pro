"use client";

/**
 * Plan-vs-actual for every Journal entry whose Decision_ID has a frozen plan — read from the signed-in
 * member's own journal, plans and review answers (Garden 19 §28). ONE reader, used by the Broker Ledger's
 * analytics and the profile's Personal Edge. Read only: it never writes, and it re-reads when the member changes.
 */

import { liveJournalRecords } from "@/lib/journal/paperEntry";
import { useEffect, useState } from "react";

import { journalReviewKey } from "@/lib/journal/captureReviewEvidence";
import { hydrateJournalEntries } from "@/lib/journal/hydrateJournalEntries";
import { readPlanForDecision } from "@/lib/journal/managementPlanStore";
import { composePlanReview, planReviewInputForJournalEntry } from "@/lib/journal/planReview";
import type { PlanVsActualResult } from "@/lib/journal/planVsActual";
import { readStoryReviews } from "@/lib/journal/storyReview";
import { useManagementOwnerVersion } from "@/lib/journal/useManagementOwner";
import { readJournalStorage } from "@/lib/traderMemory/adapters/journalStorage";

export function readPlanResultsFromJournal(): PlanVsActualResult[] {
  try {
    const read = readJournalStorage(window.localStorage);
    const reviews = readStoryReviews();
    return hydrateJournalEntries(liveJournalRecords(read.records)).entries.flatMap(e => {
      const input = planReviewInputForJournalEntry(e, id => readPlanForDecision(window.localStorage, id));
      return input?.plan ? [composePlanReview(input, reviews[journalReviewKey(e)]?.planWhy).result] : [];
    });
  } catch { return []; }
}

/** null until read (so a surface can tell "not read yet" from "none"). */
export function usePlanResults(): PlanVsActualResult[] | null {
  const [results, setResults] = useState<PlanVsActualResult[] | null>(null);
  const ownerVersion = useManagementOwnerVersion();
  useEffect(() => { setResults(readPlanResultsFromJournal()); }, [ownerVersion]);
  return results;
}
