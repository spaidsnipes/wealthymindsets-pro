/**
 * DESKS — Garden 18 §XIV–§XVI: several trade screens, ONE operating system.
 *
 * A desk is a PREFERENCE: a layout and, per screen, a market and a timeframe.
 * It never stores market truth (no prices, no bars, no walls) — restoring a
 * desk tomorrow re-asks the market for everything (§XVI "Restore preferences.
 * Re-fetch truth."). Symbols and timeframes are validated by the same owners
 * the /charts deep link uses, so a desk can only hold what /charts would open.
 *
 * PURE.
 */

import { normalizeMarketSurfaceSymbol, normalizeMarketSurfaceTimeframe } from "@/lib/routing/marketSurfaceQuery";
import type { TFId } from "@/lib/timeframes";

export type DeskLayout = 1 | 2 | 3 | 4;
export interface DeskScreen { readonly symbol: string; readonly timeframe: TFId }
export interface Desk { readonly name: string; readonly layout: DeskLayout; readonly screens: readonly DeskScreen[] }

export const DESKS_STORAGE_KEY = "wm_desks_v1";
export const ACTIVE_DESK_STORAGE_KEY = "wm_desk_active_v1";
export const MAX_SCREENS = 4;

/** The Founder's own example (Garden 18 final command): TSLA · NQ · BTC · SPY. */
export const MORNING_DESK: Desk = {
  name: "Morning Desk",
  layout: 4,
  screens: [
    { symbol: "TSLA", timeframe: "5m" },
    { symbol: "NQ1!", timeframe: "5m" },
    { symbol: "BTC", timeframe: "5m" },
    { symbol: "SPY", timeframe: "5m" },
  ],
};

export function isDeskLayout(n: unknown): n is DeskLayout {
  return n === 1 || n === 2 || n === 3 || n === 4;
}

/** A desk with exactly `layout` screens: extra screens are kept off-stage, missing ones borrow the first market. */
export function screensFor(desk: Desk): readonly DeskScreen[] {
  const first = desk.screens[0] ?? MORNING_DESK.screens[0];
  return Array.from({ length: desk.layout }, (_, i) => desk.screens[i] ?? first);
}

/** CSS grid for a layout: 1 full, 2 side by side, 3 = one wide over two, 4 = 2×2. */
export function gridFor(layout: DeskLayout): { readonly columns: string; readonly rows: string; readonly areas: readonly string[] } {
  switch (layout) {
    case 1: return { columns: "1fr", rows: "1fr", areas: ["1 / 1 / 2 / 2"] };
    case 2: return { columns: "1fr 1fr", rows: "1fr", areas: ["1 / 1 / 2 / 2", "1 / 2 / 2 / 3"] };
    case 3: return { columns: "1fr 1fr", rows: "1fr 1fr", areas: ["1 / 1 / 2 / 3", "2 / 1 / 3 / 2", "2 / 2 / 3 / 3"] };
    case 4: return { columns: "1fr 1fr", rows: "1fr 1fr", areas: ["1 / 1 / 2 / 2", "1 / 2 / 2 / 3", "2 / 1 / 3 / 2", "2 / 2 / 3 / 3"] };
  }
}

/** One stored desk, or null when it cannot be trusted as one. */
export function readDesk(raw: unknown): Desk | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { name?: unknown; layout?: unknown; screens?: unknown };
  const name = typeof r.name === "string" ? r.name.trim().slice(0, 40) : "";
  if (!name || !isDeskLayout(r.layout) || !Array.isArray(r.screens)) return null;
  const screens: DeskScreen[] = [];
  for (const s of r.screens.slice(0, MAX_SCREENS)) {
    const o = (s ?? {}) as { symbol?: unknown; timeframe?: unknown };
    const symbol = normalizeMarketSurfaceSymbol(typeof o.symbol === "string" ? o.symbol : null);
    const timeframe = normalizeMarketSurfaceTimeframe(typeof o.timeframe === "string" ? o.timeframe : null);
    if (symbol && timeframe) screens.push({ symbol, timeframe });
  }
  return screens.length ? { name, layout: r.layout, screens } : null;
}

/** The stored desk list; Morning Desk when nothing valid is stored. Names are unique (first wins). */
export function readDesks(json: string | null): readonly Desk[] {
  let parsed: unknown = null;
  try { parsed = json ? JSON.parse(json) : null; } catch { parsed = null; }
  const desks: Desk[] = [];
  const seen = new Set<string>();
  for (const d of Array.isArray(parsed) ? parsed : []) {
    const desk = readDesk(d);
    if (desk && !seen.has(desk.name.toLowerCase())) { seen.add(desk.name.toLowerCase()); desks.push(desk); }
  }
  return desks.length ? desks : [MORNING_DESK];
}

/** Replace (by name) or append. */
export function upsertDesk(desks: readonly Desk[], desk: Desk): readonly Desk[] {
  const i = desks.findIndex(d => d.name.toLowerCase() === desk.name.toLowerCase());
  return i >= 0 ? desks.map((d, j) => (j === i ? desk : d)) : [...desks, desk];
}

export function renameDesk(desks: readonly Desk[], from: string, to: string): readonly Desk[] | null {
  const name = to.trim().slice(0, 40);
  if (!name || desks.some(d => d.name.toLowerCase() === name.toLowerCase() && d.name !== from)) return null;
  return desks.map(d => (d.name === from ? { ...d, name } : d));
}

/** Delete, never leaving zero desks. */
export function deleteDesk(desks: readonly Desk[], name: string): readonly Desk[] {
  const left = desks.filter(d => d.name !== name);
  return left.length ? left : [MORNING_DESK];
}

/** Change one screen's market or timeframe, validated by the same owners. */
export function setScreen(desk: Desk, index: number, patch: { symbol?: string; timeframe?: string }): Desk {
  const screens = [...screensFor({ ...desk, layout: MAX_SCREENS as DeskLayout }).slice(0, Math.max(desk.screens.length, desk.layout))];
  const cur = screens[index];
  if (!cur) return desk;
  const symbol = patch.symbol !== undefined ? normalizeMarketSurfaceSymbol(patch.symbol) ?? cur.symbol : cur.symbol;
  const timeframe = patch.timeframe !== undefined ? normalizeMarketSurfaceTimeframe(patch.timeframe) ?? cur.timeframe : cur.timeframe;
  screens[index] = { symbol, timeframe };
  return { ...desk, screens };
}
