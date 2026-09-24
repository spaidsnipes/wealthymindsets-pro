"use client";

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

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart2, Bell, Monitor, Search, Settings, Shield, Trash2, X } from "lucide-react";
import { clsx } from "clsx";

import { ShellModalDrawer } from "@/components/layout/ShellModalDrawer";
import { useShellModalFocus } from "@/components/layout/useShellModalFocus";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { useAuth } from "@/contexts/AuthContext";
import { matchCuratedSymbols } from "@/lib/marketData/curatedSymbolCatalog";
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

const INITIAL_NOTIFS: Array<{ id:number; read:boolean; time:string; icon:string; title:string; body:string }> = [];

/**
 * How many unread notifications a shell should badge before the panel has ever
 * been opened. The shells ASK rather than filtering the seed themselves — a
 * header that keeps its own copy of this count is a second owner of it, and
 * would go on reading zero on the day the seed stops being empty.
 */
export function initialUnreadNotificationCount(): number {
  return INITIAL_NOTIFS.filter((n) => !n.read).length;
}

const CAT_COLOR: Record<string,string> = {
  Futures:"text-wm-gold",  Stock:"text-wm-blue",
  ETF:"text-wm-green",     Crypto:"text-wm-purple",
  Forex:"text-wm-text-muted",
};

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
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live Finnhub search results
  const [liveResults, setLiveResults] = useState<{ sym: string; label: string; cat: string }[]>([]);
  const [searching, setSearching] = useState(false);

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

  // Local filtered results — matches symbol, label, and aliases.
  // The query normalisation that used to live here as `qLow` is gone on
  // purpose: `matchCuratedSymbols` owns how a typed query is folded against
  // the catalog. Keeping a local copy of that rule is how the two halves of
  // this picker drifted apart in the first place.
  const localResults = matchCuratedSymbols(query, 10);

  // Debounced Finnhub live search for any symbol not in local list
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.length < 1) { setLiveResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/finnhub?q=${encodeURIComponent(query)}&type=search`, { cache: "no-store" });
        const json = await res.json();
        const localSymSet = new Set(localResults.map(s => s.sym));
        const live = (json.results ?? [])
          .filter((r: any) => !localSymSet.has(r.sym) && r.sym && r.name)
          .slice(0, 12)
          .map((r: any) => ({
            sym:   r.sym,
            label: r.name,
            cat:   r.type === "Crypto" ? "Crypto" : r.type === "ETF" ? "ETF" :
                   r.type === "Forex" ? "Forex" : "Stock",
          }));
        setLiveResults(live);
      } catch { setLiveResults([]); }
      finally { setSearching(false); }
    }, 250);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const allResults = [...localResults, ...liveResults];

  const pick = useCallback((sym: string) => {
    setActiveSymbol(sym.toUpperCase());
    router.push(INSTRUMENT_VIEW_ROUTE);
    onClose();
  }, [setActiveSymbol, router, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      // Priority: local results → live Finnhub → raw typed symbol
      const target = allResults[0]?.sym ?? (query.trim().toUpperCase() || null);
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
            <button type="button" aria-label="Clear symbol search" onClick={() => { setQuery(""); setLiveResults([]); }} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-wm-text-dim hover:bg-wm-surface hover:text-wm-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-wm-gold">
              <X size={14} aria-hidden="true" />
            </button>
          )}
          <kbd className="text-[10px] text-wm-text-dim border border-wm-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div role="status" aria-live="polite" className="sr-only">
          {searching ? "Searching" : query ? `${allResults.length} result${allResults.length === 1 ? "" : "s"}` : "Quick access"}
        </div>

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
                <span className={clsx("text-[10px] font-semibold", CAT_COLOR[s.cat] ?? "text-wm-text-muted")}>
                  {s.cat}
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
          <span>Search any stock, ETF, future, crypto, or forex worldwide</span>
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
      description="Market alerts, strategy coaching, reminders"
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
      footer={<p className="text-center text-[10px] text-wm-text-dim">Alerts are generated from your strategy win rate and market data</p>}
    >
      <div className="h-full">
        {notifs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-wm-text-muted">
            <Bell size={32} className="opacity-20" aria-hidden="true" />
            <span className="text-sm">All caught up!</span>
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
}: {
  onClose: () => void;
  fallbackTriggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [tab,       setTab]       = useState<"display"|"trading"|"alerts"|"account">("display");
  const [darkMode,  setDarkMode]  = useState(true);
  const [soundOn,   setSoundOn]   = useState(true);
  const [showPnl,   setShowPnl]   = useState(true);
  const [defaultTF, setDefaultTF] = useState("5m");
  const [defSym,    setDefSym]    = useState("NQ1!");
  const [priceAlert,  setPriceAlert]   = useState(true);
  const [newsAlert,   setNewsAlert]   = useState(true);
  const [wrAlert,     setWrAlert]     = useState(true);
  const [autoSave,    setAutoSave]    = useState(true);
  const [paperWarn,   setPaperWarn]   = useState(true);
  const [confirmOrders,setConfirmOrders] = useState(true);
  const [overtrading, setOvertrading] = useState(true);
  const [fomoDetect,  setFomoDetect]  = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [twoFactor,   setTwoFactor]   = useState(false);
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
      if (s.defaultTF) setDefaultTF(s.defaultTF);
      if (s.defSym) setDefSym(s.defSym);
      if (s.chartTheme) setChartTheme(s.chartTheme);
      if (s.fontSize) setFontSize(s.fontSize);
      if (typeof s.priceAlert === "boolean") setPriceAlert(s.priceAlert);
      if (typeof s.newsAlert === "boolean") setNewsAlert(s.newsAlert);
      if (typeof s.wrAlert === "boolean") setWrAlert(s.wrAlert);
      if (typeof s.autoSave === "boolean") setAutoSave(s.autoSave);
      if (typeof s.paperWarn === "boolean") setPaperWarn(s.paperWarn);
      if (typeof s.confirmOrders === "boolean") setConfirmOrders(s.confirmOrders);
      if (typeof s.overtrading === "boolean") setOvertrading(s.overtrading);
      if (typeof s.fomoDetect === "boolean") setFomoDetect(s.fomoDetect);
      if (typeof s.inAppNotifs === "boolean") setInAppNotifs(s.inAppNotifs);
      if (typeof s.twoFactor === "boolean") setTwoFactor(s.twoFactor);
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
      <span aria-hidden="true" className={clsx(
        "relative inline-flex h-5 w-9 rounded-full transition-colors",
        on ? "bg-wm-green" : "border border-wm-border bg-wm-surface"
      )}>
        <span className={clsx(
          "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-4" : "translate-x-0"
        )} />
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
    { id:"display" as const, label:"Display", icon:Monitor },
    { id:"trading" as const, label:"Trading", icon:BarChart2 },
    { id:"alerts"  as const, label:"Alerts",  icon:Bell },
    { id:"account" as const, label:"Account", icon:Shield },
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
      description="Display, trading, alert, and account preferences"
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
              localStorage.setItem("wm_settings", JSON.stringify({
                darkMode, soundOn, showPnl, defaultTF, defSym, chartTheme, fontSize,
                priceAlert, newsAlert, wrAlert, autoSave, paperWarn,
                confirmOrders, overtrading, fomoDetect, inAppNotifs, twoFactor,
              }));
              window.dispatchEvent(new CustomEvent("wm-settings-changed"));
              onClose();
            }}
            className="min-h-11 w-full rounded-xl text-sm font-bold text-wm-black transition-all hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
            style={{ background:"linear-gradient(135deg,#00D4AA,#4FA3E0)" }}
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
        <div role="tablist" aria-label="Settings sections" className="flex shrink-0 border-b border-wm-border">
          {TABS.map(t => (
            <button key={t.id} type="button" role="tab"
              id={`wm-settings-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`wm-settings-panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={event => onTabKeyDown(event, t.id)}
              className={clsx(
                "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wm-gold",
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
              <Row label="Dark Mode" sub="Premium dark theme for night trading">
                <Toggle label="Dark Mode" on={darkMode} set={setDarkMode} />
              </Row>
              <Row label="Show P&L in header" sub="Display live profit/loss in the top bar">
                <Toggle label="Show P&L in header" on={showPnl} set={setShowPnl} />
              </Row>
              <Row label="Sound Effects" sub="Tick sounds, alert chimes, order fills">
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

          {tab === "trading" && (
            <div role="tabpanel" id="wm-settings-panel-trading" aria-labelledby="wm-settings-tab-trading">
              <Row label="Default Symbol" sub="Symbol loaded when opening Charts — type any ticker">
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
              <Row label="Default Timeframe" sub="Timeframe loaded on chart open">
                <select
                  aria-label="Default Timeframe"
                  value={defaultTF} onChange={e => setDefaultTF(e.target.value)}
                  className="min-h-11 rounded-lg border border-wm-border bg-wm-surface px-2 py-1 text-xs text-wm-text outline-none focus-visible:ring-2 focus-visible:ring-wm-gold">
                  <option value="last">Last Used</option>
                  <option value="none">None</option>
                  {["1m","2m","5m","15m","30m","1h","D","W","M"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Row>
              <Row label="Auto-save Journal" sub="Prompt to log trades when session ends">
                <Toggle label="Auto-save Journal" on={autoSave} set={setAutoSave} />
              </Row>
              <Row label="Paper Trade Warnings" sub="Alert before placing paper trade orders">
                <Toggle label="Paper Trade Warnings" on={paperWarn} set={setPaperWarn} />
              </Row>
              <Row label="Confirm Order Submissions" sub="Require confirmation before submitting">
                <Toggle label="Confirm Order Submissions" on={confirmOrders} set={setConfirmOrders} />
              </Row>
            </div>
          )}

          {tab === "alerts" && (
            <div role="tabpanel" id="wm-settings-panel-alerts" aria-labelledby="wm-settings-tab-alerts">
              <div className="text-[10px] text-wm-text-dim uppercase tracking-wider mb-3 mt-1">Market Alerts</div>
              <Row label="Price Level Alerts" sub="Notify when price reaches your set levels">
                <Toggle label="Price Level Alerts" on={priceAlert} set={setPriceAlert} />
              </Row>
              <Row label="News & Events" sub="Breaking news that may impact your positions">
                <Toggle label="News & Events" on={newsAlert} set={setNewsAlert} />
              </Row>
              {/* Win-rate threshold, trade-count limit and pattern matching are
                  deterministic rules over the trader's own journal — no model
                  runs. "AI Coaching" promised an engine that does not exist. */}
              <div className="text-[10px] text-wm-text-dim uppercase tracking-wider mb-3 mt-4">Discipline Alerts</div>
              <Row label="Win Rate Warning" sub="Alert when strategy win rate drops below 40%">
                <Toggle label="Win Rate Warning" on={wrAlert} set={setWrAlert} />
              </Row>
              <Row label="Overtrading Alert" sub="Warn when daily trade count exceeds your limit">
                <Toggle label="Overtrading Alert" on={overtrading} set={setOvertrading} />
              </Row>
              <Row label="FOMO Entry Detection" sub="Flag trades that match past losing patterns">
                <Toggle label="FOMO Entry Detection" on={fomoDetect} set={setFomoDetect} />
              </Row>
              <div className="text-[10px] text-wm-text-dim uppercase tracking-wider mb-3 mt-4">Delivery</div>
              <Row label="In-App Notifications" sub="Show alerts in the notification panel">
                <Toggle label="In-App Notifications" on={inAppNotifs} set={setInAppNotifs} />
              </Row>
              <Row label="Sound Chime" sub="Play sound when alert fires">
                <Toggle label="Sound Chime" on={soundOn} set={setSoundOn} />
              </Row>
            </div>
          )}

          {tab === "account" && (
            <div role="tabpanel" id="wm-settings-panel-account" aria-labelledby="wm-settings-tab-account">
              <Row label="Subscription" sub="WealthyMindsets PRO — Active">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-wm-gold/20 text-wm-gold border border-wm-gold/40">PRO</span>
              </Row>
              <Row label="Market Data" sub="Status varies by source, symbol, and freshness">
                {/* WM-CHART-PROV-EMERG-01 (2026-08-09): vendor identity removed
                    from user-visible chrome per Founder directive. Provenance
                    kept internal for the diagnostics inspector. */}
                <span className="text-xs text-wm-blue font-semibold">See contextual data health</span>
              </Row>
              <Row label="Two-Factor Auth" sub="Protect your account with 2FA">
                <Toggle label="Two-Factor Auth" on={twoFactor} set={setTwoFactor} />
              </Row>
              <Row label="Export All Data" sub="Download journal, trades, settings as JSON">
                <button
                  onClick={() => {
                    const data = {
                      journal: JSON.parse(localStorage.getItem("wm_journal_entries") ?? "[]"),
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
              <Row label="Clear Cache" sub="Reset stored chart data and preferences">
                <button
                  onClick={() => {
                    const keep = ["wm-profile","wm-profile-avatar","wm-profile-bg","wm-radio-liked","wm_journal_entries","wm_paper_state","wm_quick_syms"];
                    Object.keys(localStorage).forEach(k => { if (!keep.includes(k)) localStorage.removeItem(k); });
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
