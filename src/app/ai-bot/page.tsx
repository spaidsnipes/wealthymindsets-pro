"use client";

import React from "react";
import { Activity, AlertTriangle, Bot, ChevronRight, Database, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { useWebSocket } from "@/hooks/useWebSocket";

const SYMBOLS = ["SPY","QQQ","AAPL","NVDA","TSLA","MSFT","META","AMZN","BTC","ETH"];

export default function AIBotPage() {
  const router = useRouter();
  const { activeSymbol, setActiveSymbol } = useActiveSymbol();
  const market = useWebSocket({ symbol: activeSymbol, timeframe: "1m" });
  const price = market.ticker.price;
  const connected = market.connected && price > 0 && market.source !== "unavailable";
  const dp = price >= 100 ? 2 : price >= 1 ? 4 : 6;

  return (
    <div className="h-full overflow-y-auto bg-[#0D0E14] text-wm-text">
      <header className="flex min-h-16 items-center gap-3 border-b border-wm-border px-5">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-wm-purple to-wm-blue">
          <Bot size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-black">WM Market Intelligence</h1>
          <p className="text-[10px] text-wm-text-dim">Observed market data only · no generated signals</p>
        </div>
        <div className={`ml-auto rounded-full border px-3 py-1 text-[10px] font-black ${connected ? "border-wm-green/30 bg-wm-green/10 text-wm-green" : "border-wm-red/30 bg-wm-red/10 text-wm-red"}`}>
          {connected ? `CONNECTED · ${market.source.toUpperCase()}` : "REAL DATA UNAVAILABLE"}
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
              <li>• Real stock tape only when the Alpaca relay is connected.</li>
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
