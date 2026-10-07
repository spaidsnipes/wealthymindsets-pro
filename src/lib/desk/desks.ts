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
import type { ChartTfId } from "@/lib/timeframes";

export type DeskLayout = 1 | 2 | 3 | 4;
/**
 * Garden 18 §LV–§LVIII: screens in the same link group follow one market.
 * DESK LINKING (2026-10-07): groups are NUMBERED 1–4 and every chip prints its
 * number beside its colour (never colour alone). Desks saved before then
 * stored "A"/"B"; they read back as 1/2 so a saved link survives.
 */
export type DeskLink = 1 | 2 | 3 | 4;
export const DESK_LINKS: readonly DeskLink[] = [1, 2, 3, 4];
/** Each group's ink. The number is always printed beside it. */
export const DESK_LINK_INK: Readonly<Record<DeskLink, string>> = { 1: "#C9A55C", 2: "#7fd1a8", 3: "#8fb4ff", 4: "#e59ad0" };
const LEGACY_LINK: Readonly<Record<string, DeskLink>> = { A: 1, B: 2 };
/** A stored link value → a group, or undefined (unlinked / not trustworthy). */
export function readDeskLink(raw: unknown): DeskLink | undefined {
  if (typeof raw === "number" && DESK_LINKS.includes(raw as DeskLink)) return raw as DeskLink;
  if (typeof raw === "string") return LEGACY_LINK[raw] ?? (DESK_LINKS.includes(Number(raw) as DeskLink) ? Number(raw) as DeskLink : undefined);
  return undefined;
}
export interface DeskScreen { readonly symbol: string; readonly timeframe: ChartTfId; readonly link?: DeskLink; /** §LVI: the saved View (My Views id, or "clean") this screen wears. */ readonly view?: string }
/** `linkTimeframe`: linked screens also share a timeframe (off by default — a 1m and a 1h on one market is the usual point of linking). */
export interface Desk { readonly name: string; readonly layout: DeskLayout; readonly screens: readonly DeskScreen[]; readonly linkTimeframe?: boolean }

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
    rows: `repeat(${n}, minmax(480px, 80vh))`,
    areas: Array.from({ length: n }, (_, i) => `${i + 1} / 1 / ${i + 2} / 2`),
  };
}

/**
 * TABLET PORTRAIT (Garden 19 §22, 834×1112): two screens stacked per view,
 * each half the desk's height; a 3rd/4th screen scrolls into view. PURE.
 */
export function tabletPortraitGridFor(count: number): { readonly columns: string; readonly rows: string; readonly areas: readonly string[] } {
  const n = Math.max(1, Math.floor(count));
  return {
    columns: "1fr",
    rows: n === 1 ? "1fr" : `repeat(${n}, calc(50% - 2px))`,
    areas: Array.from({ length: n }, (_, i) => `${i + 1} / 1 / ${i + 2} / 2`),
  };
}
export const DESK_TABLET_PORTRAIT_QUERY = "(min-width: 640px) and (max-width: 1023px) and (orientation: portrait)";
/** Touch glass, or any glass under 1200 wide (an iPad in landscape is 1180). */
export const DESK_TOUCH_QUERY = "(pointer: coarse), (max-width: 1199px)";
/** §22: every Desk control a finger uses is at least 44×44 on touch glass. */
export const DESK_TOUCH_CSS = ".wm-desk-chrome :is(button, select, input, a) { min-height: 44px !important; min-width: 44px !important; box-sizing: border-box; }";

/** One stored desk, or null when it cannot be trusted as one. */
export function readDesk(raw: unknown): Desk | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { name?: unknown; layout?: unknown; screens?: unknown; linkTimeframe?: unknown };
  const name = typeof r.name === "string" ? r.name.trim().slice(0, 40) : "";
  if (!name || !isDeskLayout(r.layout) || !Array.isArray(r.screens)) return null;
  const screens: DeskScreen[] = [];
  for (const s of r.screens.slice(0, MAX_SCREENS)) {
    const o = (s ?? {}) as { symbol?: unknown; timeframe?: unknown; link?: unknown; view?: unknown };
    const symbol = normalizeMarketSurfaceSymbol(typeof o.symbol === "string" ? o.symbol : null);
    const timeframe = normalizeMarketSurfaceTimeframe(typeof o.timeframe === "string" ? o.timeframe : null);
    const link = readDeskLink(o.link);
    const view = typeof o.view === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(o.view) ? o.view : undefined;
    if (symbol && timeframe) screens.push({ symbol, timeframe, ...(link ? { link } : {}), ...(view ? { view } : {}) });
  }
  return screens.length ? { name, layout: r.layout, screens, ...(r.linkTimeframe === true ? { linkTimeframe: true } : {}) } : null;
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

/** Every screen this desk can show (all stored, at least `layout`). */
function allScreens(desk: Desk): DeskScreen[] {
  return [...screensFor({ ...desk, layout: MAX_SCREENS as DeskLayout }).slice(0, Math.max(desk.screens.length, desk.layout))];
}

