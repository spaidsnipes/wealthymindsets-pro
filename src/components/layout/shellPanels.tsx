"use client";

import { WM, WM_PRIMARY_ACTION } from "@/lib/design/wmTokens";
import { PRICE_ALERT_TRUTH } from "@/components/chart/AlertsPanel";
import toast from "react-hot-toast";

/**
 * THE SHELL'S PANELS — search, notifications, settings — and the sign-out it
 * offers alongside them.
 *
 * ── WHY THEY LEFT MainLayout ────────────────────────────────────────────────
 *
 * They were declared inside `MainLayout.tsx`, which meant only the branch of
 * that file which draws the July shell could mount them. Measured from source:
 * `MainLayout` returns `WMExperienceShell` for the seven OS-framed rooms and the
 * July `wm-universe` markup for everything else, and ONLY the July branch had a
 * Search button, a Notifications button, a Settings button and a sign-out menu.
 *
 * So a trader standing in /command-deck — the room the product opens on — could
 * not search for a symbol, could not reach their settings, and COULD NOT SIGN
 * OUT, without first navigating to some other room that happened to still wear
 * the old shell. That is not a styling difference between two shells. It is one
 * shell holding capabilities the other one needs, and a file-private function is
 * what held them there.
 *
 * Nothing here changed on the way out. This is an EXTRACTION, not a rewrite: the
 * same panels, the same focus management, the same localStorage keys. Copying
 * them into the OS frame instead would have made the very thing this shift is
 * repairing — a second owner of one fact — one file wider.
 */

import { readLivingMarket, writeLivingMarket, listenForLivingMarket, prefersReducedMotion, type LivingMarket } from "@/lib/chart/livingMarket";
import { requestWatchlist } from "@/lib/os/watchlistDoor";
import { requestEquipment } from "@/lib/workspace/equipmentChannel";
import { ChartStyleSettingsTab } from "@/components/settings/ChartStyleSettingsTab";
import { InventionCensusView } from "@/components/settings/InventionCensusView";
import { CapabilityLedgerView } from "@/components/settings/CapabilityLedgerView";
import { SavedLayoutsDoor } from "@/components/os/SavedLayoutsDoor";
import { ExecutionGuardrailsTab } from "@/components/settings/ExecutionGuardrailsTab";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { CHART_TF_SHIPPED, normalizeTFId } from "@/lib/timeframes";
import { readAppSettings, writeAppSettings } from "@/lib/settings/appSettingsStore";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart2, Bell, Monitor, Search, Settings, Shield, Trash2, X } from "lucide-react";
import { clsx } from "clsx";

import { ShellModalDrawer } from "@/components/layout/ShellModalDrawer";
import { useShellModalFocus } from "@/components/layout/useShellModalFocus";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { useAuth } from "@/contexts/AuthContext";
import { useInstrumentSearch } from "@/hooks/useInstrumentSearch";
import { instrumentSearchSelection, instrumentSearchDestination } from "@/lib/marketData/instrumentSearch";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";
import { requestBrokerConnect } from "@/lib/broker/brokerConnectDoor";

/* ── All searchable symbols ─────────────────────────────── */
/**
 * The catalog this dialog offers is NOT declared here. It was, as
 * `ALL_SYMBOLS`, a second copy of the chart picker's list — and the two had
 * drifted: this one was missing eight symbols and still called `VX1!` a
 * futures contract after the picker had corrected it to the cash index it
 * actually loads. See `curatedSymbolCatalog`.
 */

/* The unread seed, its badge count, the Settings tab vocabulary and the
   open-settings door live in `shellPanelDoors` (light, so a closed shell can
   read them without loading every panel) and are re-exported from here. */
import { INITIAL_NOTIFS, type SettingsTabId } from "@/components/layout/shellPanelDoors";
import { readJournalRaw } from "@/lib/traderMemory/adapters/journalStorage";
export { initialUnreadNotificationCount, SETTINGS_TAB_IDS, OPEN_SETTINGS_EVENT, openSettings, type SettingsTabId } from "@/components/layout/shellPanelDoors";

const CAT_COLOR: Record<string,string> = {
  Futures:"text-wm-gold",  Stock:"text-wm-blue",
  ETF:"text-wm-green",     Crypto:"text-wm-purple",
  Forex:"text-wm-text-muted", Index:"text-wm-gold", Fund:"text-wm-green",
};

