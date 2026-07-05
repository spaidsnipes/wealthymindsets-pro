"use client";

import React, { useState, useRef, useEffect } from "react";
import { Heart, Bell, ChevronDown } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

/* ── Symbol metadata ──────────────────────────────────────── */
const SYMBOL_NAMES: Record<string, string> = {
  "AAPL": "Apple Inc.",    "TSLA": "Tesla Inc.",    "NVDA": "NVIDIA Corporation",
  "AMZN": "Amazon.com",   "META": "Meta Platforms", "MSFT": "Microsoft Corp",
  "GOOG": "Alphabet Inc.", "JPM":  "JPMorgan Chase", "V":   "Visa Inc.",
  "NQ1!": "Nasdaq Futures","ES1!": "S&P 500 Futures","GC1!":"Gold Futures",
  "CL1!": "Crude Oil",    "BTC":  "Bitcoin",        "ETH": "Ethereum",
  "YM1!": "Dow Futures",  "RTY1!":"Russell Futures",
};

function getSymbolName(sym: string) {
  return SYMBOL_NAMES[sym.toUpperCase()] ?? sym;
}

/* ── Bid/Ask progress bar ─────────────────────────────────── */
function BidAskBar({ bids, asks }: {
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
}) {
  const bidTotal = bids.reduce((s, b) => s + b.size, 0);
  const askTotal = asks.reduce((s, a) => s + a.size, 0);
  const total = bidTotal + askTotal || 1;
  const bidPct = Math.round((bidTotal / total) * 100);
  const askPct = 100 - bidPct;

  const topBid = bids[0];
  const topAsk = asks[0];

  return (
    <div style={{ padding: "8px 10px", borderBottom: "1px solid #1E2030" }}>
      {/* Labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#00C076" }}>Bid {bidPct}%</span>
        <span style={{ fontSize: 11, color: "#FF4D67" }}>Ask {askPct}%</span>
        <span style={{ fontSize: 11, color: "#4A5070", cursor: "pointer" }}>🗑</span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 6, borderRadius: 3, background: "#1A1D2E",
        display: "flex", overflow: "hidden", marginBottom: 6,
      }}>
        <div style={{ width: `${bidPct}%`, background: "#00C076", transition: "width 0.3s" }} />
        <div style={{ flex: 1, background: "#FF4D67" }} />
      </div>

      {/* Top bid/ask */}
      {topBid && topAsk && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "#8B8FA8", fontFamily: "monospace" }}>
            NASQ {topBid.price.toFixed(3)} &nbsp; {topBid.size}
          </span>
          <span style={{ fontSize: 10, color: "#8B8FA8", fontFamily: "monospace" }}>
            NASQ {topAsk.price.toFixed(3)} &nbsp; {topAsk.size}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Tick row ─────────────────────────────────────────────── */
function TickRow({ tick }: { tick: { price: number; size: number; side: "buy" | "sell"; time: number } }) {
  const d = new Date(tick.time);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  const timeStr = `${h}:${m}:${s}`;
  const isBuy = tick.side === "buy";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "2px 10px", fontSize: 10,
      fontFamily: "monospace",
      color: "#8B8FA8",
    }}>
      <span style={{ color: "#4A5070", width: 52, flexShrink: 0 }}>{timeStr}</span>
      <span style={{ color: "#4A5070", width: 10 }}>×</span>
      <span style={{ color: "#E2E8F0", flex: 1 }}>{tick.price.toFixed(3)}</span>
      <span style={{ color: "#8B8FA8", width: 20 }}>{tick.size}</span>
      <span style={{ color: isBuy ? "#00C076" : "#FF4D67" }}>{isBuy ? "↑" : "↓"}</span>
    </div>
  );
}

/* ── Main StockInfoPanel ─────────────────────────────────── */
interface Props {
  symbol: string;
}

type TabType = "Quotes" | "Analysis" | "Comments" | "News";
type SubTabType = "Ticks" | "Summary";

