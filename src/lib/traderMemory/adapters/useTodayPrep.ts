"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * useTodayPrep — reads today's morning-prep entry (if any) so surfaces
 * outside /morning-prep can surface the trader's stated intention.
 *
 * Founder Aug-14 §14 explicit ask: 'Morning Prep intention appears
 * later in review.' — this hook is the read path that makes it possible.
 *
 * localStorage key: wm_morning_prep_<handle> (matches
 * src/app/morning-prep/page.tsx storeKey()).
 *
 * Subscribes to the standard 'storage' event so a save in the prep tab
 * shows up in Command Deck without a manual refresh.
 */

interface PrepEntry {
  id: string;
  date: string; // ISO date string
  routine: string;
  mood: string;
  checklist: { id: string; text: string; done: boolean }[];
  photo?: string | null;
  createdAt: number;
}

export interface TodayPrepSummary {
  readonly hasEntry: boolean;
  readonly date: string | null;    // ISO date "2025-08-13"
  readonly routine: string | null; // free-text intention
  readonly mood: string | null;    // emoji
  readonly checklistDone: number;
  readonly checklistTotal: number;
}

const EMPTY: TodayPrepSummary = {
  hasEntry: false,
  date: null,
  routine: null,
  mood: null,
  checklistDone: 0,
  checklistTotal: 0,
};

function storeKey(handle: string): string {
  return `wm_morning_prep_${handle || "guest"}`;
}

function isoDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function readToday(handle: string, todayIso: string): TodayPrepSummary {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(storeKey(handle));
    if (!raw) return EMPTY;
    const entries = JSON.parse(raw) as PrepEntry[];
    if (!Array.isArray(entries) || entries.length === 0) return EMPTY;
    const today = entries.find((e) => (e.date ?? "").slice(0, 10) === todayIso);
    if (!today) return EMPTY;
    const done = today.checklist.filter((c) => c.done).length;
    return {
      hasEntry: true,
      date: today.date,
      routine: today.routine?.trim() || null,
      mood: today.mood || null,
      checklistDone: done,
      checklistTotal: today.checklist.length,
    };
  } catch {
    return EMPTY;
  }
}

/**
 * Handle is typically the user handle or id (matches morning-prep's
 * storeKey('guest' fallback)). Pass empty string for guests.
 */
export function useTodayPrep(handle: string, nowMs?: number): TodayPrepSummary {
  const today = isoDate(nowMs ?? (typeof window !== "undefined" ? Date.now() : 0));
  const [state, setState] = useState<TodayPrepSummary>(EMPTY);
  const refresh = useCallback(() => setState(readToday(handle, today)), [handle, today]);

  useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === storeKey(handle)) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh, handle]);

  return state;
}
