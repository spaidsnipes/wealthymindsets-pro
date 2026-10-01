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
import React, { useEffect, useMemo, useState } from "react";

import { MainChart } from "@/components/chart/MainChart";
import {
  ACTIVE_DESK_STORAGE_KEY,
  DESKS_STORAGE_KEY,
  MORNING_DESK,
  deleteDesk,
  gridFor,
  readDesks,
  renameDesk,
  screensFor,
  setScreen,
  upsertDesk,
  type Desk,
  type DeskLayout,
} from "@/lib/desk/desks";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import { CHART_TF_SHIPPED, TF_IDS } from "@/lib/timeframes";

const GOLD = "#C9A55C";
const MUTED = "#8a8271";
const INK = "#ede6d3";
const LINE = "rgba(201,165,92,.28)";

const btn = (on = false): React.CSSProperties => ({
  minHeight: 28, padding: "0 10px", borderRadius: 3, cursor: "pointer",
  border: `1px solid ${on ? "rgba(201,165,92,.75)" : LINE}`, background: on ? "rgba(201,165,92,.14)" : "transparent",
  color: on ? GOLD : INK, font: "700 10.5px/1 ui-sans-serif, system-ui, sans-serif", letterSpacing: ".08em", textTransform: "uppercase",
});

function ScreenHeader({ index, symbol, timeframe, maximized, onSymbol, onTimeframe, onMaximize }: {
  index: number; symbol: string; timeframe: string; maximized: boolean;
  onSymbol: (s: string) => void; onTimeframe: (t: string) => void; onMaximize: () => void;
}) {
  const [draft, setDraft] = useState(symbol);
  useEffect(() => setDraft(symbol), [symbol]);
  const tfs = useMemo(() => [...new Set([...CHART_TF_SHIPPED, timeframe])].filter(t => (TF_IDS as readonly string[]).includes(t)), [timeframe]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", borderBottom: `1px solid ${LINE}`, background: "rgba(10,9,7,.92)" }}>
      <span style={{ color: MUTED, font: "700 10px/1 ui-sans-serif", letterSpacing: ".1em" }}>SCREEN {index + 1}</span>
      <form onSubmit={e => { e.preventDefault(); onSymbol(draft); }} style={{ display: "flex" }}>
        <input aria-label={`Screen ${index + 1} market`} value={draft} onChange={e => setDraft(e.target.value)} onBlur={() => draft !== symbol && onSymbol(draft)}
          style={{ width: 92, background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: "3px 6px", font: "700 12px/1 ui-monospace, monospace" }} />
      </form>
      <select aria-label={`Screen ${index + 1} timeframe`} value={timeframe} onChange={e => onTimeframe(e.target.value)}
        style={{ background: "#0b0a08", border: `1px solid ${LINE}`, color: INK, padding: "3px 4px" }}>
        {tfs.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <span style={{ flex: 1 }} />
      <Link href={`${INSTRUMENT_VIEW_ROUTE}?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(timeframe)}`} style={{ ...btn(), display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
        Open room
      </Link>
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

  const saved = desks.find(d => d.name === activeName);
  const dirty = !!saved && JSON.stringify(saved) !== JSON.stringify(working);
  const screens = screensFor(working);
  const grid = maximized != null ? gridFor(1) : gridFor(working.layout);
  const shown = maximized != null ? [maximized] : screens.map((_, i) => i);

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
        <span style={{ flex: 1 }} />
        {dirty ? <span style={{ color: GOLD, fontSize: 11 }}>Unsaved changes</span> : null}
        <button type="button" data-testid="desk-save" onClick={save} style={btn(dirty)}>Save</button>
        <button type="button" onClick={saveAs} style={btn()}>Save as…</button>
        <button type="button" onClick={rename} style={btn()}>Rename</button>
        <button type="button" onClick={remove} style={btn()}>Delete</button>
      </div>
      {notice ? <p role="status" style={{ margin: 0, padding: "4px 12px", color: MUTED, fontSize: 11 }}>{notice} Markets are re-read live on every open; a desk saves only layout, markets and timeframes.</p> : null}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: grid.columns, gridTemplateRows: grid.rows, gap: 4, padding: 4 }}>
        {shown.map((i, slot) => {
          const s = screens[i];
          return (
            <section key={`${i}`} data-testid={`desk-screen-${i + 1}`} data-symbol={s.symbol} data-timeframe={s.timeframe} aria-label={`Screen ${i + 1}: ${s.symbol} ${s.timeframe}`}
              style={{ gridArea: grid.areas[slot], minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", border: `1px solid ${LINE}`, borderRadius: 4, overflow: "hidden" }}>
              <ScreenHeader
                index={i} symbol={s.symbol} timeframe={s.timeframe} maximized={maximized === i}
                onSymbol={v => setWorking(w => setScreen(w, i, { symbol: v }))}
                onTimeframe={v => setWorking(w => setScreen(w, i, { timeframe: v }))}
                onMaximize={() => setMaximized(m => (m === i ? null : i))}
              />
              <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
                <MainChart
                  key={`${s.symbol}|${s.timeframe}`}
                  symbol={s.symbol}
                  timeframe={s.timeframe}
                  setTimeframe={(t: string) => setWorking(w => setScreen(w, i, { timeframe: t }))}
                  footprintType="volume-profile"
                  footprintEnabled={false}
                />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
