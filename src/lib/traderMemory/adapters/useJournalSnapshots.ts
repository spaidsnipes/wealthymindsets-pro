"use client";
import { useEffect, useState, useCallback } from "react";
import {
  journalEntriesToSnapshots,
  type AdaptableJournalEntry,
} from "./journalEntryToSnapshot";
import type { DecisionMemorySnapshot } from "../viewModels/selectProcessLandscape";

/**
 * useJournalSnapshots — reads localStorage journal entries + returns
 * them as DecisionMemorySnapshot[] via the adapter.
 *
 * Subscribes to a custom 'wm-journal-updated' event so consumers
 * across surfaces (Journal, Profile Growth, Command Deck) stay in
 * sync when the trader saves a new entry from the Journal page.
 *
 * Owner-scoped by caller — pass null to opt out. Empty when SSR or
 * when localStorage is inaccessible.
 */

const JOURNAL_KEY = "wm-journal";
const JOURNAL_EVENT = "wm-journal-updated";
const EMPTY: readonly DecisionMemorySnapshot[] = Object.freeze([]);

function readJournal(): readonly AdaptableJournalEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useJournalSnapshots(
  ownerId: string | null | undefined,
): readonly DecisionMemorySnapshot[] {
  const [snapshots, setSnapshots] = useState<readonly DecisionMemorySnapshot[]>(EMPTY);

  const refresh = useCallback(() => {
    if (!ownerId) {
      setSnapshots(EMPTY);
      return;
    }
    setSnapshots(journalEntriesToSnapshots(readJournal(), ownerId));
  }, [ownerId]);

  useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;
    const handler = () => refresh();
    window.addEventListener(JOURNAL_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(JOURNAL_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  return snapshots;
}

/** Callable from a journal-mutating consumer to notify other subscribers. */
export function notifyJournalChanged(): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(JOURNAL_EVENT));
  } catch {
    /* dispatchEvent may be unavailable in some sandbox contexts */
  }
}
