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
/** Garden 18 §LV–§LVIII: screens in the same link group follow one market. */
export type DeskLink = "A" | "B";
export const DESK_LINKS: readonly DeskLink[] = ["A", "B"];
export interface DeskScreen { readonly symbol: string; readonly timeframe: TFId; readonly link?: DeskLink; /** §LVI: the saved View (My Views id, or "clean") this screen wears. */ readonly view?: string }
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

/**
 * PHONE DESK (serving /desk at 390px, 2026-10-01): a 2×2 grid gave each
 * screen ~190px and clipped its header controls. Below 640 the same screens
 * stack in one scrolling column, each tall enough to read a chart. PURE.
 */
export function phoneGridFor(count: number): { readonly columns: string; readonly rows: string; readonly areas: readonly string[] } {
  const n = Math.max(1, Math.floor(count));
  return {
    columns: "1fr",
    rows: `repeat(${n}, minmax(360px, 70vh))`,
    areas: Array.from({ length: n }, (_, i) => `${i + 1} / 1 / ${i + 2} / 2`),
  };
}

/** One stored desk, or null when it cannot be trusted as one. */
export function readDesk(raw: unknown): Desk | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { name?: unknown; layout?: unknown; screens?: unknown };
  const name = typeof r.name === "string" ? r.name.trim().slice(0, 40) : "";
  if (!name || !isDeskLayout(r.layout) || !Array.isArray(r.screens)) return null;
  const screens: DeskScreen[] = [];
  for (const s of r.screens.slice(0, MAX_SCREENS)) {
    const o = (s ?? {}) as { symbol?: unknown; timeframe?: unknown; link?: unknown; view?: unknown };
    const symbol = normalizeMarketSurfaceSymbol(typeof o.symbol === "string" ? o.symbol : null);
    const timeframe = normalizeMarketSurfaceTimeframe(typeof o.timeframe === "string" ? o.timeframe : null);
    const link = DESK_LINKS.includes(o.link as DeskLink) ? (o.link as DeskLink) : undefined;
    const view = typeof o.view === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(o.view) ? o.view : undefined;
    if (symbol && timeframe) screens.push({ symbol, timeframe, ...(link ? { link } : {}), ...(view ? { view } : {}) });
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
  screens[index] = { ...cur, symbol, timeframe };
  return { ...desk, screens };
}

/** §LVI: wear a View on one screen (undefined = the chart's own defaults). */
export function setScreenView(desk: Desk, index: number, view: string | undefined): Desk {
  const screens = [...screensFor({ ...desk, layout: MAX_SCREENS as DeskLayout }).slice(0, Math.max(desk.screens.length, desk.layout))];
  const cur = screens[index];
  if (!cur) return desk;
  const { view: _old, ...rest } = cur;
  void _old;
  screens[index] = view ? { ...rest, view } : rest;
  return { ...desk, screens };
}

/**
 * A market chosen on one screen — and on every screen linked to it. An
 * unlinked screen changes alone. Timeframes are never linked: a 1m and a 1h
 * screen on the same market is the point of linking.
 */
export function setLinkedSymbol(desk: Desk, index: number, symbol: string): Desk {
  const sym = normalizeMarketSurfaceSymbol(symbol);
  if (!sym) return desk;
  const screens = [...screensFor({ ...desk, layout: MAX_SCREENS as DeskLayout }).slice(0, Math.max(desk.screens.length, desk.layout))];
  const link = screens[index]?.link;
  if (!screens[index]) return desk;
  return { ...desk, screens: screens.map((s, i) => (i === index || (link && s.link === link) ? { ...s, symbol: sym } : s)) };
}

/** Cycle a screen's link: none → A → B → none. */
export function cycleLink(desk: Desk, index: number): Desk {
  const screens = [...screensFor({ ...desk, layout: MAX_SCREENS as DeskLayout }).slice(0, Math.max(desk.screens.length, desk.layout))];
  const cur = screens[index];
  if (!cur) return desk;
  const next: DeskLink | undefined = cur.link === undefined ? "A" : cur.link === "A" ? "B" : undefined;
  const { link: _l, ...rest } = cur;
  void _l;
  screens[index] = next ? { ...rest, link: next } : rest;
  return { ...desk, screens };
}

/** Drag payloads the desk accepts: a market (from the Watchlist) or a screen (to swap). */
export const DESK_SYMBOL_DRAG_TYPE = "application/x-wm-symbol";
export const DESK_SCREEN_DRAG_TYPE = "application/x-wm-desk-screen";

/** Swap two screens' markets and timeframes (§XV "swap"). */
export function swapScreens(desk: Desk, a: number, b: number): Desk {
  const screens = [...screensFor({ ...desk, layout: Math.max(desk.layout, desk.screens.length, a + 1, b + 1) as DeskLayout })];
  if (a === b || !screens[a] || !screens[b]) return desk;
  [screens[a], screens[b]] = [screens[b], screens[a]];
  return { ...desk, screens };
}
