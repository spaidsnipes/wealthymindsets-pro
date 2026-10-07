/**
 * THE FILL → JOURNAL HAND-OFF. One draft, carried once, from the chart ticket
 * to /journal's new-entry form (the same `?new=1` hand-off Paper and
 * Backtesting already use). It is NOT a journal store: the draft is consumed
 * when /journal opens it, and nothing reaches the book until the trader
 * presses Save. A draft older than the TTL is dropped, not opened.
 *
 * Storage is injected (localStorage in the browser, so the sign-out clearer
 * in logoutIsolation removes an unopened draft) so this stays testable.
 */

import { readJournalCapture, type JournalCaptureDraft } from "./journalCaptureFromFill";

export const JOURNAL_CAPTURE_HANDOFF_KEY = "wm:journal-capture-handoff:v1";
export const JOURNAL_CAPTURE_HANDOFF_TTL_MS = 30 * 60_000;
/** The URL /journal reads to open the hand-off as a new entry. */
export const JOURNAL_CAPTURE_URL = "/journal?new=1&capture=1";

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;

export function offerJournalCapture(storage: Storage, draft: JournalCaptureDraft, nowMs: number): boolean {
  try {
    storage.setItem(JOURNAL_CAPTURE_HANDOFF_KEY, JSON.stringify({ atMs: nowMs, draft }));
    return true;
  } catch { return false; }
}

/** Read and REMOVE the hand-off. A reload never opens the same draft twice. */
export function takeJournalCapture(storage: Storage, nowMs: number): JournalCaptureDraft | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(JOURNAL_CAPTURE_HANDOFF_KEY);
    storage.removeItem(JOURNAL_CAPTURE_HANDOFF_KEY);
  } catch { return null; }
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { atMs?: unknown; draft?: unknown };
    if (typeof o?.atMs !== "number" || nowMs - o.atMs > JOURNAL_CAPTURE_HANDOFF_TTL_MS || nowMs < o.atMs - 60_000) return null;
    return readJournalCapture(o.draft);
  } catch { return null; }
}
