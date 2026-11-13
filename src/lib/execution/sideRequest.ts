/**
 * THE SIDE A CHART BUTTON ASKED FOR (TradingView parity, Founder 2026-11-12: the SELL / BUY spread buttons on the chart).
 * A press on the chart's SELL or BUY opens the ONE ticket with that side picked and the touch price as the draft entry.
 * Nothing is sent: preview, the server gate and the trader's confirmation still stand. Per chart symbol, consumed once,
 * forgotten after SIDE_REQUEST_TTL_MS (the same shape as closeRequest.ts).
 */
import { useSyncExternalStore } from "react";

export const SIDE_REQUEST_TTL_MS = 15_000;
export type TicketSide = "BUY" | "SELL";

let pending: { readonly symbol: string; readonly side: TicketSide; readonly seq: number; readonly atMs: number } | null = null;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

export function requestTicketSide(symbol: string, side: TicketSide, nowMs: number = Date.now()): void {
  pending = { symbol: symbol.trim().toUpperCase(), side, seq: ++seq, atMs: nowMs };
  emit();
}
export function sideRequestFor(symbol: string, nowMs: number = Date.now()): { readonly seq: number; readonly side: TicketSide } | null {
  if (!pending || pending.symbol !== symbol.trim().toUpperCase() || nowMs - pending.atMs > SIDE_REQUEST_TTL_MS) return null;
  return { seq: pending.seq, side: pending.side };
}
export function consumeSideRequest(requestSeq: number): void {
  if (pending?.seq === requestSeq) { pending = null; emit(); }
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function useSideRequest(symbol: string): { readonly seq: number; readonly side: TicketSide } | null {
  const key = useSyncExternalStore(subscribe, () => { const r = sideRequestFor(symbol); return r ? `${r.seq}:${r.side}` : ""; }, () => "");
  if (!key) return null;
  const [s, side] = key.split(":");
  return { seq: Number(s), side: side as TicketSide };
}