/** The palette's category filter (Founder, 2026-09-28: "it used to also say crypto forex futures stocks"). */
const SEARCH_CATEGORIES = ["All", "Stock", "ETF", "Index", "Futures", "Future Option", "Forex", "Crypto"] as const;
type SearchCategoryFilter = (typeof SEARCH_CATEGORIES)[number];
const CATEGORY_LABEL: Record<SearchCategoryFilter, string> = { All: "All", Stock: "Stocks", ETF: "ETFs", Index: "Indices", Futures: "Futures", "Future Option": "Futures options", Forex: "Forex", Crypto: "Crypto" };

const DEFAULT_QUICK = ["NQ1!","ES1!","BTC","AAPL","NVDA","TSLA","SPY","GC1!"];

/* ── Search Panel ────────────────────────────────────────── */
export function SearchPanel({
  onClose,
  fallbackTriggerRef,
}: {
  onClose: () => void;
  fallbackTriggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [query, setQuery] = useState("");
  const { setActiveSymbol } = useActiveSymbol();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [quickSyms, setQuickSyms] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("wm_quick_syms") ?? "null") ?? DEFAULT_QUICK; } catch { return DEFAULT_QUICK; }
  });
  const [editingQuick, setEditingQuick] = useState(false);
  const [newQuickInput, setNewQuickInput] = useState("");

  const saveQuick = (syms: string[]) => {
    setQuickSyms(syms);
    localStorage.setItem("wm_quick_syms", JSON.stringify(syms));
  };
  const addQuick = (sym: string) => {
    const upper = sym.trim().toUpperCase();
    if (!upper || quickSyms.includes(upper)) return;
    saveQuick([...quickSyms, upper]);
    setNewQuickInput("");
  };
  const removeQuick = (sym: string) => saveQuick(quickSyms.filter(s => s !== sym));

  const onDialogKeyDown = useShellModalFocus({
    panelRef,
    initialFocusRef: inputRef,
    fallbackTriggerRef,
    onClose,
  });

  const { results: unfiltered, searching, failure } = useInstrumentSearch(query);
  const searchNote = failure ? `Live search unavailable — curated markets remain available. ${failure}` : null;
  const [category, setCategory] = useState<SearchCategoryFilter>("All");
  const allResults = category === "All" ? unfiltered : unfiltered.filter(r => r.cat === category);

  const pick = useCallback((sym: string) => {
    const hit = allResults.find(r => r.sym === sym) ?? { sym, label: sym, cat: "Unknown" };
    const destination = instrumentSearchDestination(hit);
    if (!destination) return;
    setActiveSymbol(destination.symbol.toUpperCase());
    router.push(hit.futureOption ? destination.href : INSTRUMENT_VIEW_ROUTE);
    onClose();
  }, [allResults, setActiveSymbol, router, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const target = instrumentSearchSelection(query, allResults);
      if (target) pick(target);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-start justify-center overflow-hidden p-4 sm:items-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        ref={panelRef}
        id="wm-symbol-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wm-symbol-search-title"
        aria-describedby="wm-symbol-search-description"
        initial={{ scale: 0.95, y: -10 }} animate={{ scale: 1, y: 0 }}
        className="max-h-[calc(100dvh-32px)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-2xl border border-wm-border bg-wm-dark shadow-2xl"
        onClick={e => e.stopPropagation()}
        onKeyDown={onDialogKeyDown}
      >
        <h2 id="wm-symbol-search-title" className="sr-only">Search symbols</h2>
        <p id="wm-symbol-search-description" className="sr-only">Search markets or manage browser quick access symbols.</p>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-wm-border">
          <Search size={16} className="text-wm-text-dim shrink-0" />
          <label htmlFor="wm-symbol-search-input" className="sr-only">Search symbols</label>
          <input
            id="wm-symbol-search-input"
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search any symbol — NQ1!, AAPL, RIVN, BTC, EUR/USD…"
            className="flex-1 bg-transparent text-sm text-wm-text outline-none placeholder-wm-text-dim"
          />
          {searching && <div aria-hidden="true" className="w-3 h-3 rounded-full border-2 border-wm-blue border-t-transparent animate-spin shrink-0" />}
          {query && !searching && (
            <button type="button" aria-label="Clear symbol search" onClick={() => { setQuery(""); }} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-wm-text-dim hover:bg-wm-surface hover:text-wm-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold">
              <X size={14} aria-hidden="true" />
            </button>
          )}
          <kbd className="text-[10px] text-wm-text-dim border border-wm-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div role="status" aria-live="polite" className="sr-only">
          {searching ? "Searching" : query ? `${allResults.length} result${allResults.length === 1 ? "" : "s"}` : "Quick access"}
        </div>

        {/* Category filter — every asset class, one row */}
        <div role="group" aria-label="Filter by market" className="flex flex-wrap gap-1.5 px-4 pt-2.5 pb-1">
          {SEARCH_CATEGORIES.map(c => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}
              data-testid={`search-category-${c}`}
              className={clsx("min-h-8 rounded-full border px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold",
                category === c ? "border-wm-gold/60 bg-wm-gold/15 text-wm-gold" : "border-wm-border text-wm-text-muted hover:text-wm-text")}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        {searchNote && <div role="status" className="px-4 pb-1 text-[10px] text-wm-text-dim">{searchNote}</div>}

        {/* Results */}
        {allResults.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            {allResults.map((s, i) => (
              <button
                key={`${s.sym}-${i}`}
                onClick={() => pick(s.sym)}
                aria-label={`Open ${s.sym}, ${s.label}, ${s.cat}`}
                className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-wm-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-wm-gold"
              >
                <div className="w-10 h-8 rounded-lg bg-wm-surface flex items-center justify-center text-[10px] font-black text-wm-text border border-wm-border shrink-0">
                  {s.sym.slice(0, 4)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-wm-text">{s.sym}</div>
                  <div className="text-[10px] text-wm-text-dim truncate">{s.label}</div>
                </div>
                {/* Result contract (master order §LVI): class, and the venue where the vendor names one. */}
                <span className={clsx("text-[10px] font-semibold text-right", CAT_COLOR[s.cat] ?? "text-wm-text-muted")}>
                  {s.cat}
                  {"exchange" in s && s.exchange ? <span className="block text-[9px] font-normal text-wm-text-dim">{s.exchange}</span> : null}
                </span>
              </button>
            ))}
          </div>
        )}

        {query.length > 0 && allResults.length === 0 && !searching && (
          <div className="px-4 py-5 text-center">
            <div className="text-wm-text-dim text-sm mb-1">No results for &ldquo;{query}&rdquo;</div>
            <button
              onClick={() => pick(query.trim().toUpperCase())}
              aria-label={`Open ${query.trim().toUpperCase()} as entered`}
              className="mt-1 inline-flex min-h-11 items-center rounded-lg px-3 text-xs text-wm-blue hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold"
            >
              Open &ldquo;{query.trim().toUpperCase()}&rdquo; anyway →
            </button>
          </div>
        )}

        {!query && (
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] text-wm-text-dim uppercase tracking-wider">Quick access</div>
              <button type="button" onClick={() => setEditingQuick(v => !v)}
                aria-label={editingQuick ? "Finish editing quick access" : "Edit quick access"}
                className="inline-flex min-h-11 items-center rounded-lg px-2 text-[10px] text-wm-blue transition-colors hover:text-wm-blue/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold">
                {editingQuick ? "Done" : "✎ Edit"}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickSyms.map(s => (
                <div key={s} className="relative group">
                  <button type="button" onClick={() => editingQuick ? removeQuick(s) : pick(s)}
                    aria-label={editingQuick ? `Remove ${s} from quick access` : `Open ${s}`}
                    className={`min-h-11 px-2.5 py-1 rounded-lg bg-wm-surface border text-xs font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold ${
                      editingQuick
                        ? "border-wm-red/50 text-wm-red hover:bg-wm-red/10"
                        : "border-wm-border text-wm-text hover:border-wm-green/50 hover:text-wm-green"
                    }`}>
                    {editingQuick ? "✕ " : ""}{s}
                  </button>
                </div>
              ))}
              {editingQuick && (
                <div className="flex items-center gap-1">
                  <input
                    aria-label="Quick access symbol"
                    value={newQuickInput}
                    onChange={e => setNewQuickInput(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === "Enter") addQuick(newQuickInput); }}
                    placeholder="+ Add…"
                    className="h-11 w-24 px-2 py-0.5 rounded-lg bg-wm-surface border border-wm-border text-xs text-wm-text outline-none focus:border-wm-blue/50 placeholder-wm-text-dim"
                  />
                  <button type="button" onClick={() => addQuick(newQuickInput)}
                    disabled={!newQuickInput.trim() || quickSyms.includes(newQuickInput.trim().toUpperCase())}
                    aria-label="Add quick access symbol"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-xs font-bold text-wm-green hover:text-wm-green/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold disabled:cursor-not-allowed disabled:opacity-40">
                    ✓
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="px-4 py-2 border-t border-wm-border text-[10px] text-wm-text-dim flex items-center justify-between">
          <span>Stocks · ETFs · indices · futures (metals, energy, grains) · forex · crypto — worldwide</span>
          <span>
            <kbd className="border border-wm-border rounded px-1">↵</kbd> open &nbsp;
            <kbd className="border border-wm-border rounded px-1">ESC</kbd> close
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Notifications Panel ─────────────────────────────────── */
export function NotificationsPanel({
  onClose,
  fallbackTriggerRef,
}: {
  onClose: () => void;
  fallbackTriggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);
  const unread = notifs.filter(n => !n.read).length;

  const markAll = () => setNotifs(n => n.map(x => ({ ...x, read: true })));
  const remove  = (id: number) => setNotifs(n => n.filter(x => x.id !== id));
  const markOne = (id: number) => setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));

  return (
    <ShellModalDrawer
      id="wm-notifications-drawer"
      titleId="wm-notifications-title"
      descriptionId="wm-notifications-description"
      title="Notifications"
      description="Nothing is delivered here yet"
      closeLabel="Close notifications"
      width={380}
      onClose={onClose}
      fallbackTriggerRef={fallbackTriggerRef}
      titleIcon={<Bell size={14} className="text-wm-gold" aria-hidden="true" />}
      headerActions={unread > 0 ? (
        <button
          type="button"
          onClick={markAll}
          className="inline-flex min-h-11 items-center justify-center rounded px-2 text-[10px] text-wm-blue transition-colors hover:bg-wm-surface hover:text-wm-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
        >
          Mark all read
        </button>
      ) : undefined}
      // Agrees with the Price Alerts panel (one sentence, PRICE_ALERT_TRUTH):
      // a chart alert is an on-screen notice on that chart — it never arrives here.
      footer={<p className="text-center text-[10px] text-wm-text-dim">No alert source is connected to this drawer yet. {PRICE_ALERT_TRUTH}</p>}
    >
      <div className="h-full">
        {notifs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-wm-text-muted">
            <Bell size={32} className="opacity-20" aria-hidden="true" />
            <span className="text-sm">No notifications</span>
          </div>
        )}
        {notifs.map(n => (
          <article
            key={n.id}
            className={clsx(
              "flex items-start gap-2 border-b border-wm-border/40 px-3 py-2 transition-colors",
              n.read ? "hover:bg-wm-surface/30" : "bg-wm-surface/50 hover:bg-wm-surface"
            )}
          >
            <button
              type="button"
              onClick={() => markOne(n.id)}
              aria-label={n.read ? `Notification: ${n.title}` : `Mark ${n.title} as read`}
              className="flex min-h-11 min-w-0 flex-1 items-start gap-3 rounded-lg p-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
            >
              <span className="mt-0.5 shrink-0 text-xl" aria-hidden="true">{n.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="mb-0.5 flex items-center gap-1.5">
                  <span className={clsx("text-xs font-bold", n.read ? "text-wm-text-muted" : "text-wm-text")}>{n.title}</span>
                  {!n.read && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-wm-blue" />}
                  <span className="sr-only">{n.read ? "Read" : "Unread"}</span>
                </span>
                <span className="block text-[11px] leading-relaxed text-wm-text-dim">{n.body}</span>
                <span className="mt-1 block text-[10px] text-wm-text-dim">{n.time}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => remove(n.id)}
              aria-label={`Dismiss notification: ${n.title}`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-wm-text-dim transition-colors hover:bg-wm-surface hover:text-wm-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </article>
        ))}
      </div>
    </ShellModalDrawer>
  );
}

/* ── Sign-out helper (needs auth context inside component) ── */
function SignOutButton({ onClose }: { onClose: () => void }) {
  const { signOut } = useAuth();
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signOut();
        onClose();
      }}
      className="min-h-11 w-full rounded-xl py-2 text-sm font-bold transition-all hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold disabled:opacity-50"
      style={{ background: "rgba(255,77,106,0.12)", border: "1px solid rgba(255,77,106,0.3)", color: "#FF4D6A" }}
    >
      {busy ? "Signing out…" : "Sign Out"}
    </button>
  );
}

