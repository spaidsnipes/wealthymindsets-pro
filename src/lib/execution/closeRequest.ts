/**
 * CLOSE, ASKED FROM THE POSITION STRIP (2026-10-10). The strip's CLOSE opens the ONE ticket and asks it
 * to load FLATTEN — the ticket's own closing MARKET order for the held quantity, read back from the
 * broker. Nothing here sends: the ticket loads the order only if its book says FLATTEN is LOADABLE, and
 * preview, the server gate and the trader's confirmation still stand between it and the broker.
 * A request is per chart symbol, consumed once, and forgotten after CLOSE_REQUEST_TTL_MS.
 */

import { useSyncExternalStore } from "react";

export const CLOSE_REQUEST_TTL_MS = 15_000;

let pending: { readonly symbol: string; readonly seq: number; readonly atMs: number } | null = null;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

export function requestClose(symbol: string, nowMs: number = Date.now()): void {
  pending = { symbol: symbol.trim().toUpperCase(), seq: ++seq, atMs: nowMs };
  emit();
}

/** The live request for this chart symbol (null when none, another symbol's, or expired). */
export function closeRequestFor(symbol: string, nowMs: number = Date.now()): { readonly seq: number } | null {
  if (!pending || pending.symbol !== symbol.trim().toUpperCase() || nowMs - pending.atMs > CLOSE_REQUEST_TTL_MS) return null;
  return { seq: pending.seq };
}

/** The ticket answered it (loaded, refused, or nothing to close) — it is never acted on twice. */
export function consumeCloseRequest(requestSeq: number): void {
  if (pending?.seq === requestSeq) { pending = null; emit(); }
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function useCloseRequestSeq(symbol: string): number | null {
  return useSyncExternalStore(subscribe, () => closeRequestFor(symbol)?.seq ?? null, () => null);
}
