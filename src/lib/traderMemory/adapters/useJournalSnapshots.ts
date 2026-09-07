"use client";
import { useEffect, useState, useCallback } from "react";
import { journalEntriesToSnapshots } from "./journalEntryToSnapshot";
import { hydrateJournalEntries } from "@/lib/journal/hydrateJournalEntries";
import type { JournalRecordCoverage } from "@/lib/journal/journalRecordShape";
import type { DecisionMemorySnapshot } from "../viewModels/selectProcessLandscape";
import {
  JOURNAL_STORAGE_KEY,
  JOURNAL_UPDATED_EVENT,
  LEGACY_JOURNAL_STORAGE_KEY,
  readJournalStorage,
} from "./journalStorage";

/**
 * useJournalSnapshots — reads localStorage journal entries + returns
 * them as DecisionMemorySnapshot[] via the adapter.
 *
 * Subscribes to the canonical Journal update event so consumers
 * across surfaces (Journal, Profile Growth, Command Deck) stay in
 * sync when the trader saves a new entry from the Journal page.
 *
 * Owner-scoped by caller — pass null to opt out. Empty when SSR or
 * when localStorage is inaccessible.
 */

const EMPTY: readonly DecisionMemorySnapshot[] = Object.freeze([]);

interface StorageReader {
  getItem(key: string): string | null;
}

/**
 * Pure snapshot reader — canon §Storage precedence + fail-closed.
 *
 * Reads from a storage port (typically window.localStorage) and returns
 * owner-scoped DecisionMemorySnapshot[]. Canonical Journal storage
 * (`wm_journal_entries`) is authoritative; legacy `wm-journal` bytes
 * are consulted ONLY when canonical is absent. Present-but-empty
 * canonical wins over legacy data (canon: absence-of-migration is
 * still a canonical statement).
 *
 * Fails closed on malformed canonical (returns []); never falls back
 * to legacy after a canonical corruption event.
 *
 * Returns [] for null/absent ownerId — pure guard so callers never
 * leak snapshots across trader accounts (canon §Logout Isolation).
 *
 * Extracted from the hook so cross-tab, SSR, and evidence tests can
 * exercise the same code path without a React harness.
 */
export function readJournalSnapshots(
  storage: StorageReader,
  ownerId: string | null | undefined,
): readonly DecisionMemorySnapshot[] {
  return readJournalBook(storage, ownerId).snapshots;
}

/**
 * ONE READER OF THE STORED BOOK, THEN A PROJECTION.
 *
 * `hydrateJournalEntries` decides what a saved record IS. `journalEntriesToSnapshots`
 * decides what a decision looks like. Splitting them is what makes the coverage
 * number honest, and the honest number is not `total - snapshots`:
 *
 *   An M0 NO-TRADE day hydrates perfectly — entry 0, exit 0, size 0, pnl 0 is a
 *   real record the trader deliberately made — and then legitimately does not
 *   become a decision snapshot, because it is not a directional decision. If
 *   coverage counted every record that failed to become a snapshot, a
 *   disciplined week of sitting on his hands would be reported to him as a
 *   week WM COULD NOT READ. The disclosure would be a lie in the opposite
 *   direction from the silence it replaced.
 *
 * So `skipped` counts what HYDRATION refused — records WM genuinely could not
 * make sense of — and nothing else.
 */
export interface JournalBookRead {
  readonly snapshots: readonly DecisionMemorySnapshot[];
  readonly coverage: JournalRecordCoverage;
}

const FULLY_READ: JournalRecordCoverage = Object.freeze({
  readable: 0,
  skipped: 0,
  note: null,
});

export function readJournalBook(
  storage: StorageReader,
  ownerId: string | null | undefined,
): JournalBookRead {
  if (!ownerId) return { snapshots: EMPTY, coverage: FULLY_READ };
  const read = readJournalStorage(storage);
  if (read.status === "UNAVAILABLE" || read.status === "INVALID" || read.status === "ABSENT") {
    // Fail closed: malformed canonical must NOT fall back to legacy
    // (canon: a corrupted authoritative source is not an invitation to
    // trust an older cache). ABSENT with no legacy also empty.
    //
    // No coverage note either. These are storage-level states the surfaces
    // report in their own words; claiming "WM could not read N of your records"
    // when the bytes never parsed at all would be a count WM did not measure.
    return { snapshots: EMPTY, coverage: FULLY_READ };
  }
  // No cast. `read.records` is `unknown[]` because that is all
  // `readJournalStorage` verified, and the reader asks the record-shape owner
  // about every field. Asserting an entry type here is what fed a `null` into
  // `entry.symbol` and threw on four mounted surfaces.
  const hydration = hydrateJournalEntries(read.records);
  return {
    snapshots: journalEntriesToSnapshots(hydration.entries, ownerId),
    coverage: hydration.coverage,
  };
}

const EMPTY_READ: JournalBookRead = Object.freeze({ snapshots: EMPTY, coverage: FULLY_READ });

/**
 * The book AND how much of it WM could read, from ONE subscription.
 *
 * `useJournalSnapshots` delegates here rather than subscribing again. Two
 * hooks reading the same localStorage key on the same mount is how one
 * surface ends up rendering a coverage note that disagrees with the list it
 * sits above — the note would describe the read that happened to land last.
 */
export function useJournalBook(ownerId: string | null | undefined): JournalBookRead {
  const [book, setBook] = useState<JournalBookRead>(EMPTY_READ);

  const refresh = useCallback(() => {
    if (typeof window === "undefined" || !ownerId) {
      setBook(EMPTY_READ);
      return;
    }
    setBook(readJournalBook(window.localStorage, ownerId));
  }, [ownerId]);

  useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;
    const onEvent = () => refresh();
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === JOURNAL_STORAGE_KEY || ev.key === LEGACY_JOURNAL_STORAGE_KEY) refresh();
    };
    window.addEventListener(JOURNAL_UPDATED_EVENT, onEvent);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(JOURNAL_UPDATED_EVENT, onEvent);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return book;
}

export function useJournalSnapshots(
  ownerId: string | null | undefined,
): readonly DecisionMemorySnapshot[] {
  return useJournalBook(ownerId).snapshots;
}

/** Callable from a journal-mutating consumer to notify other subscribers. */
export function notifyJournalChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(JOURNAL_UPDATED_EVENT));
  } catch {
    /* dispatchEvent may be unavailable in some sandbox contexts */
  }
}
