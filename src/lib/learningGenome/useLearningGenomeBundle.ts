"use client";

import * as React from "react";

import {
  JOURNAL_STORAGE_KEY,
  JOURNAL_UPDATED_EVENT,
  readJournalStorage,
} from "@/lib/traderMemory/adapters/journalStorage";
import {
  isJournalRecord,
  readStoredDate,
  readStoredDayModel,
  readStoredNumber,
  readStoredProcessQuality,
  readStoredResult,
} from "@/lib/journal/journalRecordShape";
import type { MisreadEntry } from "./selectMisreadMap";
import {
  buildLearningGenomeBundle,
  type LearningGenomeBundle,
} from "./learningGenomeToJson";

/**
 * useLearningGenomeBundle — client hook that assembles the Learning
 * Genome bundle (§9) from the browser-local Journal.
 *
 * Any page can render the diagnostic without re-implementing the
 * storage read, the two-window projection, or the composition of
 * selectLearningGenome + prescribeDrill + selectMisreadMap + genomeTrend.
 *
 * Windows are the same 7-day + 7-day pair /journal already uses so the
 * diagnostic reads identically on /journal, /command-deck, /profile.
 *
 * Rejection guarantees:
 *  - Returns an empty bundle when storage is unavailable / absent /
 *    invalid — never crashes the caller.
 *  - Re-reads on the JOURNAL_UPDATED_EVENT so tabs that edit Journal
 *    entries stay in sync with the diagnostic.
 *  - `undefined` sentinel is returned on the FIRST client render only,
 *    so a caller can render skeleton state without misinterpreting
 *    "unmeasured" as "loaded".
 */

/** Exported for isolated unit-testing — same logic the hook uses. */
export function normalizeJournalRecords(records: readonly unknown[]): MisreadEntry[] {
  return normalize(records);
}

/**
 * The record-shape questions are answered by `journalRecordShape`, not here.
 *
 * They used to be answered here, in a hand-rolled `isRecord` plus four inline
 * guards that were a near-identical SECOND copy of the ones in
 * `journalEdgeAdapter`. The two had already drifted: this one accepted a
 * whitespace-only date (`!r.date` is false for `"  "`) where the other
 * rejected it, so the same stored book produced a session on one surface and
 * not on the other. §24 / H21 — one owner for the question.
 *
 * The PROJECTION stays here: a MisreadEntry is not an EdgeEntry, and carrying
 * dayModel is this adapter's own concern.
 */
function normalize(records: readonly unknown[]): MisreadEntry[] {
  const out: MisreadEntry[] = [];
  for (const v of records) {
    if (!isJournalRecord(v)) continue;
    const date = readStoredDate(v.date);
    if (date === undefined) continue;
    const result = readStoredResult(v.result);
    if (result === undefined) continue;
    out.push({
      date,
      result,
      realizedR: readStoredNumber(v.realizedR),
      processQuality: readStoredProcessQuality(v.processQuality),
      mfeR: readStoredNumber(v.mfeR),
      maeR: readStoredNumber(v.maeR),
      // Absent is NOT rounded to M0 — that would delete a real trade from
      // every outcome statistic on the strength of a missing field.
      dayModel: readStoredDayModel(v.dayModel),
    });
  }
  return out;
}

/** Exported for isolated unit-testing — same logic the hook uses. */
export function splitJournalByWeekWindow(
  entries: readonly MisreadEntry[],
  nowMs: number,
): { current: MisreadEntry[]; prior: MisreadEntry[] } {
  return splitByWindow(entries, nowMs);
}

function splitByWindow(entries: readonly MisreadEntry[], nowMs: number): {
  current: MisreadEntry[];
  prior: MisreadEntry[];
} {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const currentStart = nowMs - weekMs;
  const priorStart = currentStart - weekMs;
  const current: MisreadEntry[] = [];
  const prior: MisreadEntry[] = [];
  for (const e of entries) {
    const t = Date.parse(e.date);
    if (!Number.isFinite(t)) continue;
    if (t >= currentStart) current.push(e);
    else if (t >= priorStart && t < currentStart) prior.push(e);
  }
  return { current, prior };
}

/**
 * Return the bundle. `undefined` = still hydrating on the first client
 * render (caller can show a skeleton). Once loaded, it's always a full
 * bundle object even when Journal is empty.
 */
export function useLearningGenomeBundle(): LearningGenomeBundle | undefined {
  const [bundle, setBundle] = React.useState<LearningGenomeBundle | undefined>(
    undefined,
  );

  const compute = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const read = readJournalStorage(window.localStorage);
    const records = read.status === "RESOLVED_CANONICAL" || read.status === "RESOLVED_LEGACY" ? read.records : [];
    const entries = normalize(records);
    const { current, prior } = splitByWindow(entries, Date.now());
    setBundle(
      buildLearningGenomeBundle({
        currentEntries: current,
        priorEntries: prior,
        currentDays: 7,
        priorDays: 7,
        exportedAt: new Date().toISOString(),
      }),
    );
  }, []);

  React.useEffect(() => {
    compute();
    if (typeof window === "undefined") return;
    const onUpdated = () => compute();
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === JOURNAL_STORAGE_KEY) compute();
    };
    window.addEventListener(JOURNAL_UPDATED_EVENT, onUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(JOURNAL_UPDATED_EVENT, onUpdated);
      window.removeEventListener("storage", onStorage);
    };
  }, [compute]);

  return bundle;
}
