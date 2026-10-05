"use client";
import { useCallback, useEffect, useState } from "react";
import {
  MORNING_PREP_CHANGED_EVENT,
  morningPrepStorageKey,
  readMorningPrepEntries,
  type MorningPrepReadState,
} from "@/lib/traderMemory/morningPrepStorage";

/**
 * useTodayPrep — reads today's morning-prep entry (if any) so surfaces
 * outside /morning-prep can surface the trader's stated intention.
 *
 * Founder Aug-14 §14 explicit ask: 'Morning Prep intention appears
 * later in review.' — this hook is the read path that makes it possible.
 *
 * Reads the same immutable-UID owner used by /morning-prep. Legacy
 * handle/email/guest keys are intentionally unattributed and unread.
 * Subscribes to native other-tab storage events and the shared owner's
 * same-document change event.
 */

export interface TodayPrepSummary {
  readonly hasEntry: boolean;
  readonly date: string | null;    // ISO date "2025-08-13"
  readonly routine: string | null; // free-text intention
  readonly mood: string | null;    // emoji
  readonly checklistDone: number;
  readonly checklistTotal: number;
  readonly readState: MorningPrepReadState;
}

const UNAVAILABLE: TodayPrepSummary = {
  hasEntry: false,
  date: null,
  routine: null,
  mood: null,
  checklistDone: 0,
  checklistTotal: 0,
  readState: "UNAVAILABLE",
};

// "Today" is the US market day (New York), on both sides of the comparison.
// It was the UTC day: a Sydney trader's 08:00 prep landed on yesterday's UTC
// date and the Opening Bell said there was none; a Los Angeles prep written at
// 17:30 for tomorrow counted as today's (garden pass 2026-10-05).
const ET_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });

function isoDate(ms: number): string {
  return ET_DAY.format(new Date(ms));
}

function entryDay(date: string): string {
  const ms = Date.parse(date);
  return Number.isFinite(ms) ? isoDate(ms) : date.slice(0, 10);
}

function readToday(userId: string | null, todayIso: string): TodayPrepSummary {
  const result = readMorningPrepEntries(userId);
  if (result.state === "UNAVAILABLE") return UNAVAILABLE;
  const today = result.entries.find((entry) => entryDay(entry.date) === todayIso);
  if (!today) return { ...UNAVAILABLE, readState: "ABSENT" };
  return {
    hasEntry: true,
    date: today.date,
    routine: today.routine.trim() || null,
    mood: today.mood || null,
    checklistDone: today.checklist.filter(item => item.done).length,
    checklistTotal: today.checklist.length,
    readState: "PRESENT",
  };
}

export function useTodayPrep(userId: string | null, nowMs?: number): TodayPrepSummary {
  const today = isoDate(nowMs ?? (typeof window !== "undefined" ? Date.now() : 0));
  const [ownedState, setOwnedState] = useState<{ ownerId: string | null; summary: TodayPrepSummary }>({
    ownerId: null,
    summary: UNAVAILABLE,
  });
  const refresh = useCallback(
    () => setOwnedState({ ownerId: userId, summary: readToday(userId, today) }),
    [userId, today],
  );

  useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;
    const key = morningPrepStorageKey(userId);
    const onStorage = (e: StorageEvent) => {
      if (key && e.key === key) refresh();
    };
    const onSameDocumentChange = (event: Event) => {
      const ownerId = (event as CustomEvent<{ ownerId?: unknown }>).detail?.ownerId;
      if (ownerId === userId) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(MORNING_PREP_CHANGED_EVENT, onSameDocumentChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(MORNING_PREP_CHANGED_EVENT, onSameDocumentChange);
    };
  }, [refresh, userId]);

  return ownedState.ownerId === userId ? ownedState.summary : UNAVAILABLE;
}