/**
 * A market chosen on one screen — and on every screen linked to it. An
 * unlinked screen changes alone. Timeframes link only when the desk says so
 * (`linkTimeframe`): a 1m and a 1h screen on one market is the usual point.
 */
export function setLinkedSymbol(desk: Desk, index: number, symbol: string): Desk {
  const sym = normalizeMarketSurfaceSymbol(symbol);
  if (!sym) return desk;
  const screens = allScreens(desk);
  const link = screens[index]?.link;
  if (!screens[index]) return desk;
  return { ...desk, screens: screens.map((s, i) => (i === index || (link && s.link === link) ? { ...s, symbol: sym } : s)) };
}

/** A timeframe chosen on one screen; linked screens follow only when the desk links timeframes. */
export function setLinkedTimeframe(desk: Desk, index: number, timeframe: string): Desk {
  const tf = normalizeMarketSurfaceTimeframe(timeframe);
  const screens = allScreens(desk);
  if (!tf || !screens[index]) return desk;
  const link = desk.linkTimeframe ? screens[index].link : undefined;
  return { ...desk, screens: screens.map((s, i) => (i === index || (link && s.link === link) ? { ...s, timeframe: tf } : s)) };
}

/**
 * A group's market (and, when linked, timeframe) announced by ANOTHER window:
 * every screen here in that group follows. Unlinked screens never move.
 */
export function applyGroupChange(desk: Desk, group: DeskLink, patch: { symbol?: string; timeframe?: string }): Desk {
  const sym = patch.symbol !== undefined ? normalizeMarketSurfaceSymbol(patch.symbol) : null;
  const tf = patch.timeframe !== undefined && desk.linkTimeframe ? normalizeMarketSurfaceTimeframe(patch.timeframe) : null;
  if (!sym && !tf) return desk;
  const screens = allScreens(desk);
  let changed = false;
  const next = screens.map(s => {
    if (s.link !== group) return s;
    const out = { ...s, ...(sym ? { symbol: sym } : {}), ...(tf ? { timeframe: tf } : {}) };
    if (out.symbol !== s.symbol || out.timeframe !== s.timeframe) changed = true;
    return out;
  });
  return changed ? { ...desk, screens: next } : desk;
}

/** Cycle a screen's link: none → 1 → 2 → 3 → 4 → none. */
export function cycleLink(desk: Desk, index: number): Desk {
  const screens = allScreens(desk);
  const cur = screens[index];
  if (!cur) return desk;
  const at = cur.link === undefined ? -1 : DESK_LINKS.indexOf(cur.link);
  const next: DeskLink | undefined = DESK_LINKS[at + 1];
  const { link: _l, ...rest } = cur;
  void _l;
  screens[index] = next ? { ...rest, link: next } : rest;
  return { ...desk, screens };
}

/** The chip's words: number always printed (never colour alone). */
export function linkChipLabel(link: DeskLink | undefined): string {
  return link ? `\u25CF${link}` : "unlinked";
}

/**
 * SECOND WINDOW — the desk (or one screen) carried to a new window by URL, so
 * it opens with exactly what was on glass, saved or not. A popped window never
 * writes the stored desks: it is window-local and follows its link groups
 * over the shared channel. Symbols/timeframes re-validate on the way in.
 */
export const DESK_WINDOW_PARAM = "window";
export function encodeDeskWindow(desk: Desk, only?: number): string {
  const screens = only !== undefined ? allScreens(desk).slice(only, only + 1) : screensFor(desk);
  const p = new URLSearchParams();
  p.set(DESK_WINDOW_PARAM, only !== undefined ? `screen-${only + 1}` : "desk");
  p.set("layout", String(Math.min(Math.max(screens.length, 1), MAX_SCREENS)));
  p.set("screens", screens.map(s => [s.symbol, s.timeframe, s.link ?? "", s.view ?? ""].join("~")).join(","));
  if (desk.linkTimeframe) p.set("linkTf", "1");
  return p.toString();
}
export function decodeDeskWindow(search: string): { readonly label: string; readonly desk: Desk } | null {
  let p: URLSearchParams;
  try { p = new URLSearchParams(search); } catch { return null; }
  const label = p.get(DESK_WINDOW_PARAM);
  if (!label || !/^(desk|screen-[1-4])$/.test(label)) return null;
  const screens = (p.get("screens") ?? "").split(",").filter(Boolean).slice(0, MAX_SCREENS).map(part => {
    const [symbol, timeframe, link, view] = part.split("~");
    return { symbol, timeframe, link: link ? Number(link) : undefined, view: view || undefined };
  });
  const layout = Number(p.get("layout"));
  const desk = readDesk({ name: label === "desk" ? "Desk window" : `Screen ${label.slice(7)} window`, layout: isDeskLayout(layout) ? layout : 1, screens, linkTimeframe: p.get("linkTf") === "1" });
  return desk ? { label, desk: { ...desk, layout: Math.min(desk.layout, desk.screens.length) as DeskLayout } } : null;
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
