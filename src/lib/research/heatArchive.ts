/**
 * RESEARCH HEAT ARCHIVE — Garden 18 §XCII; registry: "Saved/historical
 * research heat = Research Heat Archive" (the live board is the Scanner
 * Deck's Opportunity Map).
 *
 * A snapshot is what the trader SAVED from the map: each symbol's observed %
 * change for one period, when the provider observed it, and the quality the
 * map stated at that moment. It is the trader's own research note — derived
 * percentages, never raw quotes — and it lives in THIS BROWSER (WM Pro adds
 * no tables); the room says so.
 *
 * Comparison is arithmetic on two observed sets. Nothing is predicted.
 */

export const HEAT_ARCHIVE_KEY = "wm_research_heat_archive_v1";
export const HEAT_ARCHIVE_MAX = 40;

export type HeatQuality = "LIVE" | "HISTORICAL" | "DEGRADED" | "UNKNOWN" | string;

export interface HeatSnapshot {
  readonly id: string;
  /** When the trader pressed Save (ms). */
  readonly savedAt: number;
  /** The provider's observation time for the round, when it gave one. */
  readonly observedAt: number | null;
  readonly period: string;
  readonly universe: string;
  readonly quality: HeatQuality;
  /** The trader's own words, optional. */
  readonly note: string;
  /** symbol → observed % change over `period`. */
  readonly pcts: Readonly<Record<string, number>>;
}

export interface HeatBreadth { readonly up: number; readonly down: number; readonly flat: number; readonly total: number; readonly upShare: number }

export function heatBreadth(pcts: Readonly<Record<string, number>>): HeatBreadth {
  let up = 0, down = 0, flat = 0;
  for (const v of Object.values(pcts)) {
    if (!Number.isFinite(v)) continue;
    if (v > 0) up++; else if (v < 0) down++; else flat++;
  }
  const total = up + down + flat;
  return { up, down, flat, total, upShare: total ? up / total : 0 };
}

export function heatLeaders(pcts: Readonly<Record<string, number>>, n = 5): { readonly leaders: readonly [string, number][]; readonly laggards: readonly [string, number][] } {
  const rows = Object.entries(pcts).filter(([, v]) => Number.isFinite(v)).sort((a, b) => b[1] - a[1]);
  return { leaders: rows.slice(0, n), laggards: rows.slice(-n).reverse() };
}

export interface HeatShift { readonly symbol: string; readonly then: number; readonly now: number; readonly delta: number }

/** Symbols present in both, ordered by how far their reading moved between the two. */
export function heatShifts(then: Readonly<Record<string, number>>, now: Readonly<Record<string, number>>, n = 8): readonly HeatShift[] {
  const out: HeatShift[] = [];
  for (const [symbol, a] of Object.entries(then)) {
    const b = now[symbol];
    if (!Number.isFinite(a) || b == null || !Number.isFinite(b)) continue;
    out.push({ symbol, then: a, now: b, delta: b - a });
  }
  return out.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, n);
}

function parse(raw: string | null): HeatSnapshot[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((s): s is HeatSnapshot => !!s && typeof s === "object" && typeof (s as HeatSnapshot).id === "string" && typeof (s as HeatSnapshot).pcts === "object");
  } catch { return []; }
}

export function readHeatArchive(): readonly HeatSnapshot[] {
  try { return parse(localStorage.getItem(HEAT_ARCHIVE_KEY)).sort((a, b) => b.savedAt - a.savedAt); } catch { return []; }
}

function write(list: readonly HeatSnapshot[]): boolean {
  try { localStorage.setItem(HEAT_ARCHIVE_KEY, JSON.stringify(list.slice(0, HEAT_ARCHIVE_MAX))); return true; } catch { return false; }
}

/** Save one snapshot (newest first, capped). Returns null when storage refuses or there is nothing to save. */
export function saveHeatSnapshot(input: Omit<HeatSnapshot, "id" | "savedAt">, now = Date.now()): HeatSnapshot | null {
  const rows = Object.entries(input.pcts).filter(([, v]) => Number.isFinite(v));
  if (!rows.length) return null;
  const snap: HeatSnapshot = { ...input, pcts: Object.fromEntries(rows), id: `heat-${now.toString(36)}`, savedAt: now };
  return write([snap, ...readHeatArchive()]) ? snap : null;
}

export function deleteHeatSnapshot(id: string): void {
  write(readHeatArchive().filter(s => s.id !== id));
}
