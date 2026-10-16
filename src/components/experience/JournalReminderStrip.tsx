"use client";

/**
 * PLATE 34 · THE JOURNAL REMINDER IS ITS OWN SWITCH (Garden 19 finish line, Founder 2026-10-15).
 * "Journal reminder is separate from real risk gates. 'Skip journal today' / 'Remind me later' turns the
 * reminder off so it doesn't keep showing WAIT; the user can journal later. It never bypasses real
 * execution protections."
 *
 * It shows only when the trader traded today (the broker's own episodes) and has no journal entry today
 * (ET day, the Founder's ruling). It holds nothing: no verdict, no permission, no gate reads it.
 * Skip today hides it until tomorrow (ET); Remind me later hides it for an hour. A proof scene never writes.
 */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { proofSceneHoldsWrites } from "@/lib/chart/proofScene";

export const JOURNAL_REMINDER_KEY = "wm_journalReminder";
const HOUR = 60 * 60 * 1000;

export function etDayKey(ms: number): string {
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

interface ReminderState { readonly skipDay?: string; readonly snoozeUntil?: number }

function readState(): ReminderState {
  try { const raw = window.localStorage.getItem(JOURNAL_REMINDER_KEY); return raw ? (JSON.parse(raw) as ReminderState) : {}; } catch { return {}; }
}

/** PURE: should the reminder show? */
export function journalReminderVisible(i: { tradesToday: number | null; journaledToday: boolean; state: ReminderState; nowMs: number }): boolean {
  if (!(i.tradesToday && i.tradesToday > 0) || i.journaledToday) return false;
  if (i.state.skipDay === etDayKey(i.nowMs)) return false;
  if (i.state.snoozeUntil && i.state.snoozeUntil > i.nowMs) return false;
  return true;
}

export function JournalReminderStrip({ tradesToday, journaledToday }: {
  readonly tradesToday: number | null;
  readonly journaledToday: boolean;
}): React.ReactElement | null {
  const [state, setState] = useState<ReminderState | null>(null);
  useEffect(() => { setState(readState()); }, []);
  if (state === null) return null;
  const now = Date.now();
  if (!journalReminderVisible({ tradesToday, journaledToday, state, nowMs: now })) return null;
  const save = (next: ReminderState) => {
    setState(next);
    if (!proofSceneHoldsWrites()) { try { window.localStorage.setItem(JOURNAL_REMINDER_KEY, JSON.stringify(next)); } catch { /* this visit only */ } }
  };
  const btn: React.CSSProperties = { minHeight: 32, padding: "0 10px", borderRadius: 6, font: "600 13px/1 ui-sans-serif, system-ui, sans-serif", cursor: "pointer" };
  return (
    <div data-testid="journal-reminder" role="group" aria-label="Journal reminder"
      style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, border: "1px dashed rgba(212,175,55,0.45)", display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ font: "500 14px/1.35 ui-sans-serif, system-ui, sans-serif", color: "#EDE6D3" }}>
        <strong style={{ color: "#F3D78A" }}>Journal reminder</strong> · you haven&apos;t journaled today.
      </span>
      <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <Link href="/journal" data-testid="journal-reminder-now" style={{ ...btn, display: "inline-flex", alignItems: "center", border: "1px solid rgba(212,175,55,0.8)", color: "#F3D78A", textDecoration: "none" }}>Journal now</Link>
        <button type="button" data-testid="journal-reminder-later" onClick={() => save({ ...state, snoozeUntil: now + HOUR })}
          style={{ ...btn, border: "1px solid rgba(196,165,116,0.35)", background: "transparent", color: "#EDE6D3" }}>Remind me later</button>
        <button type="button" data-testid="journal-reminder-skip" onClick={() => save({ ...state, skipDay: etDayKey(now) })}
          style={{ ...btn, border: "1px solid rgba(196,165,116,0.35)", background: "transparent", color: "#EDE6D3" }}>Skip today</button>
      </span>
      <span style={{ font: "500 13px/1.3 ui-sans-serif, system-ui, sans-serif", color: "#a99f86" }}>Skipping never bypasses risk checks.</span>
    </div>
  );
}
