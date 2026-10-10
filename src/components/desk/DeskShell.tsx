"use client";

/**
 * THE DESK — Garden 18 §XIV–§XVIII. Several trade screens, ONE operating system.
 *
 * Each screen is the SAME MainChart /charts uses, mounted directly (never an
 * iframe): every screen reads the market through the shared module-level
 * lanes — refcounted tapes, the one tastytrade DXLink socket — so two screens
 * on NQ share one stream, not two. A screen owns only its camera: market,
 * timeframe. The desk stores preferences, never market truth.
 */

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MainChart } from "@/components/chart/MainChart";
import { WatchlistPanel } from "@/components/chart/WatchlistPanel";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import {
  ACTIVE_DESK_STORAGE_KEY,
  DESKS_STORAGE_KEY,
  MORNING_DESK,
  deleteDesk,
  gridFor, phoneGridFor, tabletPortraitGridFor, DESK_TOUCH_CSS, DESK_TOUCH_QUERY, DESK_TABLET_PORTRAIT_QUERY,
  readDesks,
  renameDesk,
  DESK_SCREEN_DRAG_TYPE,
  DESK_SYMBOL_DRAG_TYPE,
  screensFor,
  setLinkedSymbol,
  setLinkedTimeframe,
  applyGroupChange,
  decodeDeskWindow,
  encodeDeskWindow,
  linkChipLabel,
  DESK_LINK_INK,
  setScreenView,
  cycleLink,
  swapScreens,
  upsertDesk,
  type Desk,
  type DeskLayout,
  type DeskLink,
} from "@/lib/desk/desks";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import { deskLinkBus } from "@/lib/desk/deskLinkBus";
import { CLEAN_VIEW_ID, chartPropsForView, pendingDeskReadings, compileDeskBarReadings, compileDeskProfileFusion } from "@/lib/desk/deskView";
import { MY_VIEWS_EVENT, SAVED_LAYOUTS_STORAGE_KEY, loadSavedLayouts, screenViews, type SavedLayout } from "@/lib/workspace/savedLayouts";
import { CHART_TF_SHIPPED, TF_IDS } from "@/lib/timeframes";


// The chart already owns these bars and provider subscriptions. This adaptor
// feeds the same pure owners /charts uses, never a second market fetch.
type HairlineHandle = Parameters<NonNullable<React.ComponentProps<typeof MainChart>["onCrosshairHandle"]>>[0];

/** Paint-cost receipt for the linked hairline (read in the browser as proof). */
type HairlineCost = { paints: number; ms: number; maxMs: number };

