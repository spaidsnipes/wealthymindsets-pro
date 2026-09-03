"use client";

import React from "react";
import { Activity, AlertTriangle, Bot, ChevronRight, Database, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import { WM } from "@/lib/design/wmTokens";
// Shift-SPAIDBOT: Market Canvas — fourth canonical consumer of composeMarketCanvasVM
// (after /command-deck, /journal detail, and /nectar/[symbol]). Closes an ORPHAN:
// this "Market Intelligence · Live market monitor" page has a real per-context
// symbol identity (activeSymbol) but the canvas VM was computing for it with no
// visible consumer. Same class of gap Shift-Z Z1 closed on /nectar/[symbol].
import { useMarketCanvasVM } from "@/lib/marketData/viewModels/useMarketCanvasVM";
import { canonicalMarketStateIdentity } from "@/lib/marketData/canonicalIdentity";
import MarketCanvasPanel from "@/components/experience/MarketCanvasPanel";
import CanvasSummaryPill from "@/components/experience/CanvasSummaryPill";

const SYMBOLS = ["SPY","QQQ","AAPL","NVDA","TSLA","MSFT","META","AMZN","BTC","ETH"];

export default function AIBotPage() {
  const router = useRouter();
  const { activeSymbol, setActiveSymbol } = useActiveSymbol();
  const market = useWebSocket({ symbol: activeSymbol, timeframe: "1m" });
  const price = market.ticker.price;
  const connected = market.connected && price > 0 && market.source !== "unavailable";
  const dp = price >= 100 ? 2 : price >= 1 ? 4 : 6;

  // Shift-SPAIDBOT: Market Canvas VM — fourth canonical consumer of the shared
  // composeMarketCanvasVM compiler. Identity is built from the active symbol +
  // default 15m timeframe (matches /command-deck, /journal, /nectar/[symbol]).
  // No owner binding — Canvas display here is symbol-scoped, not owner-scoped
  // (this monitor has no auth context loaded). Silent-safe: returns an empty VM
  // when the canonical store has no snapshot for this identity (canon §Silence
  // Is A Feature — undefined ≠ unavailable).
  const canvasIdentity = React.useMemo(() => {
    if (!activeSymbol) return null;
    try {
      // "15" is NOT a TFId and has no LEGACY alias, so normalizeTFId returned
      // null, canonicalMarketStateIdentity threw, the catch below nulled the
      // identity, and the Market Canvas silently never rendered on this page —
      // the very orphan this block was added to close. The canonical id is "15m".
      return canonicalMarketStateIdentity({ symbol: activeSymbol, timeframe: "15m" });
    } catch {
      // Unknown symbol shape (option OCC, non-canonical futures) — no-op.
      return null;
    }
  }, [activeSymbol]);
  const marketCanvas = useMarketCanvasVM({ identity: canvasIdentity, ownerId: null });

  return (
    <div
      className="h-full overflow-y-auto"
      style={{
        background: `radial-gradient(1200px 700px at 50% -10%, rgba(212,175,55,0.06), transparent 60%), ${WM.surface.deepest}`,
        color: WM.text.body,
      }}
    >
      <header
        className="flex items-center gap-3 px-5"
        style={{
          minHeight: 64,
          borderBottom: "1px solid rgba(139,106,41,0.15)",
          background: "linear-gradient(180deg, #0b0b0d 0%, rgba(11,11,13,0.6) 100%)",
          flexWrap: "wrap",
        }}
      >
        <div
          className="grid place-items-center"
          style={{
            width: 40, height: 40, borderRadius: 999,
            background: "linear-gradient(160deg, rgba(212,175,55,0.22), rgba(201,165,92,0.08))",
            border: "1px solid rgba(212,175,55,0.35)",
            boxShadow: "inset 0 0 18px -8px rgba(212,175,55,0.4)",
            color: WM.gold.hero,
          }}
        >
          <Bot size={18} />
        </div>
        <div>
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 16, fontWeight: 400,
              color: WM.text.hero, letterSpacing: -0.2, margin: 0,
            }}
          >
            Market Intelligence
          </h1>
          <p
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 10, fontStyle: "italic", color: WM.text.muted,
              margin: 0, marginTop: 2,
            }}
          >
            Observed market data only · no generated signals
          </p>
        </div>
        <div
          className="ml-auto"
          style={{
            padding: "3px 10px", borderRadius: 999,
            border: `1px solid ${(connected ? WM.state.ok : WM.state.warn)}44`,
            background: `${connected ? WM.state.ok : WM.state.warn}12`,
            color: connected ? WM.state.ok : WM.state.warn,
            fontSize: 9, letterSpacing: 0.32, fontWeight: 800,
            textTransform: "uppercase", fontVariantNumeric: "tabular-nums",
          }}
        >
          {connected ? `Connected · ${market.source}` : "Real data unavailable"}
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-5 p-5 lg:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-3xl border border-wm-border bg-wm-card/80 p-6">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-wm-gold">
            <Activity size={14} /> Live market monitor
          </div>

          <div className="mt-6 rounded-2xl border border-wm-border bg-black/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-3xl font-black">{activeSymbol}</div>
                <div className="mt-1 text-xs text-wm-text-dim">Source: {connected ? market.source : "none"}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-3xl font-black">{connected ? price.toFixed(dp) : "—"}</div>
                <div className={`mt-1 font-mono text-sm font-bold ${market.ticker.changePct >= 0 ? "text-wm-green" : "text-wm-red"}`}>
                  {connected ? `${market.ticker.changePct >= 0 ? "+" : ""}${market.ticker.changePct.toFixed(2)}%` : "Unavailable"}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Connection", connected ? "Observed" : "Unavailable"],
                ["Price feed", connected ? market.source.toUpperCase() : "None"],
                ["Trade tape", market.tapeSource?.toUpperCase() ?? "Unavailable"],
                ["Latency", connected ? `${market.latency} ms` : "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-wm-border bg-wm-surface/40 p-3">
                  <div className="text-[9px] uppercase tracking-wider text-wm-text-dim">{label}</div>
                  <div className="mt-1 text-xs font-black">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {SYMBOLS.map(symbol => (
              <button
                key={symbol}
                onClick={() => setActiveSymbol(symbol)}
                className={`rounded-xl border px-3 py-2 text-xs font-black transition-colors ${
                  symbol === activeSymbol
                    ? "border-wm-gold/50 bg-wm-gold/15 text-wm-gold"
                    : "border-wm-border text-wm-text-muted hover:border-wm-blue/40 hover:text-wm-text"
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>

          {/* Shift-SPAIDBOT: Market Canvas — current market reality for the
              active symbol per canonicalMarketState. Silent-safe: renders only
              when the canvas has an actual snapshot / blockers / clearances
              (canon §Silence Is A Feature). Routed through the shared
              composeMarketCanvasVM compiler via useMarketCanvasVM so this
              monitor stays canonically consistent with the deck. */}
          {(marketCanvas.canvas.hasSnapshot ||
            marketCanvas.canvas.blockers.length > 0 ||
            marketCanvas.canvas.clearances.length > 0) && (
            <div className="mt-6">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-wm-gold">
                <Activity size={14} /> Market Canvas · {activeSymbol} now
              </div>
              <p
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 10, fontStyle: "italic", color: WM.text.muted,
                  margin: "4px 0 0",
                }}
              >
                Current 15m reality — MISSING / RESOLVED / WHY NOT / CLEARED / WOULD INVALIDATE — from the shared compiler.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                <CanvasSummaryPill
                  vm={marketCanvas.canvas}
                  ariaLabel={`Current market canvas summary for ${activeSymbol}`}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <MarketCanvasPanel vm={marketCanvas.canvas} />
              </div>
            </div>
          )}

          <button
            onClick={() => router.push("/charts")}
            className="mt-6 flex w-full items-center justify-between rounded-2xl border border-wm-blue/30 bg-wm-blue/10 px-4 py-3 text-sm font-black text-wm-blue transition-colors hover:bg-wm-blue/15"
          >
            Open observed chart data <ChevronRight size={16} />
          </button>
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-wm-green/25 bg-wm-green/5 p-5">
            <div className="flex items-center gap-2 font-black text-wm-green"><ShieldCheck size={16} /> Accuracy policy</div>
            <p className="mt-3 text-xs leading-6 text-wm-text-muted">
              This section no longer creates entries, targets, stops, win rates, confidence grades, dark-pool alerts, or order-flow confirmations without observed supporting data.
            </p>
          </div>

          <div className="rounded-3xl border border-wm-border bg-wm-card/80 p-5">
            <div className="flex items-center gap-2 font-black"><Database size={16} className="text-wm-gold" /> What is available</div>
            <ul className="mt-3 space-y-3 text-xs leading-5 text-wm-text-muted">
              <li>• Real quotes when a configured free provider responds.</li>
              <li>• Real crypto trades and order books on supported exchanges.</li>
              <li>• Real stock tape only when your connected broker relay is live.</li>
            </ul>
          </div>

          {!connected && (
            <div className="rounded-3xl border border-wm-red/25 bg-wm-red/5 p-5">
              <div className="flex items-center gap-2 font-black text-wm-red"><AlertTriangle size={16} /> No substitute data</div>
              <p className="mt-2 text-xs leading-5 text-wm-text-muted">The selected symbol has no verified live response. Values remain blank until an observed source connects.</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