/* ── Settings Panel ──────────────────────────────────────── */

export function SettingsPanel({
  onClose,
  fallbackTriggerRef,
  initialTab,
}: {
  onClose: () => void;
  fallbackTriggerRef: React.RefObject<HTMLButtonElement | null>;
  initialTab?: SettingsTabId;
}) {
  const [tab,       setTab]       = useState<SettingsTabId>(initialTab ?? "display");
  const router = useRouter();
  const [marketMotion, setMarketMotion] = useState<LivingMarket>("LIVE");
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    setMarketMotion(readLivingMarket());
    setReducedMotion(prefersReducedMotion());
    const stop = listenForLivingMarket(setMarketMotion);
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const syncReduced = () => setReducedMotion(prefersReducedMotion());
    media?.addEventListener?.("change", syncReduced);
    return () => { stop(); media?.removeEventListener?.("change", syncReduced); };
  }, []);
  const [darkMode,  setDarkMode]  = useState(true);
  const [soundOn,   setSoundOn]   = useState(true);
  const [showPnl,   setShowPnl]   = useState(true);
  const [defaultTF, setDefaultTF] = useState("5m");
  const [defSym,    setDefSym]    = useState("NQ1!");
  const [chartTheme,  setChartTheme]  = useState("green-red");
  const [fontSize,    setFontSize]    = useState("medium");

  // Load persisted settings on mount so the panel reflects saved state
  useEffect(() => {
    try {
      const raw = localStorage.getItem("wm_settings");
      if (!raw) return;
      const s = JSON.parse(raw);
      if (typeof s.darkMode === "boolean") setDarkMode(s.darkMode);
      if (typeof s.soundOn === "boolean") setSoundOn(s.soundOn);
      if (typeof s.showPnl === "boolean") setShowPnl(s.showPnl);
      if (s.defaultTF) setDefaultTF(s.defaultTF === "last" || s.defaultTF === "none" ? s.defaultTF : (normalizeTFId(String(s.defaultTF)) ?? s.defaultTF));
      if (s.defSym) setDefSym(s.defSym);
      if (s.chartTheme) setChartTheme(s.chartTheme);
      if (s.fontSize) setFontSize(s.fontSize);
    } catch {}
  }, []);

  // Apply font size live to the document so the choice has visible effect
  useEffect(() => {
    const px = fontSize === "small" ? "14px" : fontSize === "large" ? "18px" : "16px";
    document.documentElement.style.fontSize = px;
  }, [fontSize]);

  const Toggle = ({ label, on, set }: { label: string; on: boolean; set: (v:boolean)=>void }) => (
    <button
      type="button"
      onClick={() => set(!on)}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={clsx(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
      )}
    >
      {/* House pass 2026-10-10: ON is the canonical active brass with an obsidian
          knob (OFF: a muted knob in the empty track), not teal market-green and
          a pure-white knob. A preference
          being on is not a market reading and must not borrow its colour. */}
      <span aria-hidden="true" className={clsx(
        "relative inline-flex h-5 w-9 rounded-full transition-colors",
        on ? "" : "border border-wm-border bg-wm-surface"
      )} style={on ? { background: WM.gold.hero } : undefined}>
        <span className={clsx(
          "absolute left-0.5 top-0.5 h-4 w-4 rounded-full shadow transition-transform",
          on ? "translate-x-4" : "translate-x-0"
        )} style={{ background: on ? WM.surface.deepest : WM.text.muted }} />
      </span>
    </button>
  );

  const Row = ({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) => (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-wm-border/40 py-3">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-wm-text">{label}</div>
        {sub && <div className="text-[10px] text-wm-text-dim mt-0.5">{sub}</div>}
      </div>
      {children}
    </div>
  );

  const TABS = [
    { id:"display" as const, label:"Appearance", icon:Monitor },
    { id:"chart" as const, label:"Chart", icon:BarChart2 },
    { id:"views" as const, label:"My Views", icon:Search },
    { id:"intelligence" as const, label:"Market Intelligence", icon:BarChart2 },
    { id:"execution" as const, label:"Execution", icon:Shield },
    { id:"watchlist" as const, label:"Watchlist", icon:Search },
    { id:"connections" as const, label:"Connections", icon:Shield },
    { id:"accessibility" as const, label:"Accessibility", icon:Monitor },
    { id:"account" as const, label:"Account / Privacy", icon:Shield },
  ];

  const onTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    current: (typeof TABS)[number]["id"],
  ) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = TABS.findIndex(item => item.id === current);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? TABS.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    const next = TABS[nextIndex].id;
    setTab(next);
    window.requestAnimationFrame(() => document.getElementById(`wm-settings-tab-${next}`)?.focus());
  };

  return (
    <ShellModalDrawer
      id="wm-settings-drawer"
      titleId="wm-settings-title"
      descriptionId="wm-settings-description"
      title="Settings"
      description="Appearance, market controls, execution, accessibility and account preferences"
      closeLabel="Close settings"
      width={420}
      onClose={onClose}
      fallbackTriggerRef={fallbackTriggerRef}
      titleIcon={<Settings size={15} className="text-wm-blue" aria-hidden="true" />}
      footer={(
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              // The one wm_settings writer: merged over what is stored (withdrawn
              // keys a reader may still hold are not rewritten), announced once.
              writeAppSettings({ darkMode, soundOn, showPnl, defaultTF, defSym, chartTheme, fontSize });
              const patch: Record<string, unknown> = { darkMode, soundOn, showPnl, defaultTF, defSym, chartTheme, fontSize };
              // Read back what was stored (garden pass 2026-10-04: a refused
              // write closed the panel silently and the settings never applied).
              const stored = readAppSettings();
              if (Object.entries(patch).some(([k, v]) => stored[k] !== v)) {
                toast.error("This browser refused to save your settings — they apply until you reload.");
                return;
              }
              toast.success("Settings saved on this device.");
              onClose();
            }}
            className="min-h-11 w-full rounded-xl text-sm font-bold text-wm-black transition-all hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
            style={WM_PRIMARY_ACTION}
          >
            Save Settings
          </button>
          <SignOutButton onClose={onClose} />
        </div>
      )}
    >
        {/* CONNECT BROKERS — the one door. It opens the market room's own broker
            panel (every connection feeds the same broker joint); Settings only knocks. */}
        <div className="px-4 pt-3">
          <button
            type="button"
            data-testid="settings-connect-brokers"
            onClick={() => { onClose(); requestBrokerConnect(); }}
            className="flex min-h-11 w-full items-center justify-between rounded-xl border border-wm-gold/50 px-3 py-2 text-left hover:border-wm-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold"
          >
            <span>
              <span className="block text-sm font-bold text-wm-gold">Connect brokers</span>
              <span className="block text-[11px] text-wm-text-muted">Connection, setup and status for your brokers and data rails</span>
            </span>
            <span aria-hidden="true" className="text-wm-gold">→</span>
          </button>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Settings sections" className="flex shrink-0 flex-wrap border-b border-wm-border">
          {TABS.map(t => (
            <button key={t.id} type="button" role="tab"
              id={`wm-settings-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`wm-settings-panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={event => onTabKeyDown(event, t.id)}
              className={clsx(
                "flex min-h-11 basis-1/3 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wm-gold",
                tab === t.id ? "text-wm-blue border-b-2 border-wm-blue" : "text-wm-text-muted hover:text-wm-text"
              )}>
              <t.icon size={13} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-4 py-2">
          {tab === "display" && (
            <div role="tabpanel" id="wm-settings-panel-display" aria-labelledby="wm-settings-tab-display">
              <Row label="Dark Mode" sub="App pages · the market room is always dark">
                <Toggle label="Dark Mode" on={darkMode} set={setDarkMode} />
              </Row>
              <Row label="Show P&L in header" sub="Realized paper-trading P&L in the top bar">
                <Toggle label="Show P&L in header" on={showPnl} set={setShowPnl} />
              </Row>
              <Row label="Sound Effects" sub="The chart's Big Trades bubble sound">
                <Toggle label="Sound Effects" on={soundOn} set={setSoundOn} />
              </Row>
              <Row label="Chart Theme" sub="Candle color scheme">
                <select aria-label="Chart Theme" value={chartTheme} onChange={e => setChartTheme(e.target.value)}
                  className="min-h-11 max-w-[55%] rounded-lg border border-wm-border bg-wm-surface px-2 py-1 text-xs text-wm-text outline-none focus-visible:ring-2 focus-visible:ring-wm-gold">
                  <option value="green-red">Green/Red (Default)</option>
                  <option value="gold-current">Gold Current</option>
                  <option value="blue-purple">Royal Blue/Purple</option>
                  <option value="blue-orange">Blue/Yellow</option>
                  <option value="mono">Monochrome</option>
                  <option value="custom">Custom candle colors</option>
                </select>
              </Row>
              <Row label="Font Size" sub="Chart label and UI text size">
                <select aria-label="Font Size" value={fontSize} onChange={e => setFontSize(e.target.value)}
                  className="min-h-11 max-w-[55%] rounded-lg border border-wm-border bg-wm-surface px-2 py-1 text-xs text-wm-text outline-none focus-visible:ring-2 focus-visible:ring-wm-gold">
                  <option value="small">Small</option>
                  <option value="medium">Medium (Default)</option>
                  <option value="large">Large</option>
                </select>
              </Row>
            </div>
          )}

          {tab === "chart" && (
            <div role="tabpanel" id="wm-settings-panel-chart" aria-labelledby="wm-settings-tab-chart">
              <ChartStyleSettingsTab />
            </div>
          )}

          {tab === "views" && (
            <div role="tabpanel" id="wm-settings-panel-views" aria-labelledby="wm-settings-tab-views" className="py-2">
              <SavedLayoutsDoor ink={{ gold: "#C9A55C", rule: "rgba(139,106,41,0.35)", pearl: "#ede6d3", muted: "#8a8271", hint: "#6f6858", warn: "#e0786b" }} />
            </div>
          )}

          {tab === "execution" && (
            <div role="tabpanel" id="wm-settings-panel-execution" aria-labelledby="wm-settings-tab-execution">
              <ExecutionGuardrailsTab />
            </div>
          )}

          {tab === "intelligence" && (
            <div role="tabpanel" id="wm-settings-panel-intelligence" aria-labelledby="wm-settings-tab-intelligence">
              <button type="button" onClick={() => { onClose(); if (window.location.pathname === INSTRUMENT_VIEW_ROUTE) requestEquipment("chart-tools"); else router.push(INSTRUMENT_VIEW_ROUTE); }} className="my-2 min-h-11 rounded border border-wm-border px-3 text-xs">Open market tools</button>
              <InventionCensusView />
              {/* Night shift 2026-10-07: SymbolContext reads the LAST-OPENED symbol
                  first and this setting only when there is none, so "loaded when
                  opening Charts" overclaimed for anyone who has opened a chart. */}
              <Row label="Default Symbol" sub="Opens on Charts when this browser has no last-opened market — the last market you opened wins">
                <>
                  <input
                    list="wm-defsym-list"
                    aria-label="Default Symbol"
                    value={defSym}
                    onChange={e => setDefSym(e.target.value.toUpperCase())}
                    placeholder="Search symbol…"
                    className="min-h-11 w-28 rounded-lg border border-wm-border bg-wm-surface px-2 py-1 text-xs uppercase text-wm-text outline-none focus:border-wm-blue focus-visible:ring-2 focus-visible:ring-wm-gold" />
                  <datalist id="wm-defsym-list">
                    {["NQ1!","ES1!","BTC","ETH","AAPL","SPY","GC1!","TSLA","NVDA","MSFT","QQQ","EUR/USD","XAU/USD"].map(s => <option key={s} value={s} />)}
                  </datalist>
                </>
              </Row>
              <Row label="Default Timeframe" sub="Timeframe a chart opens on (a timeframe in the link still wins); Last Used keeps your last one">
                <select
                  aria-label="Default Timeframe"
                  value={defaultTF} onChange={e => setDefaultTF(e.target.value)}
                  className="min-h-11 rounded-lg border border-wm-border bg-wm-surface px-2 py-1 text-xs text-wm-text outline-none focus-visible:ring-2 focus-visible:ring-wm-gold">
                  <option value="last">Last Used</option>
                  {/* "None" behaves exactly as Last Used (ChartsDashboard ignores both). */}
                  <option value="none">None (same as Last Used)</option>
                  {/* G12: the one timeframe registry — the retired "D"/"W"/"M" ids were written to storage from here. */}
                  {CHART_TF_SHIPPED.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Row>
              {/* Garden 16 §46 (2026-09-27): "Auto-save Journal", "Paper Trade
                  Warnings" and "Confirm Order Submissions" saved switches no
                  code read — withdrawn until a reader exists. */}
            </div>
          )}


          {tab === "connections" && (
            <div role="tabpanel" id="wm-settings-panel-connections" aria-labelledby="wm-settings-tab-connections">
              <Row label="Brokers and data rails" sub="Support, entitlement, quote health and execution are measured separately.">
                <button type="button" onClick={() => { onClose(); requestBrokerConnect(); }} className="min-h-11 rounded border border-wm-border px-3 text-xs">Manage connections</button>
              </Row>
              <CapabilityLedgerView />
            </div>
          )}
          {tab === "watchlist" && (
            <div role="tabpanel" id="wm-settings-panel-watchlist" aria-labelledby="wm-settings-tab-watchlist">
              <Row label="Named watchlists" sub="Manage markets and lists in the chart's Watchlist panel.">
                <button type="button" onClick={() => { onClose(); if (window.location.pathname === INSTRUMENT_VIEW_ROUTE) requestWatchlist(); else router.push(`${INSTRUMENT_VIEW_ROUTE}?watchlist=open`); }} className="min-h-11 rounded border border-wm-border px-3 text-xs">{typeof window !== "undefined" && window.location.pathname === INSTRUMENT_VIEW_ROUTE ? "Manage Watchlist" : "Open market home"}</button>
              </Row>
            </div>
          )}
          {tab === "accessibility" && (
            <div role="tabpanel" id="wm-settings-panel-accessibility" aria-labelledby="wm-settings-tab-accessibility">
              <Row label="Living market motion" sub="STILL settles the same market objects. Quotes and evidence stay live; open charts update immediately.">
                <select aria-label="Living market motion" value={marketMotion} onChange={event => { const mode = event.target.value === "STILL" ? "STILL" : "LIVE"; setMarketMotion(mode); writeLivingMarket(mode); }} className="min-h-11 rounded border border-wm-border bg-wm-surface px-2 text-xs">
                  <option value="LIVE">LIVE</option><option value="STILL">STILL</option>
                </select>
              </Row>
              <p className="py-3 text-xs text-wm-text-muted">{reducedMotion ? "Your operating system requests reduced motion; charts respect STILL regardless of the LIVE preference." : "Charts also respect your operating system's reduced motion preference."}</p>
            </div>
          )}
          {tab === "account" && (
            <div role="tabpanel" id="wm-settings-panel-account" aria-labelledby="wm-settings-tab-account">
              {/* Was "Subscription · WealthyMindsets PRO" for every account — hard-coded;
                  no billing exists (2026-10-04). Access is what is true; pricing is
                  the Founder's to publish. */}
              <Row label="Access" sub="WealthyMindsets Pro · every room is open · no paid plan is connected">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-wm-gold/20 text-wm-gold border border-wm-gold/40">PRO</span>
              </Row>
              <Row label="Market Data" sub="Status varies by source, symbol, and freshness">
                {/* WM-CHART-PROV-EMERG-01 (2026-08-09): vendor identity removed
                    from user-visible chrome per Founder directive. Provenance
                    kept internal for the diagnostics inspector. */}
                <span className="text-xs text-wm-blue font-semibold">See contextual data health</span>
              </Row>
              {/* Garden 16 §46: the "Two-Factor Auth" switch changed nothing —
                  a security control that does not secure is withdrawn. */}
              <Row label="Export All Data" sub="Download journal, paper trades and profile as JSON">
                <button
                  onClick={() => {
                    const data = {
                      journal: JSON.parse(readJournalRaw(localStorage) ?? "[]"),
                      paper:   JSON.parse(localStorage.getItem("wm_paper_state") ?? "{}"),
                      profile: JSON.parse(localStorage.getItem("wm-profile") ?? "{}"),
                      exportedAt: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement("a");
                    a.href = url; a.download = "wealthymindsets-export.json"; a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-wm-border px-2.5 py-1.5 text-xs text-wm-text-muted transition-colors hover:text-wm-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold">
                  Export
                </button>
              </Row>
              <Row label="Clear Cache" sub="Remove cached watchlist prices; keep preferences and journal history">
                <button
                  onClick={() => {
                    localStorage.removeItem("wm-watchlist-prices");
                    window.location.reload();
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-wm-border px-2.5 py-1.5 text-xs text-wm-red/70 transition-colors hover:text-wm-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold">
                  <Trash2 size={10} /> Clear
                </button>
              </Row>
            </div>
          )}
        </div>

    </ShellModalDrawer>
  );
}