function DeskMarketScreen({ symbol, timeframe, setTimeframe, view, link, paneId }: {
  symbol: string; timeframe: string; setTimeframe: (tf: string) => void; view?: SavedLayout | null;
  /** DESK LINKING: this screen's link group (undefined = unlinked) and its bus id. */
  link?: DeskLink; paneId: string;
}) {
  // LINKED CROSSHAIR (2026-10-07). The hovered TIME goes out on the link bus;
  // a linked screen draws one 1px DOM hairline at the bar containing that
  // time (nothing when it does not show that time). It never enters the
  // candle paint loop: no React state, no chart redraw — a rAF-coalesced
  // style write, read off the chart's own time scale on demand.
  const handleRef = useRef<HairlineHandle>(null);
  const onCrosshairHandle = useCallback((h: HairlineHandle) => { handleRef.current = h; }, []);
  const linkRef = useRef(link);
  linkRef.current = link;
  const lastSent = useRef<number | null | undefined>(undefined);
  const onCrosshairTime = useCallback((t: number | null) => {
    const g = linkRef.current;
    if (!g || t === lastSent.current) return;
    lastSent.current = t;
    deskLinkBus().publish({ k: "x", group: g, time: t, from: paneId });
  }, [paneId]);
  const lineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = lineRef.current;
    if (!link || !el) return;
    let pending: number | null = null;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const t0 = performance.now();
      const geo = pending != null ? handleRef.current?.hairlineAt(pending) ?? null : null;
      const box = geo ? el.parentElement?.getBoundingClientRect() : null;
      if (!geo || !box) el.style.display = "none";
      else {
        el.style.display = "block";
        el.style.height = `${geo.height}px`;
        el.style.transform = `translate3d(${Math.round(geo.x - box.left)}px, ${Math.round(geo.top - box.top)}px, 0)`;
      }
      const dt = performance.now() - t0;
      const cost: HairlineCost = ((window as unknown as { __wmDeskHairline?: HairlineCost }).__wmDeskHairline ??= { paints: 0, ms: 0, maxMs: 0 });
      cost.paints++; cost.ms += dt; if (dt > cost.maxMs) cost.maxMs = dt;
    };
    const off = deskLinkBus().subscribe(m => {
      if (m.k !== "x" || m.group !== link || m.from === paneId) return;
      pending = m.time;
      if (!raf) raf = requestAnimationFrame(paint);
    });
    return () => { off(); if (raf) cancelAnimationFrame(raf); el.style.display = "none"; };
  }, [link, paneId]);
  type Bars = Parameters<NonNullable<React.ComponentProps<typeof MainChart>["onBarsReady"]>>[0];
  const [bars, setBars] = useState<Bars>([]);
  const onBarsReady = useCallback((next: Bars) => setBars(previous => {
    // Repeated delivery is not new evidence. Preserve memo identity unless an
    // admitted OHLCV value (including an interior revision) actually changes.
    if (previous.length === next.length && previous.every((b, i) => {
      const n = next[i];
      return b.time === n.time && b.open === n.open && b.high === n.high && b.low === n.low && b.close === n.close && b.volume === n.volume;
    })) return previous;
    return next.map(b => ({ ...b }));
  }), []);
  const [drawn, setDrawn] = useState<Parameters<NonNullable<React.ComponentProps<typeof MainChart>["onVpLevels"]>>[0]>({});
  const onVpLevels = useCallback((next: typeof drawn) => setDrawn(next), []);
  const compiled = useMemo(() => compileDeskBarReadings(symbol, bars, timeframe), [symbol, bars, timeframe]);
  const { tpo, weather, ...readings } = compiled;
  const profileFusion = useMemo(() => compileDeskProfileFusion(compiled, view?.switches ?? null, drawn), [compiled, view?.switches, drawn]);
  const pending = pendingDeskReadings(view?.switches ?? null);
  // §LXXXI: the desk reads the SAME session preference /charts does
  // (wm_extHours, default ON). Unset, MainChart fell to RTH and every equity
  // screen went "STALE PIPELINE · 52 BARS BEHIND" after the close while
  // /charts printed the live extended-hours price (serving TSLA, 2026-10-01).
  const extendedHours = useMemo(() => {
    try { const v = localStorage.getItem("wm_extHours"); return v ? JSON.parse(v) !== false : true; } catch { return true; }
  }, []);
  return <>
    <MainChart showEvidenceVault={false} symbol={symbol} timeframe={timeframe} setTimeframe={setTimeframe} extendedHours={extendedHours}
      {...(view !== undefined ? chartPropsForView(view) : { footprintType: "volume-profile" as const, footprintEnabled: false })}
      onBarsReady={onBarsReady} onVpLevels={onVpLevels} onCrosshairTime={onCrosshairTime} onCrosshairHandle={onCrosshairHandle} tpoProfile={tpo} liquidityWeather={weather} profileFusion={profileFusion} {...readings} />
    <div ref={lineRef} aria-hidden data-testid="desk-linked-hairline"
      style={{ position: "absolute", left: 0, top: 0, width: 1, display: "none", pointerEvents: "none", zIndex: 24, background: link ? DESK_LINK_INK[link] : "transparent", opacity: 0.85 }} />
    {pending.length > 0 && <details data-testid="desk-view-unavailable" style={{ position: "absolute", left: 8, top: 48, zIndex: 25, maxWidth: 340, color: "#d8bd7a", background: "#17140e", borderRadius: 6, padding: "5px 8px", fontSize: 10 }}>
      <summary style={{ cursor: "pointer" }}>{pending.length} selected tools unavailable on this Desk screen</summary>
      <p style={{ margin: "6px 0" }}>These preferences are kept. Open the full market chart to use:</p>
      <p style={{ margin: "6px 0", textTransform: "capitalize" }}>{pending.map(id => id.replaceAll("_", " ").toLowerCase()).join(" · ")}</p>
      <Link href={`${INSTRUMENT_VIEW_ROUTE}?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(timeframe)}`} style={{ color: "#ead9ad", textDecoration: "underline" }}>Open full market chart</Link>
    </details>}
  </>;
}

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const INK = "#ede6d3";
const LINE = "rgba(201,165,92,.28)";

const btn = (on = false): React.CSSProperties => ({
  minHeight: 28, padding: "0 10px", borderRadius: 3, cursor: "pointer",
  border: `1px solid ${on ? "rgba(201,165,92,.75)" : LINE}`, background: on ? "rgba(201,165,92,.14)" : "transparent",
  color: on ? GOLD : INK, font: "700 10.5px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".08em", textTransform: "uppercase",
});


