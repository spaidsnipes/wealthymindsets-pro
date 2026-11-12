"use client";

/**
 * The ONE reader/writer of the session day on this device (sessionDay.ts is the pure owner). Owner-scoped:
 * the key carries the signed-in member, so two people on one browser never share a lock or a result.
 * Every write is announced in this tab (SESSION_DAY_EVENT) and reaches other tabs through `storage`.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { memberKeyOf } from "@/lib/journal/managementOwner";
import { marketDayKey } from "@/lib/journal/localDayKey";
import { proofSceneHoldsWrites } from "@/lib/chart/proofScene";
import { readSessionDay, SESSION_DAY_BASE_KEY, storedSessionDay, type SessionDay } from "@/lib/session/sessionDay";

export const SESSION_DAY_EVENT = "wm-session-day";

export const sessionDayKeyFor = (memberId: string) => memberKeyOf(SESSION_DAY_BASE_KEY, memberId);

export function loadSessionDay(key: string, today: string = marketDayKey()): SessionDay {
  try { return readSessionDay(JSON.parse(window.localStorage.getItem(key) ?? "null"), today); } catch { return readSessionDay(null, today); }
}

export function saveSessionDay(key: string, d: SessionDay): void {
  try {
    if (proofSceneHoldsWrites()) return;
    window.localStorage.setItem(key, JSON.stringify(storedSessionDay(d)));
    window.dispatchEvent(new CustomEvent(SESSION_DAY_EVENT, { detail: key }));
  } catch { /* storage refused: the day lives for this page only */ }
}

export function useSessionDay(): { readonly key: string | null; readonly day: SessionDay | null; readonly update: (fn: (d: SessionDay) => SessionDay) => void } {
  const { user } = useAuth();
  const key = user?.id ? sessionDayKeyFor(user.id) : null;
  const [day, setDay] = useState<SessionDay | null>(null);
  useEffect(() => {
    if (!key) { setDay(null); return; }
    const read = () => setDay(loadSessionDay(key));
    read();
    const onStorage = (e: StorageEvent) => { if (e.key === key) read(); };
    const onLocal = (e: Event) => { if ((e as CustomEvent).detail === key) read(); };
    // The market day rolls while the page stays open.
    const tick = window.setInterval(read, 60_000);
    window.addEventListener("storage", onStorage);
    window.addEventListener(SESSION_DAY_EVENT, onLocal);
    return () => { window.clearInterval(tick); window.removeEventListener("storage", onStorage); window.removeEventListener(SESSION_DAY_EVENT, onLocal); };
  }, [key]);
  const update = useCallback((fn: (d: SessionDay) => SessionDay) => {
    if (!key) return;
    const next = fn(loadSessionDay(key));
    saveSessionDay(key, next);
    setDay(next);
  }, [key]);
  return { key, day, update };
}
