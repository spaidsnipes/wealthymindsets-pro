"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  KRAKEN_WS_URL,
  krakenBookSubscribe,
  krakenTradeSubscribe,
  krakenWsPair,
  getOrderBook,
  getRecentTrades,
} from "@/lib/api/kraken";

/* ── Crypto detection ──────────────────────────────────────── */
const CRYPTO_SYMS = new Set([
  "BTC","ETH","SOL","XRP","ADA","DOGE","AVAX","LINK","DOT","LTC","ATOM","UNI"
]);
function isCrypto(sym: string) { return CRYPTO_SYMS.has(sym.toUpperCase()); }

/* Futures/equities require a licensed Level 2 feed. The free build only renders
   an order book for crypto symbols backed by observed Kraken data. */
const SYMBOL_BASE: Record<string,number> = {
  "NQ1!":22_000,"ES1!":7_540,"RTY1!":2_200,"YM1!":43_300,
  "GC1!":3_300,"CL1!":72,"SI1!":33,"ZB1!":115,"ZN1!":109,
  "AAPL":299,"TSLA":405,"NVDA":209,"AMZN":220,"META":625,"MSFT":450,
  "GOOG":175,"SPY":753,"QQQ":733,"IWM":215,"GLD":305,
  "BTC":65_770,"ETH":1_776,"SOL":160,"XRP":1.21,"DOGE":0.086,
};
function getBase(sym: string) { return SYMBOL_BASE[sym.toUpperCase()] ?? 100; }
function getTickSize(base: number) {
  if (base > 10_000) return 0.25;
  if (base > 1_000)  return 0.25;
  if (base > 100)    return 0.01;
  if (base > 10)     return 0.01;
  if (base > 1)      return 0.0001;
  return 0.00001;
}

interface Level { price: number; bidSize: number; askSize: number; isWall: boolean; isBid: boolean; }