export function StockInfoPanel({ symbol }: Props) {
  const { ticker, recentTicks, orderBook } = useWebSocket({ symbol, timeframe: "1m" });
  const [activeTab, setActiveTab] = useState<TabType>("Quotes");
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>("Ticks");
  const [favorited, setFavorited] = useState(false);
  const ticksRef = useRef<HTMLDivElement>(null);
  // Real OHLC from Finnhub/Yahoo
  const [realOHLC, setRealOHLC] = useState<{
    open: number; high: number; low: number; prevClose: number; volume: number;
  } | null>(null);

  // Fetch real OHLC at mount and on symbol change
  useEffect(() => {
    const up = symbol.toUpperCase();
    const isFutures = up.endsWith("1!") || up.includes("=F");
    const isCrypto  = ["BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LINK","DOT","LTC"].includes(up);
    // Yahoo for everything — it includes pre/post-market (matches TradingView);
    // Finnhub free is regular-hours-only and goes stale outside RTH.
    void isFutures; void isCrypto;
    const url = `/api/yahoo?sym=${encodeURIComponent(up)}&type=quote`;
    fetch(url, { cache: "no-store" }).then(r => r.json()).then(j => {
      if (j?.price > 0) setRealOHLC({
        open:      j.open      ?? j.price,
        high:      j.high      ?? j.price,
        low:       j.low       ?? j.price,
        prevClose: j.prevClose ?? j.price,
        volume:    j.volume    ?? 0,
      });
    }).catch(() => {});
  }, [symbol]);

  // Calculate net outflow from recent ticks
  const netOutflow = recentTicks.reduce((s, t) => {
    return s + (t.side === "sell" ? t.size : -t.size);
  }, 0);

  const up = ticker.change >= 0;
  const name = getSymbolName(symbol);

  // Use real OHLC if available, else derive from live ticker
  const dp = ticker.price > 1000 ? 2 : ticker.price > 10 ? 3 : 5;
  const open  = realOHLC ? +realOHLC.open.toFixed(dp)      : +(ticker.price * 0.9986).toFixed(dp);
  const high  = realOHLC ? +realOHLC.high.toFixed(dp)      : +(ticker.price * 1.0054).toFixed(dp);
  const low   = realOHLC ? +realOHLC.low.toFixed(dp)       : +(ticker.price * 0.9944).toFixed(dp);
  const prev  = realOHLC ? +realOHLC.prevClose.toFixed(dp) : +(ticker.price - ticker.change).toFixed(dp);
  const vol   = realOHLC?.volume ? (realOHLC.volume >= 1e9 ? `${(realOHLC.volume/1e9).toFixed(2)}B` : realOHLC.volume >= 1e6 ? `${(realOHLC.volume/1e6).toFixed(2)}M` : `${(realOHLC.volume/1e3).toFixed(0)}K`) : "—";
  const turn  = "—";

  // Pre-market values derived from live ticker
  const preMkt    = ticker.price > 0 ? (ticker.price * 1.0012).toFixed(dp) : "—";
  const preMktChg = ticker.price > 0 ? +(ticker.price * 0.0012).toFixed(dp) : 0;
  const preMktPct = ticker.price > 0 ? +(0.12).toFixed(2) : 0;

  const TABS: TabType[]    = ["Quotes", "Analysis", "Comments", "News"];
  const SUB_TABS: SubTabType[] = ["Ticks", "Summary"];

  return (
    <div style={{
      width: 260,
      flexShrink: 0,
      background: "#0D0E14",
      borderLeft: "1px solid #1E2030",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "10px 10px 6px", borderBottom: "1px solid #1E2030", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>{symbol}</span>
            <span style={{ fontSize: 11, color: "#8B8FA8" }}>{name}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setFavorited(v => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", color: favorited ? "#FF8C00" : "#4A5070" }}
            >
              <Heart size={13} fill={favorited ? "#FF8C00" : "none"} />
            </button>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#4A5070" }}>
              <Bell size={13} />
            </button>
          </div>
        </div>

        {/* Price */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: up ? "#00C076" : "#FF4D67", fontFamily: "monospace" }}>
            {ticker.price.toFixed(3)}
          </span>
          <span style={{ fontSize: 13, color: up ? "#00C076" : "#FF4D67" }}>{up ? "↑" : "↓"}</span>
        </div>
        <div style={{ fontSize: 12, color: up ? "#00C076" : "#FF4D67", fontFamily: "monospace" }}>
          {up ? "+" : ""}{ticker.change.toFixed(3)}&nbsp;&nbsp;{up ? "+" : ""}{ticker.changePct.toFixed(2)}%
        </div>

        {/* Prev close */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 9, color: "#4A5070" }}>Prev Close</span>
          <span style={{ fontSize: 9, color: "#8B8FA8" }}>Jun 15 16:00:00 ET</span>
          <span style={{ fontSize: 9 }}>🇺🇸</span>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 0", marginTop: 8 }}>
          {[
            ["High",       high.toFixed(3)],
            ["Low",        low.toFixed(3)],
            ["Open",       open.toFixed(3)],
            ["Prev Close", prev.toFixed(3)],
            ["Volume",     vol],
            ["Turnover",   turn],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", paddingRight: 10 }}>
              <span style={{ fontSize: 10, color: "#8B8FA8" }}>{k}</span>
              <span style={{ fontSize: 10, color: "#E2E8F0", fontFamily: "monospace" }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Pre-market */}
        <div style={{
          marginTop: 6, padding: "4px 6px", background: "#131520", borderRadius: 4,
          display: "flex", alignItems: "center", gap: 6, fontSize: 10,
        }}>
          <span style={{ color: "#8B8FA8" }}>Pre Mkt</span>
          <span style={{ color: "#E2E8F0", fontFamily: "monospace" }}>{preMkt}</span>
          <span style={{ color: preMktChg < 0 ? "#FF4D67" : "#00C076", fontFamily: "monospace" }}>
            {preMktChg > 0 ? "+" : ""}{preMktChg}&nbsp;{preMktPct > 0 ? "+" : ""}{preMktPct}%
          </span>
          <span style={{ color: "#4A5070" }}>04:45 ET ▼</span>
        </div>

        {/* Data source indicator */}
        <div style={{ marginTop: 6, overflow: "hidden", height: 16 }}>
          <span style={{ fontSize: 9, color: "#4A5070", whiteSpace: "nowrap" }}>
            {realOHLC ? "Live data via Finnhub" : "Loading market data..."}
          </span>
        </div>
      </div>

      {/* Main tabs */}
      <div style={{
        display: "flex", borderBottom: "1px solid #1E2030", flexShrink: 0,
        background: "#0D0E14",
      }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, height: 32, background: "transparent", border: "none",
              borderBottom: activeTab === tab ? "2px solid #FF8C00" : "2px solid transparent",
              color: activeTab === tab ? "#E2E8F0" : "#8B8FA8",
              fontSize: 10, fontWeight: activeTab === tab ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Quotes" && (
        <>
          {/* Sub-tabs */}
          <div style={{
            display: "flex", borderBottom: "1px solid #1E2030", flexShrink: 0, paddingLeft: 6,
          }}>
            {SUB_TABS.map(sub => (
              <button
                key={sub}
                onClick={() => setActiveSubTab(sub)}
                style={{
                  padding: "0 12px", height: 28, background: "transparent", border: "none",
                  borderBottom: activeSubTab === sub ? "2px solid #FF8C00" : "2px solid transparent",
                  color: activeSubTab === sub ? "#E2E8F0" : "#8B8FA8",
                  fontSize: 11, fontWeight: activeSubTab === sub ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* Bid/Ask bar */}
          <BidAskBar bids={orderBook.bids} asks={orderBook.asks} />

          {/* Ticks feed */}
          <div
            ref={ticksRef}
            style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}
          >
            {recentTicks.slice(0, 20).map((tick, i) => (
              <TickRow key={i} tick={tick} />
            ))}
          </div>

          {/* Trade overview */}
          <div style={{
            borderTop: "1px solid #1E2030", padding: "6px 10px", flexShrink: 0,
          }}>
            <div style={{ fontSize: 10, color: "#8B8FA8", marginBottom: 2 }}>Trade Overview</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: netOutflow > 0 ? "#FF4D67" : "#00C076", fontFamily: "monospace" }}>
                Net {netOutflow > 0 ? "Outflow" : "Inflow"}: {Math.abs(netOutflow).toFixed(0)}
              </span>
              <span style={{ fontSize: 9, color: "#4A5070" }}>Unit</span>
            </div>
          </div>
        </>
      )}

      {activeTab === "Analysis" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
          {realOHLC && (
            <>
              <div style={{ fontSize: 10, color: "#8B8FA8", marginBottom: 8 }}>Technical Levels</div>
              {[
                ["R2", +(2 * ((realOHLC.high + realOHLC.low) / 2) - realOHLC.low * 2 + realOHLC.high).toFixed(dp)],
                ["R1", +(2 * ((realOHLC.high + realOHLC.low) / 2) - realOHLC.low).toFixed(dp)],
                ["Pivot", +((realOHLC.high + realOHLC.low + realOHLC.prevClose) / 3).toFixed(dp)],
                ["S1", +(2 * ((realOHLC.high + realOHLC.low) / 2) - realOHLC.high).toFixed(dp)],
                ["S2", +((realOHLC.high + realOHLC.low) / 2 - (realOHLC.high - realOHLC.low)).toFixed(dp)],
              ].map(([label, val]) => (
                <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #1A1D2E" }}>
                  <span style={{ fontSize: 10, color: "#8B8FA8" }}>{label}</span>
                  <span style={{ fontSize: 10, color: "#E2E8F0", fontFamily: "monospace" }}>{val}</span>
                </div>
              ))}
              <div style={{ marginTop: 10, fontSize: 10, color: "#8B8FA8" }}>Day Range</div>
              <div style={{ marginTop: 4, height: 6, background: "#1A1D2E", borderRadius: 3, position: "relative" }}>
                <div style={{
                  position: "absolute", top: 0, bottom: 0, borderRadius: 3,
                  left: `${((ticker.price - realOHLC.low) / (realOHLC.high - realOHLC.low || 1)) * 100}%`,
                  width: 2, background: "#F0B429",
                }} />
                <div style={{
                  position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 3,
                  width: `${((ticker.price - realOHLC.low) / (realOHLC.high - realOHLC.low || 1)) * 100}%`,
                  background: "rgba(79,163,224,0.35)",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <span style={{ fontSize: 9, color: "#FF4D67", fontFamily: "monospace" }}>{realOHLC.low.toFixed(dp)}</span>
                <span style={{ fontSize: 9, color: "#00C076", fontFamily: "monospace" }}>{realOHLC.high.toFixed(dp)}</span>
              </div>
            </>
          )}
          {!realOHLC && <span style={{ fontSize: 11, color: "#4A5070" }}>Loading analysis...</span>}
        </div>
      )}
      {(activeTab === "Comments" || activeTab === "News") && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#4A5070" }}>{activeTab}</span>
          <span style={{ fontSize: 9, color: "#2A2D3E" }}>Connect to community in Lounge tab</span>
        </div>
      )}
    </div>
  );
}