function ScreenHeader({ index, symbol, timeframe, maximized, focused, link, onLink, onSymbol, onTimeframe, onMaximize, view, views, onView, onNewWindow, compact = false }: {
  onNewWindow?: () => void;
  /** Touch glass with several screens: the header must fit one row (sheriff sweep 2026-10-07). */
  compact?: boolean;
  focused: boolean;
  link?: DeskLink;
  onLink: () => void;
  view?: string;
  views: readonly { id: string; name: string }[];
  onView: (id: string | undefined) => void;
  index: number; symbol: string; timeframe: string; maximized: boolean;
  onSymbol: (s: string) => void; onTimeframe: (t: string) => void; onMaximize: () => void;
}) {
  const [draft, setDraft] = useState(symbol);
  useEffect(() => setDraft(symbol), [symbol]);
  const tfs = useMemo(() => [...new Set([...CHART_TF_SHIPPED, timeframe])].filter(t => (TF_IDS as readonly string[]).includes(t)), [timeframe]);
  return (
    <div
      className="wm-desk-chrome"
      draggable
      onDragStart={e => { e.dataTransfer.setData(DESK_SCREEN_DRAG_TYPE, String(index)); e.dataTransfer.effectAllowed = "move"; }}
      title="Drag onto another screen to swap"
      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 - (compact ? 2 : 0), padding: "4px 6px", borderBottom: `1px solid ${LINE}`, background: "rgba(10,9,7,.92)", cursor: "grab" }}>
      <span style={{ color: focused ? GOLD : MUTED, font: "700 10px/1 ui-sans-serif", letterSpacing: ".1em" }}>{focused ? "● " : ""}{compact ? "" : "SCREEN "}{index + 1}</span>
      <form onSubmit={e => { e.preventDefault(); onSymbol(draft); }} style={{ display: "flex" }}>
        <input aria-label={`Screen ${index + 1} market`} value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => draft !== symbol && onSymbol(draft)}
          style={{ width: compact ? 72 : 92, background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: "3px 6px", font: "700 12px/1 ui-monospace, monospace" }} />
      </form>
      <select aria-label={`Screen ${index + 1} timeframe`} value={timeframe} onChange={e => onTimeframe(e.target.value)}
        style={{ background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: "3px 4px" }}>
        {tfs.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      {/* §LVI: each screen wears its own View; the market data is shared. */}
      <select aria-label={`Screen ${index + 1} view`} data-testid={`desk-view-${index + 1}`} value={view ?? ""} onChange={e => onView(e.target.value || undefined)}
        style={{ maxWidth: compact ? 96 : 130, background: "#0b0a08", border: `1px solid ${view ? GOLD : LINE}`, color: view ? GOLD : INK, padding: "3px 4px" }}>
        <option value="">Chart defaults</option>
        <option value={CLEAN_VIEW_ID}>Clean</option>
        {views.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      {/* §LV–§LVIII + DESK LINKING (2026-10-07): screens in the same numbered
          group follow one market and share a crosshair. The chip prints its
          number beside its colour — never colour alone. */}
      <button type="button" data-testid={`desk-link-${index + 1}`} data-link={link ?? "NONE"} onClick={onLink}
        aria-label={link ? `Screen ${index + 1} is in link group ${link}. Press to change.` : `Screen ${index + 1} is not linked. Press to link.`}
        title="Link group: screens in the same group follow one market and share a crosshair (press to cycle 1 → 2 → 3 → 4 → unlinked)"
        style={{ ...btn(!!link), color: link ? DESK_LINK_INK[link] : MUTED, borderColor: link ? DESK_LINK_INK[link] : LINE, minWidth: 44, textTransform: "none" }}>
        {compact && !link ? "Link" : <>{linkChipLabel(link)}</>}
      </button>
      <span style={{ flex: 1 }} />
      <Link href={`${INSTRUMENT_VIEW_ROUTE}?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(timeframe)}`} style={{ ...btn(), display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
        {compact ? "Room" : "Open room"}
      </Link>
      {/* §LV + DESK LINKING: a second monitor — this screen in its own Desk
          window that STAYS in its link group (BroadcastChannel), named per
          screen so a second press brings the same window forward. */}
      {onNewWindow ? (
        <button type="button" className="wm-desk-new-window" data-testid={`desk-window-${index + 1}`} title="Open this screen in a new window that stays linked (drag it to another monitor)"
          onClick={onNewWindow}
          style={btn()}>
          {compact ? "Window" : "New window"}
        </button>
      ) : null}
      <button type="button" onClick={onMaximize} aria-pressed={maximized} style={btn(maximized)} aria-label={maximized ? `Restore screen ${index + 1}` : `Maximize screen ${index + 1}`}>{maximized ? "Restore" : compact ? "Max" : "Maximize"}</button>
    </div>
  );
}

/**
 * PHONE DESK MENU (Garden 19 §22, Founder ruling 2026-10-07): on a phone the
 * four desk actions fold into one "Desk ⋯" menu so the chart gets the room.
 * 44px targets; arrow keys move, Escape closes and returns focus.
 */
function DeskMenu({ dirty, items }: { dirty: boolean; items: readonly (readonly [string, () => void])[] }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    const away = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node) && !trigger.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  return (
    <span style={{ position: "relative" }}>
      <button ref={trigger} type="button" data-testid="desk-menu" aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen(v => !v)} style={{ ...btn(open || dirty), textTransform: "none" }}>
        Desk ⋯{dirty ? " •" : ""}
      </button>
      {open ? (
        <div ref={menu} role="menu" aria-label="Desk actions" data-testid="desk-menu-list"
          onKeyDown={e => {
            const list = [...(menu.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
            const at = list.indexOf(document.activeElement as HTMLButtonElement);
            if (e.key === "Escape") { e.preventDefault(); close(); }
            else if (e.key === "ArrowDown") { e.preventDefault(); list[(at + 1) % list.length]?.focus(); }
            else if (e.key === "ArrowUp") { e.preventDefault(); list[(at - 1 + list.length) % list.length]?.focus(); }
          }}
          style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 60, display: "flex", flexDirection: "column", minWidth: 180, background: "#0b0a08", border: `1px solid ${LINE}`, borderRadius: 6, padding: 4, boxShadow: "0 8px 24px rgba(0,0,0,.6)" }}>
          {items.map(([label, run]) => (
            <button key={label} type="button" role="menuitem" data-testid={label === "Save" ? "desk-save" : undefined}
              onClick={() => { setOpen(false); run(); }}
              style={{ ...btn(label === "Save" && dirty), minHeight: 44, textAlign: "left", border: "none" }}>
              {label}{label === "Save" && dirty ? " (unsaved changes)" : ""}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}

export function DeskShell() {
  const [desks, setDesks] = useState<readonly Desk[]>([MORNING_DESK]);
  const [activeName, setActiveName] = useState(MORNING_DESK.name);
  const [working, setWorking] = useState<Desk>(MORNING_DESK);
  const [maximized, setMaximized] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // The screen a Watchlist tap loads into (§XIV): click a screen to focus it.
  const [focused, setFocused] = useState(0);
  // §LVI: the trader's saved Views, offered per screen (read from their one owner).
  const [savedViews, setSavedViews] = useState<readonly SavedLayout[]>([]);
  useEffect(() => {
    // Drive §B1–2 (2026-10-07): the starter Views (as edited) are offered too.
    const load = () => { try { setSavedViews(screenViews(loadSavedLayouts(window.localStorage))); } catch { setSavedViews([]); } };
    load();
    const onStorage = (e: StorageEvent) => { if (e.key === SAVED_LAYOUTS_STORAGE_KEY) load(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(MY_VIEWS_EVENT, load);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(MY_VIEWS_EVENT, load); };
  }, []);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  // SECOND WINDOW: a popped desk/screen ("desk" | "screen-N"), window-local —
  // it never writes the stored desks and follows its link groups over the bus.
  const [popout, setPopout] = useState<string | null>(null);
  const [crossWindow, setCrossWindow] = useState(true);
  // DESK LINKING (2026-10-07): ONE owner of the working desk. Every market or
  // timeframe change goes through here so linked screens move together and a
  // linked group's change is announced to this desk's other windows.
  const workingRef = useRef(working);
  workingRef.current = working;
  const announce = useCallback((next: Desk, index: number, patch: { symbol?: string; timeframe?: string }) => {
    const sc = next.screens[index];
    if (!sc?.link) return;
    const bus = deskLinkBus();
    bus.publish({ k: "sym", group: sc.link, ...(patch.symbol !== undefined ? { symbol: sc.symbol } : {}), ...(patch.timeframe !== undefined ? { timeframe: sc.timeframe } : {}), from: `${bus.windowId}:${index}` });
  }, []);
  const changeSymbol = useCallback((index: number, symbol: string) => {
    const cur = workingRef.current;
    const next = setLinkedSymbol(cur, index, symbol);
    if (next === cur) return;
    workingRef.current = next;
    setWorking(next);
    announce(next, index, { symbol });
  }, [announce]);
  const changeTimeframe = useCallback((index: number, timeframe: string) => {
    const cur = workingRef.current;
    const next = setLinkedTimeframe(cur, index, timeframe);
    if (next === cur) return;
    workingRef.current = next;
    setWorking(next);
    if (next.linkTimeframe) announce(next, index, { timeframe });
  }, [announce]);
  // Another window moved a link group: every screen here in that group follows
  // (and never re-announces it — no echo).
  useEffect(() => {
    const bus = deskLinkBus();
    setCrossWindow(bus.crossWindow);
    return bus.subscribe((m, remote) => {
      if (!remote || m.k !== "sym") return;
      setWorking(w => applyGroupChange(w, m.group, { symbol: m.symbol, timeframe: m.timeframe }));
    });
  }, []);
  const paneIdFor = (i: number) => `${typeof window === "undefined" ? "ssr" : deskLinkBus().windowId}:${i}`;
  const openWindow = (only?: number) => {
    const q = encodeDeskWindow(workingRef.current, only);
    window.open(`/desk?${q}`, only !== undefined ? `wm-desk-screen-${only + 1}` : "wm-desk-window", "popup,width=1280,height=820");
  };
  // A Watchlist tap moves the room's active symbol; on the desk that lands in
  // the focused screen. The value present at mount is ignored — it is the
  // last market of another room, not a choice made here.
  const { activeSymbol } = useActiveSymbol();
  const seenSymbol = React.useRef<string | null>(null);
  useEffect(() => {
    if (seenSymbol.current === null) { seenSymbol.current = activeSymbol; return; }
    if (activeSymbol === seenSymbol.current) return;
    seenSymbol.current = activeSymbol;
    changeSymbol(focused, activeSymbol);
  }, [activeSymbol, focused, changeSymbol]);

  // Restore PREFERENCES; every screen re-asks the market for truth on mount.
  useEffect(() => {
    const pop = decodeDeskWindow(window.location.search);
    if (pop) {
      setPopout(pop.label);
      setDesks([pop.desk]);
      setActiveName(pop.desk.name);
      setWorking(pop.desk);
      setHydrated(true);
      return;
    }
    let stored: readonly Desk[] = [MORNING_DESK];
    let active = MORNING_DESK.name;
    try { stored = readDesks(localStorage.getItem(DESKS_STORAGE_KEY)); } catch { /* private mode */ }
    try { active = localStorage.getItem(ACTIVE_DESK_STORAGE_KEY) || stored[0].name; } catch { /* private mode */ }
    const desk = stored.find(d => d.name === active) ?? stored[0];
    setDesks(stored);
    setActiveName(desk.name);
    setWorking(desk);
    setHydrated(true);
  }, []);

  const persist = (next: readonly Desk[], active: string) => {
    if (popout) return; // a popped window never writes the stored desks
    setDesks(next);
    setActiveName(active);
    try { localStorage.setItem(DESKS_STORAGE_KEY, JSON.stringify(next)); localStorage.setItem(ACTIVE_DESK_STORAGE_KEY, active); } catch { /* private mode */ }
  };

  const [phone, setPhone] = useState(false);
  useEffect(() => {
    let mq: MediaQueryList | null = null;
    try { mq = window.matchMedia("(max-width: 639px)"); } catch { return; }
    const on = () => setPhone(!!mq?.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq?.removeEventListener?.("change", on);
  }, []);
  // Garden 19 §22 — the Desk as a touch station. A portrait tablet stacks two
  // screens per view; touch (or any glass under 1200 wide) gets 44px chrome.
  const [tabletPortrait, setTabletPortrait] = useState(false);
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const pairs: [string, (v: boolean) => void][] = [[DESK_TABLET_PORTRAIT_QUERY, setTabletPortrait], [DESK_TOUCH_QUERY, setTouch]];
    const offs: (() => void)[] = [];
    for (const [q, set] of pairs) {
      let mq: MediaQueryList;
      try { mq = window.matchMedia(q); } catch { continue; }
      const on = () => set(mq.matches);
      on();
      mq.addEventListener?.("change", on);
      offs.push(() => mq.removeEventListener?.("change", on));
    }
    return () => offs.forEach(f => f());
  }, []);

  const saved = desks.find(d => d.name === activeName);
  const dirty = !!saved && JSON.stringify(saved) !== JSON.stringify(working);
  const screens = screensFor(working);
  // Phone (§22): ONE focused screen at a time, chosen from the switcher strip —
  // a second chart on a 390px phone is a chart nobody can read (and a feed
  // nobody is watching).
  const shown = maximized != null ? [maximized] : phone ? [Math.min(focused, screens.length - 1)] : screens.map((_, i) => i);
  const grid = phone ? phoneGridFor(shown.length) : maximized != null ? gridFor(1) : tabletPortrait ? tabletPortraitGridFor(shown.length) : gridFor(working.layout);
  const compactHeaders = Boolean(touch) && !phone && maximized == null && shown.length > 1;

  const open = (name: string) => {
    const d = desks.find(x => x.name === name);
    if (!d) return;
    setWorking(d); setActiveName(d.name); setMaximized(null);
    try { localStorage.setItem(ACTIVE_DESK_STORAGE_KEY, d.name); } catch { /* private mode */ }
  };
  const save = () => { persist(upsertDesk(desks, working), working.name); setNotice(`Saved ${working.name}.`); };
  // IN-ROOM ASKS (2026-10-04): Save as / Rename / Delete used the browser's
  // own prompt() and confirm() — grey system boxes that freeze the page and,
  // on a phone, sit outside the room entirely. Now a sheet in the Desk's ink.
  const [ask, setAsk] = useState<null | { kind: "saveAs" | "rename" | "delete"; value: string }>(null);
  const saveAs = () => setAsk({ kind: "saveAs", value: `${working.name} copy` });
  const rename = () => setAsk({ kind: "rename", value: working.name });
  const remove = () => setAsk({ kind: "delete", value: "" });
  const commitAsk = () => {
    if (!ask) return;
    const name = ask.value.trim();
    if (ask.kind === "saveAs") {
      if (!name) return;
      const desk = { ...working, name };
      setWorking(desk);
      persist(upsertDesk(desks, desk), name);
      setNotice(`Saved ${name}.`);
    } else if (ask.kind === "rename") {
      if (!name || name === working.name) { setAsk(null); return; }
      const next = renameDesk(desks, working.name, name);
      if (!next) { setNotice(`A desk named ${name} already exists.`); return; }
      setWorking({ ...working, name });
      persist(next, name);
    } else {
      const next = deleteDesk(desks, working.name);
      persist(next, next[0].name);
      setWorking(next[0]);
    }
    setAsk(null);
  };

  // THE DESK FILLS ITS ROOM, NOT THE VIEWPORT (2026-10-10). It was
  // calc(100vh - 64px): at 390x844 the desk ran y 45–825 while its room ended
  // at 786, where the bottom nav starts, so the chart's "⇕" scale control
  // (785–813) sat under the nav and the assistant's launcher took its taps. It
  // overran at 834 (1048 vs 1010) and 1440 (836 vs 804) too. 100% of the room
  // surface: measured 741 / 1010 / 804, nothing under the nav.
  return (
    <div data-testid="desk" data-desk-layout={working.layout} data-hydrated={hydrated} data-touch={touch} data-desk-form={phone ? "PHONE" : tabletPortrait ? "TABLET_PORTRAIT" : "GRID"} style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "#07060a", color: INK }}>
      {touch ? <style>{DESK_TOUCH_CSS}</style> : null}
      <div className="wm-desk-chrome" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${LINE}` }}>
        <Link href={INSTRUMENT_VIEW_ROUTE} style={{ ...btn(), display: "inline-flex", alignItems: "center", textDecoration: "none" }}>← Charts</Link>
        <strong style={{ color: GOLD, letterSpacing: ".12em", textTransform: "uppercase", fontSize: 12 }}>Desk</strong>
        {popout ? (
          <span data-testid="desk-popout" data-cross-window={crossWindow} style={{ color: crossWindow ? INK : GOLD, fontSize: 11 }}>
            {crossWindow ? "Linked window — follows its link groups; changes here are not saved" : "This browser cannot link windows — this window works alone"}
          </span>
        ) : (
          <select aria-label="Desk" value={activeName} onChange={e => open(e.target.value)} style={{ background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: "4px 6px" }}>
            {desks.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
        )}
        {/* Sheriff sweep 2026-10-07, 390×640: the layout row (five buttons) and
            Link timeframe took two wrapped rows above the screen and left the
            chart ~130px. On a phone the layout is ONE select — same state,
            same action — and Link timeframe stays a button. */}
        {phone ? (
          <select aria-label="Desk layout" value={working.layout}
            onChange={e => { setWorking({ ...working, layout: Number(e.target.value) as DeskLayout }); setMaximized(null); }}
            style={{ minHeight: 44, background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: "4px 6px" }}>
            {([1, 2, 3, 4] as DeskLayout[]).map(n => <option key={n} value={n}>{n === 1 ? "1 screen" : `${n}-up`}</option>)}
          </select>
        ) : null}
        {phone ? null : <>
        <span style={{ color: MUTED, fontSize: 11 }}>Layout</span>
        {([1, 2, 3, 4] as DeskLayout[]).map(n => (
          <button key={n} type="button" aria-pressed={working.layout === n} onClick={() => { setWorking({ ...working, layout: n }); setMaximized(null); }} style={btn(working.layout === n)}>
            {n === 1 ? "1 screen" : `${n}-up`}
          </button>
        ))}
        <button type="button" aria-pressed={watchlistOpen} onClick={() => setWatchlistOpen(v => !v)} style={btn(watchlistOpen)}>Watchlist</button>
        <button type="button" data-testid="desk-link-timeframe" aria-pressed={!!working.linkTimeframe}
          title="When on, screens in the same link group also share a timeframe"
          onClick={() => setWorking(w => { const { linkTimeframe: _t, ...rest } = w; void _t; return w.linkTimeframe ? rest : { ...rest, linkTimeframe: true }; })}
          style={btn(!!working.linkTimeframe)}>Link timeframe</button>
        </>}
        {phone ? (
          <button type="button" data-testid="desk-link-timeframe" aria-pressed={!!working.linkTimeframe}
            title="When on, screens in the same link group also share a timeframe"
            onClick={() => setWorking(w => { const { linkTimeframe: _t, ...rest } = w; void _t; return w.linkTimeframe ? rest : { ...rest, linkTimeframe: true }; })}
            style={btn(!!working.linkTimeframe)}>Link TF</button>
        ) : null}
        {!popout ? (
          <button type="button" className="wm-desk-new-window" data-testid="desk-window" title="Open this whole desk in a new window that stays linked" onClick={() => openWindow()} style={btn()}>Desk in new window</button>
        ) : null}
        {phone ? null : <span style={{ color: MUTED, fontSize: 11 }}>Tap or drag a market into a screen · drag a screen&apos;s header onto another to swap</span>}
        <span style={{ flex: 1 }} />
        {popout ? null : <>
        {dirty && !phone ? <span style={{ color: GOLD, fontSize: 11 }}>Unsaved changes</span> : null}
        {!crossWindow ? <span style={{ color: MUTED, fontSize: 11 }}>New windows here cannot stay linked</span> : null}
        {phone ? (
          <DeskMenu dirty={dirty} items={[["Save", save], ["Save as…", saveAs], ["Rename", rename], ["Delete", remove]]} />
        ) : <>
        <button type="button" data-testid="desk-save" onClick={save} style={btn(dirty)}>Save</button>
        <button type="button" onClick={saveAs} style={btn()}>Save as…</button>
        <button type="button" onClick={rename} style={btn()}>Rename</button>
        <button type="button" onClick={remove} style={btn()}>Delete</button>
        </>}
        </>}
      </div>
      {ask ? (
        <div role="dialog" aria-label={ask.kind === "delete" ? "Delete desk" : ask.kind === "rename" ? "Rename desk" : "Save desk as"} data-testid="desk-ask"
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${LINE}`, background: "#0b0a08" }}>
          {ask.kind === "delete" ? (
            <span style={{ fontSize: 12, color: INK }}>Delete <strong style={{ color: GOLD }}>{working.name}</strong>? Only this saved layout goes — the markets are not affected.</span>
          ) : (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: MUTED }}>
              {ask.kind === "rename" ? "Rename desk" : "Name this desk"}
              <input autoFocus value={ask.value} maxLength={60}
                onChange={e => setAsk({ ...ask, value: e.target.value })}
                onKeyDown={e => { if (e.key === "Enter") commitAsk(); if (e.key === "Escape") setAsk(null); }}
                style={{ minHeight: 36, minWidth: 200, background: "#07060a", border: `1px solid ${LINE}`, color: INK, padding: "4px 8px", borderRadius: 6 }} />
            </label>
          )}
          <button type="button" onClick={commitAsk} style={btn(true)}>{ask.kind === "delete" ? "Delete" : "Save"}</button>
          <button type="button" onClick={() => setAsk(null)} style={btn()}>Cancel</button>
        </div>
      ) : null}
      {notice ? <p role="status" style={{ margin: 0, padding: "4px 12px", color: MUTED, fontSize: 11 }}>{notice} Markets are re-read live on every open; a desk saves only layout, markets and timeframes.</p> : null}
      {phone && maximized == null && screens.length > 1 ? (
        <nav className="wm-desk-chrome" aria-label="Desk screens" data-testid="desk-switcher"
          style={{ display: "flex", gap: 4, padding: "4px 6px", overflowX: "auto", borderBottom: `1px solid ${LINE}` }}>
          {screens.map((sc, j) => (
            <button key={j} type="button" aria-pressed={focused === j} data-testid={`desk-switch-${j + 1}`} onClick={() => setFocused(j)}
              aria-label={`Show screen ${j + 1}: ${sc.symbol} ${sc.timeframe}${sc.link ? `, link group ${sc.link}` : ""}`}
              style={{ ...btn(focused === j), flexShrink: 0, textTransform: "none" }}>
              {j + 1} · {sc.symbol}{sc.link ? <span style={{ color: DESK_LINK_INK[sc.link], marginLeft: 4 }}>{linkChipLabel(sc.link)}</span> : null}
            </button>
          ))}
        </nav>
      ) : null}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      {watchlistOpen ? (
        <aside data-testid="desk-watchlist" aria-label="Watchlist" style={{ width: phone ? "100%" : 280, flexShrink: 0, borderRight: `1px solid ${LINE}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <WatchlistPanel open onToggle={() => setWatchlistOpen(false)} variant="sheet"
            sendTo={{ labels: screens.map((sc, j) => `Screen ${j + 1} · ${sc.symbol}`), onSend: (sym, j) => { changeSymbol(j, sym); setFocused(j); if (phone) setWatchlistOpen(false); } }} />
        </aside>
      ) : null}
      <div data-desk-phone={phone ? "STACKED" : undefined} style={{ flex: 1, minWidth: 0, minHeight: 0, display: phone && watchlistOpen ? "none" : "grid", gridTemplateColumns: grid.columns, gridTemplateRows: grid.rows, gap: 4, padding: 4, overflowY: phone || tabletPortrait ? "auto" : undefined }}>
        {shown.map((i, slot) => {
          const s = screens[i];
          return (
            <section key={`${i}`} data-testid={`desk-screen-${i + 1}`} data-symbol={s.symbol} data-timeframe={s.timeframe} data-focused={focused === i} aria-label={`Screen ${i + 1}: ${s.symbol} ${s.timeframe}`}
              onMouseDownCapture={() => setFocused(i)}
              onDragOver={e => {
                const types = [...e.dataTransfer.types];
                if (types.includes(DESK_SYMBOL_DRAG_TYPE) || types.includes(DESK_SCREEN_DRAG_TYPE)) { e.preventDefault(); setDropTarget(i); }
              }}
              onDragLeave={() => setDropTarget(t => (t === i ? null : t))}
              onDrop={e => {
                e.preventDefault();
                setDropTarget(null);
                const sym = e.dataTransfer.getData(DESK_SYMBOL_DRAG_TYPE);
                const from = e.dataTransfer.getData(DESK_SCREEN_DRAG_TYPE);
                if (sym) { changeSymbol(i, sym); setFocused(i); }
                else if (from !== "") setWorking(w => swapScreens(w, Number(from), i));
              }}
              style={{ gridArea: grid.areas[slot], minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", borderRadius: 4, overflow: "hidden",
                border: `1px solid ${dropTarget === i ? "rgba(127,209,168,.9)" : focused === i ? "rgba(201,165,92,.75)" : LINE}` }}>
              <ScreenHeader
                // At 1180×820 (touch glass) each 4-up header wrapped to two 44px
                // rows and left the chart ~170px; compact words keep it to one.
                compact={compactHeaders}
                index={i} symbol={s.symbol} timeframe={s.timeframe} maximized={maximized === i} focused={focused === i}
                link={s.link}
                onLink={() => setWorking(w => cycleLink(w, i))}
                view={s.view}
                views={savedViews}
                onView={id => setWorking(w => setScreenView(w, i, id))}
                onSymbol={v => changeSymbol(i, v)}
                onTimeframe={v => changeTimeframe(i, v)}
                onNewWindow={popout ? undefined : () => openWindow(i)}
                onMaximize={() => setMaximized(m => (m === i ? null : i))}
              />
              {/* MainChart's root is `flex: 1` — it fills a flex column, as /charts hosts it. */}
              <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", flexDirection: "column" }}>
                <DeskMarketScreen
                  key={`${s.symbol}|${s.timeframe}`}
                  symbol={s.symbol}
                  timeframe={s.timeframe}
                  setTimeframe={(t: string) => changeTimeframe(i, t)}
                  link={s.link}
                  paneId={paneIdFor(i)}
                  view={s.view ? s.view === CLEAN_VIEW_ID ? null : savedViews.find(v => v.id === s.view) ?? null : undefined}
                />
              </div>
            </section>
          );
        })}
      </div>
      </div>
    </div>
  );
}