/* ── Build Level[] from Kraken real bids/asks ──────────────── */
function buildRealDOM(
  bids: { price: number; size: number }[],
  asks: { price: number; size: number }[],
  tick: number,
  dp: number,
): Level[] {
  const out: Level[] = [];
  const maxBid = bids.length > 0 ? Math.max(...bids.map(b => b.size)) : 1;
  const maxAsk = asks.length > 0 ? Math.max(...asks.map(a => a.size)) : 1;
  const wallThreshold = Math.max(maxBid, maxAsk) * 0.6;

  // Asks: sorted high→low (top of book = lowest ask)
  const sortedAsks = [...asks].sort((a, b) => b.price - a.price).slice(0, 12);
  for (const a of sortedAsks) {
    out.push({
      price:   +a.price.toFixed(dp),
      bidSize: 0,
      askSize: Math.round(a.size * 100) / 100,
      isWall:  a.size >= wallThreshold,
      isBid:   false,
    });
  }
  // Bids: sorted high→low (top of book = highest bid)
  const sortedBids = [...bids].sort((a, b) => b.price - a.price).slice(0, 12);
  for (const b of sortedBids) {
    out.push({
      price:   +b.price.toFixed(dp),
      bidSize: Math.round(b.size * 100) / 100,
      askSize: 0,
      isWall:  b.size >= wallThreshold,
      isBid:   true,
    });
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════
   DOMPanel component
══════════════════════════════════════════════════════════════ */
export function DOMPanel({ symbol }: { symbol: string }) {
  const sym    = symbol.toUpperCase();
  const crypto = isCrypto(sym);
  const base   = getBase(sym);
  const tick   = getTickSize(base);
  const dp     = tick < 0.01 ? (tick < 0.0001 ? 6 : 4) : 2;

  // Finnhub WebSocket price feed (works for everything)
  const { liveBar, recentTicks, ticker } = useWebSocket({ symbol: sym, timeframe: "1m" });
  // Prefer the live ticker price, then the live bar; the hardcoded `base` seed
  // (e.g. TSLA 405) is only a pre-data placeholder and must never anchor the DOM.
  const livePrice = (ticker?.price && ticker.price > 0) ? ticker.price : (liveBar?.close ?? base);

  const [levels, setLevels] = useState<Level[]>([]);
  const [trades, setTrades] = useState<{ price: number; size: number; side: "buy"|"sell"; time: string }[]>([]);
  const [realConnected, setRealConnected] = useState(false);
  const priceRef  = useRef(livePrice);
  const wsRef     = useRef<WebSocket | null>(null);
  const bidsRef   = useRef<{ price: number; size: number }[]>([]);
  const asksRef   = useRef<{ price: number; size: number }[]>([]);

  // ── Kraken WebSocket for crypto ─────────────────────────────
  const connectKraken = useCallback(() => {
    if (!crypto) return;
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }

    const ws = new WebSocket(KRAKEN_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      const bookMsg  = krakenBookSubscribe(sym);
      const tradeMsg = krakenTradeSubscribe(sym);
      if (bookMsg)  ws.send(bookMsg);
      if (tradeMsg) ws.send(tradeMsg);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);

        // Book snapshot/update
        if (msg.channel === "book") {
          const d = msg.data?.[0];
          if (!d) return;
          if (msg.type === "snapshot") {
            bidsRef.current = (d.bids ?? []).map((b: { price: number; qty: number }) => ({ price: b.price, size: b.qty }));
            asksRef.current = (d.asks ?? []).map((a: { price: number; qty: number }) => ({ price: a.price, size: a.qty }));
          } else {
            // Delta update: qty=0 means remove
            for (const b of (d.bids ?? [])) {
              const entry = { price: b.price as number, size: b.qty as number };
              const idx = bidsRef.current.findIndex(x => x.price === entry.price);
              if (entry.size === 0) { if (idx >= 0) bidsRef.current.splice(idx, 1); }
              else if (idx >= 0)    { bidsRef.current[idx] = entry; }
              else                  { bidsRef.current.push(entry); }
            }
            for (const a of (d.asks ?? [])) {
              const entry = { price: a.price as number, size: a.qty as number };
              const idx = asksRef.current.findIndex(x => x.price === entry.price);
              if (entry.size === 0) { if (idx >= 0) asksRef.current.splice(idx, 1); }
              else if (idx >= 0)    { asksRef.current[idx] = entry; }
              else                  { asksRef.current.push(entry); }
            }
          }
          setRealConnected(true);
          setLevels(buildRealDOM(bidsRef.current, asksRef.current, tick, dp));
          // Update center price from book
          if (bidsRef.current.length > 0 && asksRef.current.length > 0) {
            const bestBid = Math.max(...bidsRef.current.map(b => b.price));
            const bestAsk = Math.min(...asksRef.current.map(a => a.price));
            priceRef.current = (bestBid + bestAsk) / 2;
          }
        }

        // Trade feed
        if (msg.channel === "trade") {
          const trades = msg.data ?? [];
          const newTrades = trades.map((t: { price: number; qty: number; side: string; timestamp: string }) => ({
            price: +t.price.toFixed(dp),
            size:  Math.round(t.qty * 1000) / 1000,
            side:  t.side === "buy" ? "buy" as const : "sell" as const,
            time:  new Date(t.timestamp).toLocaleTimeString("en-US", { hour12:false, hour:"2-digit", minute:"2-digit", second:"2-digit" }),
          }));
          if (newTrades.length > 0) {
            setTrades(prev => [...newTrades, ...prev].slice(0, 25));
          }
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => setRealConnected(false);
    ws.onclose = () => {
      setRealConnected(false);
      // Reconnect after 3s
      setTimeout(() => { if (wsRef.current === ws) connectKraken(); }, 3000);
    };
  }, [crypto, sym, tick, dp]);

  // ── Bootstrap: crypto → Kraken WS + REST snapshot ──────────
  useEffect(() => {
    if (!crypto) {
      setLevels([]);
      setTrades([]);
      setRealConnected(false);
      return;
    }

    // Load REST snapshot immediately while WS connects
    (async () => {
      const book = await getOrderBook(sym, 12);
      if (book) {
        bidsRef.current = book.bids;
        asksRef.current = book.asks;
        setLevels(buildRealDOM(book.bids, book.asks, tick, dp));
        setRealConnected(true);
      }
      const recentTrades = await getRecentTrades(sym);
      if (recentTrades.length > 0) {
        setTrades(recentTrades.slice(0, 20).map(t => ({
          price: +t.price.toFixed(dp),
          size:  Math.round(t.volume * 1000) / 1000,
          side:  t.side,
          time:  new Date(t.time).toLocaleTimeString("en-US", { hour12:false, hour:"2-digit", minute:"2-digit", second:"2-digit" }),
        })));
      }
    })();

    connectKraken();

    return () => {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sym, crypto]);

  // ── Non-crypto: keep the book empty; quote prices are not Level 2 depth ──
  useEffect(() => {
    if (crypto) return;
    if (ticker?.price && ticker.price > 0) priceRef.current = ticker.price;
    else if (liveBar?.close) priceRef.current = liveBar.close;
    setLevels([]);
  }, [liveBar, ticker, tick, crypto]);

  // ── Non-crypto: feed Time & Sales from Finnhub WS ticks ────
  useEffect(() => {
    if (crypto || !recentTicks?.length) return;
    const newest = recentTicks.slice(0, 3).map(t => ({
      price: +t.price.toFixed(dp),
      size:  t.size,
      side:  t.side as "buy"|"sell",
      time:  new Date(t.time).toLocaleTimeString("en-US", { hour12: false, hour:"2-digit", minute:"2-digit", second:"2-digit" }),
    }));
    setTrades(prev => [...newest, ...prev].slice(0, 25));
  }, [recentTicks, dp, crypto]);

  // Derived display values
  const center = priceRef.current || livePrice;
  const maxSize = Math.max(1, ...levels.map(l => Math.max(l.bidSize, l.askSize)));
  const totBid  = levels.filter(l => l.isBid).reduce((s,l) => s + l.bidSize, 0);
  const totAsk  = levels.filter(l => !l.isBid).reduce((s,l) => s + l.askSize, 0);
  const bidPct  = Math.round(totBid / Math.max(1, totBid + totAsk) * 100);

  return (
    <div className="border-l border-wm-border flex flex-col shrink-0" style={{ width:230, background:"#0A0B10", fontSize:13 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-2.5 shrink-0" style={{ height:38, borderBottom:"1px solid rgba(30,32,48,0.8)" }}>
        <span style={{ fontSize:12, fontWeight:800, color:"#5A6080", letterSpacing:1.2, textTransform:"uppercase" }}>DOM</span>
        {crypto && (
          <span style={{ fontSize:10, fontWeight:700, color: realConnected ? "#00C076" : "#F0B429", marginLeft:2 }}>
            {realConnected ? "● LIVE" : "○ REST"}
          </span>
        )}
        {!crypto && (
          <span style={{ fontSize:9, fontWeight:800, color:"#F0B429", marginLeft:2 }}>
            LEVEL 2 REQUIRED
          </span>
        )}
        <span style={{ marginLeft:"auto", fontFamily:"monospace", fontWeight:800, fontSize:16,
          color: (liveBar?.close ?? 0) >= (liveBar?.open ?? 0) ? "#00C076" : "#FF4D67" }}>
          {center.toFixed(dp)}
        </span>
      </div>

      {/* Bid/Ask ratio bar */}
      <div className="flex items-center gap-1.5 px-2.5 shrink-0" style={{ height:24, borderBottom:"1px solid rgba(30,32,48,0.5)" }}>
        <span style={{ color:"#00C076", fontSize:11, fontWeight:700 }}>{bidPct}%</span>
        <div style={{ flex:1, height:5, borderRadius:3, overflow:"hidden", background:"rgba(255,77,103,0.2)" }}>
          <div style={{ height:"100%", borderRadius:3, background:"#00C076", width:`${bidPct}%`, transition:"width 0.4s" }} />
        </div>
        <span style={{ color:"#FF4D67", fontSize:11, fontWeight:700 }}>{100-bidPct}%</span>
      </div>

      {/* Column headers */}
      <div className="flex shrink-0" style={{ height:24, borderBottom:"1px solid rgba(30,32,48,0.6)" }}>
        <div style={{ flex:1, textAlign:"right", paddingRight:6, fontSize:11, fontWeight:700, color:"rgba(255,77,103,0.75)", display:"flex", alignItems:"center", justifyContent:"flex-end" }}>ASK</div>
        <div style={{ width:78, textAlign:"center", fontSize:11, fontWeight:700, color:"#5A6080", display:"flex", alignItems:"center", justifyContent:"center" }}>PRICE</div>
        <div style={{ flex:1, textAlign:"left", paddingLeft:6, fontSize:11, fontWeight:700, color:"rgba(0,192,118,0.75)", display:"flex", alignItems:"center" }}>BID</div>
      </div>

      {/* DOM levels */}
      <div style={{ flex:1, overflow:"hidden" }}>
        {!crypto && (
          <div style={{ padding:"28px 18px", textAlign:"center", color:"#8B95A5", lineHeight:1.5 }}>
            <div style={{ color:"#F0B429", fontSize:11, fontWeight:900, marginBottom:8 }}>NO FABRICATED DEPTH</div>
            <div style={{ fontSize:10 }}>
              Equities and futures DOM needs a licensed Level 2 feed. Crypto books use observed Kraken orders in this free build.
            </div>
          </div>
        )}
        {levels.map((lvl, i) => {
          const isAtPrice = Math.abs(lvl.price - center) < tick * 0.6;
          const sz = lvl.bidSize || lvl.askSize;
          const barW = Math.round((sz / maxSize) * 48);

          return (
            <div key={i} className="flex items-center relative"
              style={{
                height: 22,
                borderBottom: "1px solid rgba(30,32,48,0.25)",
                background: isAtPrice ? "rgba(240,180,41,0.07)" : i % 2 === 0 ? "rgba(255,255,255,0.008)" : "transparent",
              }}>

              {!lvl.isBid && sz > 0 && (
                <div style={{
                  position:"absolute", top:2, bottom:2, borderRadius:2,
                  width: barW, right: 78,
                  background: lvl.isWall ? "rgba(255,77,103,0.35)" : "rgba(255,77,103,0.12)",
                }} />
              )}

              <div style={{ flex:1, textAlign:"right", paddingRight:6, fontFamily:"monospace", fontSize:13, fontWeight:600,
                color: lvl.isWall && !lvl.isBid ? "#FF6B7A" : "#FF4D67",
                opacity: !lvl.isBid && sz > 0 ? 1 : 0, position:"relative", zIndex:2 }}>
                {!lvl.isBid && sz > 0 ? sz : ""}
              </div>

              <div style={{
                width:78, textAlign:"center", fontFamily:"monospace", fontSize:13, fontWeight: isAtPrice ? 800 : 600,
                color: isAtPrice ? "#F0B429" : "#6A72A0",
                background: isAtPrice ? "rgba(240,180,41,0.08)" : "transparent",
                position:"relative", zIndex:2,
              }}>
                {lvl.price.toFixed(dp)}
              </div>

              <div style={{ flex:1, textAlign:"left", paddingLeft:6, fontFamily:"monospace", fontSize:13, fontWeight:600,
                color:"#00C076",
                opacity: lvl.isBid && sz > 0 ? 1 : 0, position:"relative", zIndex:2 }}>
                {lvl.isBid && sz > 0 ? sz : ""}
              </div>

              {lvl.isBid && sz > 0 && (
                <div style={{
                  position:"absolute", top:2, bottom:2, borderRadius:2,
                  width: barW, left: 78,
                  background: lvl.isWall ? "rgba(0,192,118,0.35)" : "rgba(0,192,118,0.12)",
                }} />
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
