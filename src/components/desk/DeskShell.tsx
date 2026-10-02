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
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { MainChart } from "@/components/chart/MainChart";
import { WatchlistPanel } from "@/components/chart/WatchlistPanel";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import {
  ACTIVE_DESK_STORAGE_KEY,
  DESKS_STORAGE_KEY,
  MORNING_DESK,
  deleteDesk,
  gridFor, phoneGridFor,
  readDesks,
  renameDesk,
  DESK_SCREEN_DRAG_TYPE,
  DESK_SYMBOL_DRAG_TYPE,
  screensFor,
  setScreen,
  setLinkedSymbol,
  setScreenView,
  cycleLink,
  swapScreens,
  upsertDesk,
  type Desk,
  type DeskLayout,
  type DeskLink,
} from "@/lib/desk/desks";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import { CLEAN_VIEW_ID, chartPropsForView, pendingDeskReadings, compileDeskBarReadings, compileDeskProfileFusion } from "@/lib/desk/deskView";
import { SAVED_LAYOUTS_STORAGE_KEY, loadSavedLayouts, type SavedLayout } from "@/lib/workspace/savedLayouts";
import { CHART_TF_SHIPPED, TF_IDS } from "@/lib/timeframes";


// The chart already owns these bars and provider subscriptions. This adaptor
// feeds the same pure owners /charts uses, never a second market fetch.
function DeskMarketScreen({ symbol, timeframe, setTimeframe, view }: {
  symbol: string; timeframe: string; setTimeframe: (tf: string) => void; view?: SavedLayout | null;
}) {
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
    <MainChart symbol={symbol} timeframe={timeframe} setTimeframe={setTimeframe} extendedHours={extendedHours}
      {...(view !== undefined ? chartPropsForView(view) : { footprintType: "volume-profile" as const, footprintEnabled: false })}
      onBarsReady={onBarsReady} onVpLevels={onVpLevels} tpoProfile={tpo} liquidityWeather={weather} profileFusion={profileFusion} {...readings} />
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

const LINK_INK: Readonly<Record<DeskLink, string>> = { A: "#C9A55C", B: "#7fd1a8" };

function ScreenHeader({ index, symbol, timeframe, maximized, focused, link, onLink, onSymbol, onTimeframe, onMaximize, view, views, onView }: {
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
      draggable
      onDragStart={e => { e.dataTransfer.setData(DESK_SCREEN_DRAG_TYPE, String(index)); e.dataTransfer.effectAllowed = "move"; }}
      title="Drag onto another screen to swap"
      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, padding: "4px 6px", borderBottom: `1px solid ${LINE}`, background: "rgba(10,9,7,.92)", cursor: "grab" }}>
      <span style={{ color: focused ? GOLD : MUTED, font: "700 10px/1 ui-sans-serif", letterSpacing: ".1em" }}>{focused ? "● " : ""}SCREEN {index + 1}</span>
      <form onSubmit={e => { e.preventDefault(); onSymbol(draft); }} style={{ display: "flex" }}>
        <input aria-label={`Screen ${index + 1} market`} value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => draft !== symbol && onSymbol(draft)}
          style={{ width: 92, background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: "3px 6px", font: "700 12px/1 ui-monospace, monospace" }} />
      </form>
      <select aria-label={`Screen ${index + 1} timeframe`} value={timeframe} onChange={e => onTimeframe(e.target.value)}
        style={{ background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: "3px 4px" }}>
        {tfs.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      {/* §LVI: each screen wears its own View; the market data is shared. */}
      <select aria-label={`Screen ${index + 1} view`} data-testid={`desk-view-${index + 1}`} value={view ?? ""} onChange={e => onView(e.target.value || undefined)}
        style={{ maxWidth: 130, background: "#0b0a08", border: `1px solid ${view ? GOLD : LINE}`, color: view ? GOLD : INK, padding: "3px 4px" }}>
        <option value="">Chart defaults</option>
        <option value={CLEAN_VIEW_ID}>Clean</option>
        {views.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      {/* §LV–§LVIII: screens in the same link group follow one market. */}
      <button type="button" data-testid={`desk-link-${index + 1}`} data-link={link ?? "NONE"} onClick={onLink}
        aria-label={link ? `Screen ${index + 1} is in link ${link}. Press to change.` : `Screen ${index + 1} is not linked. Press to link.`}
        title="Link: screens in the same group follow one market (timeframes stay their own)"
        style={{ ...btn(!!link), color: link ? LINK_INK[link] : MUTED, borderColor: link ? LINK_INK[link] : LINE, minWidth: 30 }}>
        {link ? `⛓ ${link}` : "⛓"}
      </button>
      <span style={{ flex: 1 }} />
      <Link href={`${INSTRUMENT_VIEW_ROUTE}?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(timeframe)}`} style={{ ...btn(), display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
        Open room
      </Link>
      {/* §LV: a second monitor — this screen's market and timeframe in its own
          window (a full /charts room), named per screen so a second press
          brings the same window forward instead of opening another. */}
      <button type="button" data-testid={`desk-window-${index + 1}`} title="Open this market in a new window (drag it to another monitor)"
        onClick={() => window.open(`${INSTRUMENT_VIEW_ROUTE}?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(timeframe)}`, `wm-screen-${index + 1}`, "popup,width=1280,height=820")}
        style={btn()}>
        New window
      </button>
      <button type="button" onClick={onMaximize} aria-pressed={maximized} style={btn(maximized)}>{maximized ? "Restore" : "Maximize"}</button>
    </div>
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
    const load = () => { try { setSavedViews(loadSavedLayouts(window.localStorage)); } catch { setSavedViews([]); } };
    load();
    const onStorage = (e: StorageEvent) => { if (e.key === SAVED_LAYOUTS_STORAGE_KEY) load(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  // A Watchlist tap moves the room's active symbol; on the desk that lands in
  // the focused screen. The value present at mount is ignored — it is the
  // last market of another room, not a choice made here.
  const { activeSymbol } = useActiveSymbol();
  const seenSymbol = React.useRef<string | null>(null);
  useEffect(() => {
    if (seenSymbol.current === null) { seenSymbol.current = activeSymbol; return; }
    if (activeSymbol === seenSymbol.current) return;
    seenSymbol.current = activeSymbol;
    setWorking(w => setLinkedSymbol(w, focused, activeSymbol));
  }, [activeSymbol, focused]);

  // Restore PREFERENCES; every screen re-asks the market for truth on mount.
  useEffect(() => {
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

  const saved = desks.find(d => d.name === activeName);
  const dirty = !!saved && JSON.stringify(saved) !== JSON.stringify(working);
  const screens = screensFor(working);
  const shown = maximized != null ? [maximized] : screens.map((_, i) => i);
  const grid = phone ? phoneGridFor(shown.length) : maximized != null ? gridFor(1) : gridFor(working.layout);

  const open = (name: string) => {
    const d = desks.find(x => x.name === name);
    if (!d) return;
    setWorking(d); setActiveName(d.name); setMaximized(null);
    try { localStorage.setItem(ACTIVE_DESK_STORAGE_KEY, d.name); } catch { /* private mode */ }
  };
  const save = () => { persist(upsertDesk(desks, working), working.name); setNotice(`Saved ${working.name}.`); };
  const saveAs = () => {
    const name = window.prompt("Name this desk", `${working.name} copy`)?.trim();
    if (!name) return;
    const desk = { ...working, name };
    setWorking(desk);
    persist(upsertDesk(desks, desk), name);
    setNotice(`Saved ${name}.`);
  };
  const rename = () => {
    const name = window.prompt("Rename desk", working.name)?.trim();
    if (!name || name === working.name) return;
    const next = renameDesk(desks, working.name, name);
    if (!next) { setNotice(`A desk named ${name} already exists.`); return; }
    setWorking({ ...working, name });
    persist(next, name);
  };
  const remove = () => {
    if (!window.confirm(`Delete ${working.name}? The markets are not affected — only this saved layout.`)) return;
    const next = deleteDesk(desks, working.name);
    persist(next, next[0].name);
    setWorking(next[0]);
  };

  return (
    <div data-testid="desk" data-desk-layout={working.layout} data-hydrated={hydrated} style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", background: "#07060a", color: INK }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${LINE}` }}>
        <Link href={INSTRUMENT_VIEW_ROUTE} style={{ ...btn(), display: "inline-flex", alignItems: "center", textDecoration: "none" }}>← Charts</Link>
        <strong style={{ color: GOLD, letterSpacing: ".12em", textTransform: "uppercase", fontSize: 12 }}>Desk</strong>
        <select aria-label="Desk" value={activeName} onChange={e => open(e.target.value)} style={{ background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: "4px 6px" }}>
          {desks.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
        <span style={{ color: MUTED, fontSize: 11 }}>Layout</span>
        {([1, 2, 3, 4] as DeskLayout[]).map(n => (
          <button key={n} type="button" aria-pressed={working.layout === n} onClick={() => { setWorking({ ...working, layout: n }); setMaximized(null); }} style={btn(working.layout === n)}>
            {n === 1 ? "1 screen" : `${n}-up`}
          </button>
        ))}
        <button type="button" aria-pressed={watchlistOpen} onClick={() => setWatchlistOpen(v => !v)} style={btn(watchlistOpen)}>Watchlist</button>
        <span style={{ color: MUTED, fontSize: 11 }}>Tap or drag a market into a screen · drag a screen&apos;s header onto another to swap</span>
        <span style={{ flex: 1 }} />
        {dirty ? <span style={{ color: GOLD, fontSize: 11 }}>Unsaved changes</span> : null}
        <button type="button" data-testid="desk-save" onClick={save} style={btn(dirty)}>Save</button>
        <button type="button" onClick={saveAs} style={btn()}>Save as…</button>
        <button type="button" onClick={rename} style={btn()}>Rename</button>
        <button type="button" onClick={remove} style={btn()}>Delete</button>
      </div>
      {notice ? <p role="status" style={{ margin: 0, padding: "4px 12px", color: MUTED, fontSize: 11 }}>{notice} Markets are re-read live on every open; a desk saves only layout, markets and timeframes.</p> : null}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      {watchlistOpen ? (
        <aside data-testid="desk-watchlist" aria-label="Watchlist" style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${LINE}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <WatchlistPanel open onToggle={() => setWatchlistOpen(false)} variant="sheet" />
        </aside>
      ) : null}
      <div data-desk-phone={phone ? "STACKED" : undefined} style={{ flex: 1, minWidth: 0, minHeight: 0, display: "grid", gridTemplateColumns: grid.columns, gridTemplateRows: grid.rows, gap: 4, padding: 4, overflowY: phone ? "auto" : undefined }}>
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
                if (sym) { setWorking(w => setLinkedSymbol(w, i, sym)); setFocused(i); }
                else if (from !== "") setWorking(w => swapScreens(w, Number(from), i));
              }}
              style={{ gridArea: grid.areas[slot], minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", borderRadius: 4, overflow: "hidden",
                border: `1px solid ${dropTarget === i ? "rgba(127,209,168,.9)" : focused === i ? "rgba(201,165,92,.75)" : LINE}` }}>
              <ScreenHeader
                index={i} symbol={s.symbol} timeframe={s.timeframe} maximized={maximized === i} focused={focused === i}
                link={s.link}
                onLink={() => setWorking(w => cycleLink(w, i))}
                view={s.view}
                views={savedViews}
                onView={id => setWorking(w => setScreenView(w, i, id))}
                onSymbol={v => setWorking(w => setLinkedSymbol(w, i, v))}
                onTimeframe={v => setWorking(w => setScreen(w, i, { timeframe: v }))}
                onMaximize={() => setMaximized(m => (m === i ? null : i))}
              />
              {/* MainChart's root is `flex: 1` — it fills a flex column, as /charts hosts it. */}
              <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", flexDirection: "column" }}>
                <DeskMarketScreen
                  key={`${s.symbol}|${s.timeframe}`}
                  symbol={s.symbol}
                  timeframe={s.timeframe}
                  setTimeframe={(t: string) => setWorking(w => setScreen(w, i, { timeframe: t }))}
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
