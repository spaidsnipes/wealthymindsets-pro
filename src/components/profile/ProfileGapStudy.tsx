"use client";

/**
 * PERSONAL EDGE · YOUR GAP DECISIONS ON THE PROFILE (coordinator order 2026-10-09).
 *
 * The Journal's own Personal Edge block (PlanAdherenceBySetup) mounted on /profile — the same
 * component, not a copy: plan adherence by setup, the FVG study list (WHEN / DEPTH / AGE / WAITED
 * with the Academy's confirming-close rule and its lesson door), the timing and untraded-touch
 * sentences (after the trader presses Compare — a read, nothing written), and the context splits.
 * Reads the trader's own Journal once per member; writes nothing; renders nothing for an empty book.
 */

import { liveJournalRecords } from "@/lib/journal/paperEntry";
import React, { useEffect, useState } from "react";

import { PlanAdherenceBySetup } from "@/components/journal/PlanAdherenceBySetup";
import { hydrateJournalEntries, type JournalEntry } from "@/lib/journal/hydrateJournalEntries";
import { useManagementOwnerVersion } from "@/lib/journal/useManagementOwner";
import { readJournalRaw } from "@/lib/traderMemory/adapters/journalStorage";

export function ProfileGapStudy(): React.ReactElement | null {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const ownerVersion = useManagementOwnerVersion();
  useEffect(() => {
    try {
      const raw = JSON.parse(readJournalRaw(window.localStorage) ?? "[]");
      setEntries(Array.isArray(raw) ? hydrateJournalEntries(liveJournalRecords(raw)).entries : []);
    } catch { setEntries([]); }
  }, [ownerVersion]);
  if (!entries.length) return null;
  return (
    <div role="region" aria-label="Personal Edge — your plans and gap decisions" data-testid="profile-gap-study"
      style={{ border: "1px solid rgba(139,106,41,0.35)", borderRadius: 10, background: "rgba(11,11,13,0.9)", padding: 16 }}>
      <span style={{ fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", color: "#c9a55c", fontWeight: 800 }}>Personal Edge · your plans and gap decisions</span>
      <PlanAdherenceBySetup entries={entries} />
    </div>
  );
}
