"use client";

import * as React from "react";

import {
  JOURNAL_STORAGE_KEY,
  JOURNAL_UPDATED_EVENT,
  readJournalStorage,
} from "@/lib/traderMemory/adapters/journalStorage";
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

interface JournalRecord {
  readonly date?: unknown;
  readonly result?: unknown;
  readonly realizedR?: unknown;
  readonly processQuality?: unknown;
  readonly mfeR?: unknown;
  readonly maeR?: unknown;
  readonly dayModel?: unknown;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Exported for isolated unit-testing — same logic the hook uses. */
export function normalizeJournalRecords(records: readonly unknown[]): MisreadEntry[] {
  return normalize(records);
}

function normalize(records: readonly unknown[]): MisreadEntry[] {
  const out: MisreadEntry[] = [];
  for (const v of records) {
    if (!isRecord(v)) continue;
    const r = v as JournalRecord;
    if (typeof r.date !== "string" || !r.date) continue;
    if (r.result !== "win" && r.result !== "loss" && r.result !== "be") continue;
    const processQuality =
      r.processQuality === "FOLLOWED_PLAN" || r.processQuality === "BROKE_RULES"
        ? r.processQuality
        : "UNRESOLVED";
    const dayModel =
      r.dayModel === "M0" || r.dayModel === "M1" || r.dayModel === "M2"
        ? r.dayModel
        : undefined;
    out.push({
      date: r.date,
      result: r.result,
      realizedR: typeof r.realizedR === "number" && Number.isFinite(r.realizedR) ? r.realizedR : undefined,
      processQuality,
      mfeR: typeof r.mfeR === "number" && Number.isFinite(r.mfeR) ? r.mfeR : undefined,
      maeR: typeof r.maeR === "number" && Number.isFinite(r.maeR) ? r.maeR : undefined,
      dayModel,
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
