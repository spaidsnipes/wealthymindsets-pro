/**
 * THE FOOTPRINT HALF OF A VIEW — Garden 18 §XVII ("tool selection").
 *
 * The footprint mode and Big Trades live in the chart room's own state, not in
 * the reading switches a View already carries. The room ANNOUNCES them here
 * (so a View can save them) and LISTENS here (so a View can restore them) —
 * the door never reaches the room's setters, the same rule saved switches obey.
 */
export const FOOTPRINT_MODES = ["bid-ask", "delta", "volume-profile", "imbalance", "aggressive-passive", "big-trades"] as const;
export type FootprintMode = (typeof FOOTPRINT_MODES)[number];

export interface FootprintPrefs {
  readonly enabled: boolean;
  readonly mode: FootprintMode;
  readonly bigTrades: boolean;
}

const REQUEST_EVENT = "wm:footprint-prefs-request";
let announced: FootprintPrefs | null = null;

export function parseFootprintPrefs(raw: unknown): FootprintPrefs | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.enabled !== "boolean" || typeof o.bigTrades !== "boolean") return null;
  if (!FOOTPRINT_MODES.includes(o.mode as FootprintMode)) return null;
  return { enabled: o.enabled, mode: o.mode as FootprintMode, bigTrades: o.bigTrades };
}

/** Room side: what the footprint is right now. */
export function announceFootprintPrefs(p: FootprintPrefs | null): void { announced = p; }
/** Door side: what to save. */
export function announcedFootprintPrefs(): FootprintPrefs | null { return announced; }

/** Door side: "arrange the footprint this way." */
export function requestFootprintPrefs(p: FootprintPrefs): void {
  if (typeof document === "undefined") return;
  document.dispatchEvent(new CustomEvent(REQUEST_EVENT, { detail: p }));
}

/** Room side. Normalised at the door: only a well-formed request reaches the handler. */
export function subscribeFootprintPrefsRequests(fn: (p: FootprintPrefs) => void): () => void {
  if (typeof document === "undefined") return () => {};
  const h = (e: Event) => { const p = parseFootprintPrefs((e as CustomEvent).detail); if (p) fn(p); };
  document.addEventListener(REQUEST_EVENT, h);
  return () => document.removeEventListener(REQUEST_EVENT, h);
}
