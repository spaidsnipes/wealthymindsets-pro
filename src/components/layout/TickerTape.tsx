"use client";

import React, { useEffect, useState, useRef } from "react";
import { TrendingUp, TrendingDown, Pencil, X, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { priceSourceBadge } from "@/lib/priceSource";
import { CanonicalFidelityBadge } from "@/components/marketData/CanonicalFidelityBadge";
import { selectPerCapabilityFidelity } from "@/lib/marketData/selectPerCapabilityFidelity";
import { yahooQuoteObserved, yahooQuoteRefusal } from "@/lib/marketData/yahooQuoteObserved";
import { useProvenSessionClosure } from "@/lib/marketData/useProvenSessionClosure";

// WM-SEC-P0-05 (2026-08-08): client-side Polygon key read removed. The
// NEXT_PUBLIC_POLYGON_KEY that used to live here shipped the API key
// into the browser bundle (same class as the Finnhub bug WM-SEC-P0-03
// just fixed) and the key value is in public git history — see
// docs/operations/AUDIT_2026-08-08_10-POINT.md CRITICAL-A. Any Polygon
// call chain originating here no-ops via the empty-key guards below;
// tape falls back to the Yahoo / Alpaca REST paths. Rebuild via a
// server proxy once POLYGON_KEY is set server-only in Vercel.
const POLYGON_KEY = "";

/* ── The trader's tape ─────────────────────────────────────────
   The list of symbols is owned by `@/lib/marketData/tapeSymbols`, NOT by this
   component. A hardcoded catalogue used to sit here doing three jobs — the
   default list, the fetch allowlist and the row seed — so a symbol the trader
   added but the catalogue had never heard of was kept by the editor below and
   dropped by the rail. See that module's header for the measurement.

   It also carried a `base` price for every symbol under a comment saying they
   must never be rendered as a verified quote. There are no prices here now: a
   row starts with no price and gains one only from a provider.
─────────────────────────────────────────────────────────────── */
import { selectQuoteChange } from "@/lib/quoteChange";
import {
  DEFAULT_TAPE_SYMBOLS,
  TAPE_SYMBOL_SUGGESTIONS,
  readStoredTapeSymbols,
  tapeQuoteBlocker,
  withTapeSymbol,
  withoutTapeSymbol,
} from "@/lib/marketData/tapeSymbols";

const TAPE_STORAGE_KEY = "wm-tape-symbols";

interface TickerState {
  sym:   string;
  price: number;
  chg:   number;
  pct:   number;
  /** False when the provider gave a price but no session change. */
  chgObserved: boolean;
  up:    boolean;
  live:  boolean;
  src?:  string;
  /**
   * Set when a provider ANSWERED and WM declined to certify the answer.
   * Distinct from `live: false` with no refusal, which is "no answer yet".
   * See yahooQuoteRefusal — the tape had one word for both facts.
   */
  refusal?: string;
}

/**
 * A row for a symbol nothing has been observed about yet.
 *
 * `price: 0` with `live: false` is the honest starting state and the renderer
 * shows "quote pending" for it. The previous seed put a hardcoded catalogue
 * price in this field, which nothing rendered — but a real price sitting in
 * state behind a boolean is one careless read away from being printed.
 */
const unobservedRow = (sym: string): TickerState => ({
  sym, price: 0, chg: 0, pct: 0, chgObserved: false, up: true, live: false,
});

/** What a provider answered for one symbol. Absence means no answer, not zero. */
interface Quote {
  price: number;
  chg: number;
  pct: number;
  chgObserved: boolean;
  src: string;
}

/** The row for one symbol: the provider's answer, or the honest absence of one. */
function rowFor(
  sym: string,
  quotes: Record<string, Quote>,
  refusals: Record<string, string> = {},
): TickerState {
  const key = sym.toUpperCase();
  const q = quotes[key];
  if (!q || !(q.price > 0)) {
    const refusal = refusals[key];
    return refusal ? { ...unobservedRow(sym), refusal } : unobservedRow(sym);
  }
  return {
    sym,
    price: q.price,
    chg: q.chg,
    pct: q.pct,
    chgObserved: q.chgObserved,
    up: q.chg >= 0,
    live: true,
    src: q.src,
  };
}

/* ── Multi-source quote fetcher ───────────────────────────────── *
 *  Stocks/ETFs  → Finnhub /api/finnhub (real-time)              *
 *  Futures/Crypto → Yahoo /api/yahoo (15-min delayed but best   *
 *    available free source for these instruments)                *
 * ────────────────────────────────────────────────────────────── */
const FUTURES_SYMS = new Set(["NQ1!","ES1!","RTY1!","YM1!","GC1!","SI1!","CL1!","NG1!","ZB1!","ZN1!","ZF1!","ZT1!","HG1!","MNQ1!","MES1!","MYM1!","M2K1!","MGC1!","MCL1!"]);
const CRYPTO_SYMS  = new Set(["BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LINK","DOT","LTC","ATOM","UNI"]);

// SF-D01 consumer gate — shared with paper + scanner consumers so all
// three surfaces consult one predicate. See yahooQuoteObserved.ts +
// yahooQuoteObserved.test.ts for the truth contract.

/**
 * What one provider round produced for one symbol.
 *
 * Three outcomes, not two. `null` (no answer) and REFUSED (an answer WM
 * declined to certify) had been folded together, and the rail printed
 * "quote pending" for both — see yahooQuoteRefusal for the measurement.
 */
type QuoteAnswer =
  | ({ kind: "quote" } & Quote)
  | { kind: "refused"; reason: string };

async function fetchQuote(sym: string): Promise<QuoteAnswer | null> {
  const up = sym.toUpperCase();

  // Futures → Yahoo (only free source for futures)
  if (FUTURES_SYMS.has(up) || up.endsWith("1!")) {
    try {
      const j = await fetch(`/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
      const price = j?.price ?? 0;
      const yc = selectQuoteChange({ price, prevClose: j?.prevClose });
      if (price > 0 && yahooQuoteObserved(j)) return { kind: "quote", price, chg: yc.observed ? yc.chg : 0, pct: yc.observed ? yc.pct : 0, chgObserved: yc.observed, src: "yahoo" };
      // Yahoo is the ONLY free futures source, so its refusal is the tape's
      // final answer for this symbol — there is no next provider to try.
      const refusal = yahooQuoteRefusal(j);
      if (refusal) return { kind: "refused", reason: refusal };
    } catch {}
    return null;
  }

  // Crypto → public Coinbase quote. The real executed tape is owned by the
  // WebSocket path; this bounded quote request must never hit Alpaca's equity
  // route or claim a broker connection.
  if (CRYPTO_SYMS.has(up)) {
    try {
      const j = await fetch(`/api/exchange?ex=coinbase&coin=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
      if (j?.price > 0) { const qc = selectQuoteChange({ price: j.price, prevClose: j?.prevClose, change: j?.change, changePct: j?.changePct }); return { kind: "quote", price: j.price, chg: qc.observed ? qc.chg : 0, pct: qc.observed ? qc.pct : 0, chgObserved: qc.observed, src: "coinbase" }; }
    } catch {}
    // Fallback to Yahoo for crypto
    try {
      const j = await fetch(`/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
      const price = j?.price ?? 0;
      const yc = selectQuoteChange({ price, prevClose: j?.prevClose });
      if (price > 0 && yahooQuoteObserved(j)) return { kind: "quote", price, chg: yc.observed ? yc.chg : 0, pct: yc.observed ? yc.pct : 0, chgObserved: yc.observed, src: "yahoo" };
      const refusal = yahooQuoteRefusal(j);
      if (refusal) return { kind: "refused", reason: refusal };
    } catch {}
    return null;
  }

  // Stocks/ETFs use the same consolidated-first semantic as MainChart and the
  // watchlist. Independent consumers must not disagree on LIVE vs DELAYED.
  // Yahoo's refusal is held, not returned: two more providers may still
  // observe this symbol. It becomes the row's answer only if they do not.
  let yahooRefusal: string | null = null;
  try {
    const j = await fetch(`/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
    const price = j?.price ?? 0;
    const yc = selectQuoteChange({ price, prevClose: j?.prevClose });
    if (price > 0 && yahooQuoteObserved(j)) return { kind: "quote", price, chg: yc.observed ? yc.chg : 0, pct: yc.observed ? yc.pct : 0, chgObserved: yc.observed, src: "yahoo" };
    yahooRefusal = yahooQuoteRefusal(j);
  } catch {}
  try {
    const j = await fetch(`/api/alpaca?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
    if (j?.price > 0 && j.source === "alpaca") { const qc = selectQuoteChange({ price: j.price, prevClose: j?.prevClose, change: j?.change, changePct: j?.changePct }); return { kind: "quote", price: j.price, chg: qc.observed ? qc.chg : 0, pct: qc.observed ? qc.pct : 0, chgObserved: qc.observed, src: "alpaca" }; }
  } catch {}
  try {
    const j = await fetch(`/api/finnhub?sym=${encodeURIComponent(up)}&type=quote`, { cache: "no-store" }).then(r => r.json());
    if (j?.price > 0) { const qc = selectQuoteChange({ price: j.price, prevClose: j?.prevClose, change: j?.change, changePct: j?.changePct }); return { kind: "quote", price: j.price, chg: qc.observed ? qc.chg : 0, pct: qc.observed ? qc.pct : 0, chgObserved: qc.observed, src: "finnhub" }; }
  } catch {}
  if (yahooRefusal) return { kind: "refused", reason: yahooRefusal };
  return null;
}

/**
 * One fetch round for the trader's tape.
 *
 * `allSettled`, not `all`: a symbol that throws is one symbol WM could not
 * quote, and it may not take the round down with it. Under `Promise.all` a
 * single rejection stopped the whole rail from updating — every symbol, not
 * just the bad one — and the only thing that had been preventing it was the
 * hardcoded catalogue filtering unknown entries out before they got here.
 */
async function fetchTapeQuotes(
  symbols: readonly string[],
): Promise<{ quotes: Record<string, Quote>; refusals: Record<string, string> }> {
  const quotes: Record<string, Quote> = {};
  const refusals: Record<string, string> = {};
  // Named, not anonymous: `tapeQuoteBlocker` is the one owner of "the tape has
  // no feed for this". The row reads the same predicate, so a symbol dropped
  // here is a symbol the rail explicitly says it cannot serve — never one that
  // sits at "quote pending" waiting for a request that was never sent.
  await Promise.allSettled(symbols.filter(sym => tapeQuoteBlocker(sym) === null).map(async sym => {
    const answer = await fetchQuote(sym);
    if (!answer) return;
    const key = sym.toUpperCase();
    if (answer.kind === "quote") {
      const { kind: _kind, ...quote } = answer;
      quotes[key] = quote;
    } else {
      refusals[key] = answer.reason;
    }
  }));
  return { quotes, refusals };
}

/* ── Individual item ───────────────────────────────────────── */
function TickerItem({ item, onClick, active }: {
  item: TickerState;
  onClick: () => void;
  active: boolean;
}) {
  const { sym, price, chg, pct, chgObserved, up, live, src } = item;
  const dp = price > 10_000 ? 0 : price > 100 ? 2 : price > 1 ? 4 : 6;
  // Provenance: name the feed each quote came from so a value that differs from
  // the chart header or watchlist is explainable, not a silent contradiction.
  // Canon "CLOSED IS NOT DELAYED": on a proven-closed session the rail must
  // not print ACTIVE over a market that is not trading. `null` until mount and
  // on every weekday, so provider labelling is untouched the rest of the time.
  const sessionOpen = useProvenSessionClosure(sym);
  const blocker = tapeQuoteBlocker(sym);
  const quoteObservation = {present: Boolean(src) && Number.isFinite(price) && price > 0};
  const badge = priceSourceBadge(src ?? "unavailable", live, sessionOpen, quoteObservation);
  // SHIFT-U continuation — per-capability tooltip enrichment: bars +
  // quotes lit from the ticker's own source; other slots silent.
  const capabilityReport = selectPerCapabilityFidelity({
    source: src ?? "unavailable",
    connected: live,
    hasCandles: false, // The rail owns quote receipts, not candle observations.
    quoteObservation,
    // The visible chip took closure into account one line above; omitting
    // it here made the HOVER tooltip contradict the very chip it explains.
    // Canon §Provider Status: one fact, one answer, per capability.
    sessionOpen,
  });
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded transition-colors group cursor-pointer ${
        active ? "bg-wm-surface" : "hover:bg-wm-surface/50"
      }`}
      title={live ? `${sym} — ${badge.title}. Click to chart.` : `${sym}: waiting for a verified market quote`}
    >
      <span className={`text-[11px] font-bold ${active ? "text-wm-green" : "text-wm-text group-hover:text-wm-green"}`}>{sym}</span>
      {live ? (
        <>
          {/* SHIFT-R atom 4 — CanonicalFidelityBadge (ticker variant)
              replaces the hand-rolled dot + freshness label. The canon
              7-question tooltip enrichment now appears on every ticker
              row for free (canon §Failure Recovery Grammar). */}
          <CanonicalFidelityBadge badge={badge} variant="ticker" titleSuffix={`${sym} — Click to chart.`} capabilityReport={capabilityReport} />
          <span className="font-mono text-[11px] text-wm-text-muted">
            {price.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}
          </span>
          {chgObserved ? (
            <span className={`flex items-center gap-0.5 font-mono text-[10px] ${up ? "text-wm-green" : "text-wm-red"}`}>
              {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
              {chg >= 0 ? "+" : ""}{chg.toFixed(dp > 2 ? 4 : 2)} ({pct >= 0 ? "+" : ""}{pct.toFixed(2)}%)
            </span>
          ) : (
            // Price observed, session change was not. "+0.00 (+0.00%)" here
            // would assert this symbol is flat on the day.
            <span className="font-mono text-[10px] text-wm-text-dim"
              title={`${sym}: this feed returned a price but no session change.`}>
              chg —
            </span>
          )}
        </>
      ) : blocker ? (
        // §8: a designed boundary does not wear a transient state's clothes.
        // No request is in flight for this symbol and none ever will be under
        // the current feeds, so "quote pending" would be a promise the tape
        // cannot keep. Say what is true and why, and keep the row — the trader
        // put it there and removing it silently would repeat the older bug.
        <span
          className="font-mono text-[10px] text-wm-text-dim"
          title={`${sym}: ${blocker}. This is not a delay — no request is made for this symbol.`}
        >
          no feed
        </span>
      ) : item.refusal ? (
        // §8 again, one step further in: a request WAS sent and a provider DID
        // answer — WM read the answer and declined to certify it. That is a
        // decision, not a delay. "quote pending" was measured here on NQ1!
        // ES1! RTY1! YM1! GC1! CL1! forever, while /api/yahoo returned inside
        // 200ms every ten seconds. The refused number is deliberately NOT
        // printed: refusing to certify it and then showing it is the same lie
        // with extra steps.
        <span
          className="font-mono text-[10px] text-wm-text-dim"
          title={`${sym}: not certified — ${item.refusal} This is not a delay; a provider answered and WM declined the answer.`}
        >
          not certified
        </span>
      ) : (
        <span className="font-mono text-[10px] text-wm-text-dim">quote pending</span>
      )}
    </button>
  );
}

/* ── Main component ────────────────────────────────────────── */
export function TickerTape() {
  const { activeSymbol, setActiveSymbol } = useActiveSymbol();
  const router   = useRouter();
  const pathname = usePathname();

  // THE TRADER'S LIST. One list, and every row on the rail is derived from it.
  // There is deliberately no second collection of symbols to fall out of sync
  // with this one: the editor below and the rail read the same array.
  //
  // HYDRATION-SAFE: the first render MUST match the server HTML, so we seed with
  // the deterministic default list and load the localStorage override in an
  // after-mount effect below. Reading localStorage in the initializer caused a
  // server/client text mismatch (React #418) for users with a customized tape.
  const [customSyms, setCustomSyms] = useState<readonly string[]>(() => DEFAULT_TAPE_SYMBOLS);
  const [hydrated, setHydrated]   = useState(false);
  const [editOpen, setEditOpen]   = useState(false);
  const [addInput, setAddInput]   = useState("");
  const editRef = useRef<HTMLDivElement>(null);

  // WHAT A PROVIDER ACTUALLY ANSWERED, keyed by symbol. A symbol with no entry
  // here has no quote, which is a different statement from a quote of zero —
  // the renderer says "quote pending" and prints nothing.
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  // Symbols a provider answered for and WM declined to certify, with the
  // provider's own reason. Kept beside `quotes` rather than inside it so a
  // refusal can never be mistaken for a price of zero.
  const [refusals, setRefusals] = useState<Record<string, string>>({});

  // After mount (client only): pull the persisted symbol list + cached prices.
  useEffect(() => {
    let storedRaw: string | null = null;
    try { storedRaw = localStorage.getItem(TAPE_STORAGE_KEY); } catch {}
    const stored = readStoredTapeSymbols(storedRaw);
    if (stored !== null) setCustomSyms(stored);

    try {
      const w = (window as any).__wmTicker as Record<string, any> | undefined;
      const wAge = w?._ts ? Date.now() - w._ts : Infinity;
      if (w && wAge < 30_000) {
        const cached: Record<string, Quote> = {};
        for (const [sym, p] of Object.entries(w)) {
          if (sym === "_ts" || !p || typeof p !== "object") continue;
          const q = p as Record<string, unknown>;
          if (q.verified !== true || typeof q.price !== "number" || !(q.price > 0)) continue;
          cached[sym.toUpperCase()] = {
            price: q.price,
            chg: typeof q.chg === "number" ? q.chg : 0,
            pct: typeof q.pct === "number" ? q.pct : 0,
            chgObserved: q.chgObserved === true,
            src: typeof q.src === "string" ? q.src : "unavailable",
          };
        }
        if (Object.keys(cached).length > 0) setQuotes(cached);
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Persist custom symbols (skip the initial pre-hydration default so we don't
  // clobber the stored list before the after-mount load runs).
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(TAPE_STORAGE_KEY, JSON.stringify(customSyms)); } catch {}
  }, [customSyms, hydrated]);

  // Close edit panel on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (editRef.current && !editRef.current.contains(e.target as Node)) setEditOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Resolve the user's tape once. Charts already has a full watchlist and
  // symbol header, so its global rail becomes a calm four-symbol pulse rather
  // than a second competing watchlist. Other routes keep the full custom tape.
  //
  // This used to run each symbol through `TAPE_SYMBOLS.find` and drop anything
  // the catalogue did not hold — which is precisely how a symbol the trader had
  // added survived in the editor and vanished from the rail. The trader's list
  // now passes through whole.
  const chartPulseSymbols = [
    ...customSyms.filter(sym => sym === activeSymbol),
    ...customSyms.filter(sym => sym !== activeSymbol),
  ].slice(0, 4);
  const requestedTapeSymbols = pathname === "/charts" ? chartPulseSymbols : customSyms;
  // Depend on the CONTENT of the requested list, not the array identity.
  // `customSyms` is state holding an array: the after-mount effect calls
  // setCustomSyms(stored), which produces a NEW array even when the contents
  // are identical to the default. The polling effect below listed `customSyms`
  // as a dependency, so every mount ran a full fetch round for each new
  // identity — measured on prod as 39 quote requests per page load where 13
  // would do, on every route (this tape lives in the shell).
  // Canon §MACHINE PERFORMANCE: bounded compute, no duplicate subscriptions.
  const requestedTapeKey = requestedTapeSymbols.join(",");

  /* ── Yahoo REST fetch on mount + every 10s ────────────── */
  useEffect(() => {
    const doFetch = async () => {
      const { quotes: answered, refusals: declined } = await fetchTapeQuotes(requestedTapeSymbols);
      setRefusals(declined);
      // A round that produced only refusals still has work to do: it must
      // retract the quotes those symbols are no longer certified for.
      if (!Object.keys(answered).length && !Object.keys(declined).length) return;
      setQuotes(prev => {
        // A symbol WM now refuses to certify must not keep rendering the price
        // it certified on an earlier round. The refusal IS the current answer.
        const kept = Object.fromEntries(
          Object.entries(prev).filter(([sym]) => !(sym in declined)),
        );
        const updated = { ...kept, ...answered };
        // Write to window cache so future HMR/reloads start with correct prices
        const priceCache: Record<string, any> = { _ts: Date.now() };
        for (const [sym, q] of Object.entries(updated)) {
          priceCache[sym] = { price: q.price, chg: q.chg, pct: q.pct, chgObserved: q.chgObserved, verified: true, src: q.src };
        }
        try { (window as any).__wmTicker = priceCache; } catch {}
        // NOTE: Not persisting to localStorage — cleared on init to prevent stale day-change%
        return updated;
      });
    };

    doFetch();
    const id = setInterval(doFetch, 10_000);
    // Fire immediately when tab becomes visible (fixes background-tab throttling)
    const onVisible = () => { if (document.visibilityState === "visible") doFetch(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
    // requestedTapeKey is a stable string: re-subscribe only when the SET of
    // symbols actually changes, never merely because a new array was allocated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedTapeKey]);

  const handleClick = (sym: string) => {
    setActiveSymbol(sym);
    if (pathname !== "/charts") {
      router.push("/charts");
    }
  };

  // Visible tickers = the trader's list, in his order, every one of them.
  // Nothing is filtered out here: a symbol WM has no quote for renders as
  // "quote pending", which is a statement. Removing the row is not.
  const visibleTickers = (pathname === "/charts" ? chartPulseSymbols : customSyms)
    .map(sym => rowFor(sym, quotes, refusals));

  /* Charts keeps one stable pulse; other routes retain the seamless loop. */
  const renderedTickers: TickerState[] = pathname === "/charts"
    ? visibleTickers
    : [...visibleTickers, ...visibleTickers];

  /**
   * Add a symbol to the trader's tape. That is the whole operation.
   *
   * This used to also `(TAPE_SYMBOLS as any[]).push(...)` — mutating a module
   * constant at runtime so the new symbol would pass the catalogue filter. It
   * worked until the next page load, when the module was fresh and the symbol
   * silently stopped rendering. There is no catalogue to teach any more.
   */
  const handleAddSym = (sym: string) => {
    setCustomSyms(prev => withTapeSymbol(prev, sym));
  };

  return (
    <div className="h-full flex items-center relative" style={{ overflow: "hidden" }}>
      <div className="ticker-wrap flex-1 h-full flex items-center" style={{ overflow: "hidden" }}>
        <div className="ticker-inner" style={pathname === "/charts" ? { animation: "none" } : undefined}>
          {renderedTickers.map((t, i) => (
            <React.Fragment key={i}>
              <TickerItem
                item={t}
                onClick={() => handleClick(t.sym)}
                active={t.sym === activeSymbol && pathname === "/charts"}
              />
              <span className="text-wm-border text-xs select-none">|</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Edit button */}
      <div className="relative shrink-0" ref={editRef}>
        <button
          onClick={() => setEditOpen(o => !o)}
          className="flex items-center justify-center w-6 h-6 mx-1 rounded hover:bg-wm-surface text-wm-text-dim hover:text-wm-text transition-colors"
          title="Customize ticker tape symbols"
        >
          <Pencil size={11} />
        </button>

        {editOpen && (
          <div
            className="absolute right-0 bottom-full mb-1 z-[300] w-64 bg-wm-card border border-wm-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: 320 }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-wm-border shrink-0">
              <span className="text-[11px] font-black text-wm-text">Tape Symbols</span>
              <button onClick={() => setEditOpen(false)}>
                <X size={12} className="text-wm-text-muted hover:text-wm-text" />
              </button>
            </div>

            {/* Current symbols list */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {customSyms.map(sym => (
                <div key={sym} className="flex items-center justify-between px-3 py-1.5 hover:bg-wm-surface/50 group">
                  <span className="text-[11px] font-bold text-wm-text">{sym}</span>
                  <button
                    onClick={() => setCustomSyms(prev => withoutTapeSymbol(prev, sym))}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-wm-text-muted hover:text-wm-red"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add input */}
            <div className="border-t border-wm-border px-2 py-2 shrink-0">
              <div className="flex items-center gap-1 bg-wm-surface rounded border border-wm-border px-2 py-1">
                <input
                  value={addInput}
                  onChange={e => setAddInput(e.target.value.toUpperCase())}
                  onKeyDown={e => {
                    if (e.key === "Enter") { handleAddSym(addInput); setAddInput(""); }
                  }}
                  placeholder="Add symbol…"
                  list="tape-syms-list"
                  className="flex-1 bg-transparent text-[11px] text-wm-text outline-none placeholder-wm-text-dim"
                />
                <button
                  onClick={() => { handleAddSym(addInput); setAddInput(""); }}
                  className="text-wm-green hover:text-wm-text transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
              <datalist id="tape-syms-list">
                {TAPE_SYMBOL_SUGGESTIONS.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <div className="text-[9px] text-wm-text-dim mt-1 px-1">
                Type any ticker (stocks, futures, crypto, forex) and press Enter.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
