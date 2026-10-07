/**
 * DESK LINK BUS — the one owner of what linked Desk screens say to each other
 * (2026-10-07, Constitution OPEN item "Desk has no linked symbol/crosshair, no
 * drag from Watchlist and no second-window support").
 *
 * Two messages, both PREFERENCES or POINTER state — never market truth:
 *   "sym" — a link group's market (and timeframe, when the desk links them)
 *   "x"   — the hovered TIME on one screen (null = the pointer left)
 *
 * One bus per window. Same-window listeners are called synchronously; other
 * windows of this origin hear it over ONE BroadcastChannel (the pattern the
 * tape hub in useWebSocket uses). Where BroadcastChannel does not exist the
 * bus is window-local: linking still works inside the window and the Desk
 * says plainly that other windows are not linked. The bus carries no market
 * data and opens no subscription — a second window's market streams join the
 * existing shared tape hubs (Web Lock leader + BroadcastChannel), not this.
 */

import type { DeskLink } from "@/lib/desk/desks";

export const DESK_LINK_CHANNEL = "wm-desk-link-v1";

export type DeskLinkMessage =
  | { readonly k: "sym"; readonly group: DeskLink; readonly symbol?: string; readonly timeframe?: string; readonly from: string }
  | { readonly k: "x"; readonly group: DeskLink; readonly time: number | null; readonly from: string };

export interface DeskLinkBus {
  /** True when other windows of this origin hear this one. */
  readonly crossWindow: boolean;
  /** This window's id (a pane's `from` is `${windowId}:${index}`). */
  readonly windowId: string;
  publish(msg: DeskLinkMessage): void;
  /** `remote` is true for a message from another window. */
  subscribe(fn: (msg: DeskLinkMessage, remote: boolean) => void): () => void;
  dispose(): void;
}

type ChannelCtor = new (name: string) => { postMessage(m: unknown): void; close(): void; onmessage: ((e: { data: unknown }) => void) | null };

function isMessage(m: unknown): m is DeskLinkMessage {
  if (!m || typeof m !== "object") return false;
  const o = m as Record<string, unknown>;
  if (typeof o.from !== "string" || ![1, 2, 3, 4].includes(o.group as number)) return false;
  if (o.k === "sym") return (o.symbol === undefined || typeof o.symbol === "string") && (o.timeframe === undefined || typeof o.timeframe === "string") && (o.symbol !== undefined || o.timeframe !== undefined);
  if (o.k === "x") return o.time === null || (typeof o.time === "number" && Number.isFinite(o.time));
  return false;
}

/** PURE-ish factory (the channel constructor is injected for tests). */
export function createDeskLinkBus(Channel: ChannelCtor | null | undefined, windowId: string = Math.random().toString(36).slice(2, 10)): DeskLinkBus {
  const listeners = new Set<(msg: DeskLinkMessage, remote: boolean) => void>();
  let chan: InstanceType<ChannelCtor> | null = null;
  try { chan = Channel ? new Channel(DESK_LINK_CHANNEL) : null; } catch { chan = null; }
  if (chan) chan.onmessage = e => { if (isMessage(e.data)) listeners.forEach(fn => fn(e.data as DeskLinkMessage, true)); };
  return {
    crossWindow: !!chan,
    windowId,
    publish(msg) {
      listeners.forEach(fn => fn(msg, false));
      try { chan?.postMessage(msg); } catch { /* window-local */ }
    },
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    dispose() { listeners.clear(); try { chan?.close(); } catch { /* */ } chan = null; },
  };
}

let shared: DeskLinkBus | null = null;
/** The window's one bus (lazily created; never on the server). */
export function deskLinkBus(): DeskLinkBus {
  if (!shared) shared = createDeskLinkBus(typeof BroadcastChannel === "function" ? (BroadcastChannel as unknown as ChannelCtor) : null);
  return shared;
}

/**
 * LINKED CROSSHAIR, BY TIME — the bar on THIS screen that contains `time`.
 * `times` ascending (bar open seconds); `intervalSec` this screen's bar size.
 * Null when the time is before the first bar, after the last bar closes, or
 * in a gap between bars (overnight, weekend): no hairline is drawn for a time
 * this screen does not show. Binary search; no allocation. PURE.
 */
export function barTimeContaining(count: number, timeAt: (i: number) => number, time: number, intervalSec: number): number | null {
  if (!(count > 0) || !Number.isFinite(time) || !(intervalSec > 0)) return null;
  let lo = 0, hi = count - 1;
  if (time < timeAt(0)) return null;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (timeAt(mid) <= time) lo = mid; else hi = mid - 1;
  }
  const open = timeAt(lo);
  return time < open + intervalSec ? open : null;
}
