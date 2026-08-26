"use client";
import { useEffect, useState, useCallback } from "react";
import {
  journalEntriesToSnapshots,
  type AdaptableJournalEntry,
} from "./journalEntryToSnapshot";
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
  if (!ownerId) return EMPTY;
  const read = readJournalStorage(storage);
  if (read.status === "UNAVAILABLE" || read.status === "INVALID" || read.status === "ABSENT") {
    // Fail closed: malformed canonical must NOT fall back to legacy
    // (canon: a corrupted authoritative source is not an invitation to
    // trust an older cache). ABSENT with no legacy also empty.
    return EMPTY;
  }
  const entries = read.records as readonly AdaptableJournalEntry[];
  return journalEntriesToSnapshots(entries, ownerId);
}

export function useJournalSnapshots(
  ownerId: string | null | undefined,
): readonly DecisionMemorySnapshot[] {
  const [snapshots, setSnapshots] = useState<readonly DecisionMemorySnapshot[]>(EMPTY);

  const refresh = useCallback(() => {
    if (typeof window === "undefined" || !ownerId) {
      setSnapshots(EMPTY);
      return;
    }
    setSnapshots(readJournalSnapshots(window.localStorage, ownerId));
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

  return snapshots;
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
