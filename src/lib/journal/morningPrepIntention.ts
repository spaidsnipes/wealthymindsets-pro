/**
 * TODAY'S INTENTION, FROM MORNING PREP (coordinator ruling 2026-10-10, order §9 lifecycle). PURE + one reader.
 *
 * Morning Prep's "Routine & intentions" text is the trader's own words for the day. The ticket's management
 * plan card shows it read-only as "Today's intention", and it is frozen WITH the plan per Decision_ID (into the
 * plan's `context`, its source named "morning prep intention") — only when the trader wrote no context of his
 * own, and only if it was written before the freeze. It is read from Morning Prep's own store (keyed by the
 * member); nothing is copied anywhere else.
 */
import { readMorningPrepEntries, type MorningPrepEntry } from "@/lib/traderMemory/morningPrepStorage";

import { marketDayKey } from "./localDayKey";
import { currentManagementOwner } from "./managementOwner";

export const INTENTION_SOURCE = "morning prep intention";
const MAX = 400;

/** The latest Morning Prep entry of the market day of `atMs`, saved at or before it, with words in it. */
export function intentionOf(entries: readonly MorningPrepEntry[], atMs: number): string | null {
  const day = marketDayKey(new Date(atMs));
  let best: MorningPrepEntry | null = null;
  for (const e of entries) {
    const t = Date.parse(e.date);
    if (!Number.isFinite(t) || marketDayKey(new Date(t)) !== day || e.createdAt > atMs || !e.routine.trim()) continue;
    if (!best || e.createdAt > best.createdAt) best = e;
  }
  return best ? best.routine.trim().slice(0, MAX) : null;
}

/** The signed-in member's intention for the day of `atMs` (null for no member, no prep, or a blank one). */
export function readTodaysIntention(atMs: number, storage?: Pick<Storage, "getItem" | "setItem"> | null): string | null {
  const owner = currentManagementOwner();
  if (typeof owner !== "string" || !owner) return null;
  const r = storage === undefined ? readMorningPrepEntries(owner) : readMorningPrepEntries(owner, storage);
  return r.state === "PRESENT" ? intentionOf(r.entries, atMs) : null;
}
