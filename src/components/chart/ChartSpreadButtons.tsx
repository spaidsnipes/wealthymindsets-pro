"use client";

/**
 * SELL · spread · BUY ON THE CHART (TradingView parity, Founder 2026-11-12). The live bid and ask from the member's own
 * tastytrade quote stream — nothing is drawn without a fresh quote, so a member with no broker sees nothing here. A press
 * opens the ONE ticket with that side picked and the touch price as the draft entry (sideRequest.ts + the chart's own
 * "Trade at price" door). Nothing is sent from here: preview, the server gate and the confirm tap stand.
 */
import React, { useEffect, useState } from "react";
import { tastyLiveContractFor } from "@/lib/broker/tastyFrontMonth";
import { useTastyQuotes } from "@/lib/broker/tastyQuoteStream";
import { requestTicketSide } from "@/lib/execution/sideRequest";

export const SPREAD_QUOTE_FRESH_MS = 15_000;

export function ChartSpreadButtons({ symbol, decimals, onTradeAt }: {
  readonly symbol: string; readonly decimals: number; readonly onTradeAt: (price: number) => void;
}) {
  const [streamer, setStreamer] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setStreamer(null);
    tastyLiveContractFor(symbol).then(c => { if (live) setStreamer(c?.streamer ?? null); }).catch(() => { if (live) setStreamer(null); });
    return () => { live = false; };
  }, [symbol]);
  const snap = useTastyQuotes(streamer ? [streamer] : []);
  const q = streamer ? snap.quotes.get(streamer) : undefined;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, []);
  const fresh = q && q.bid != null && q.ask != null && q.ask >= q.bid && q.quoteAt != null && now - q.quoteAt <= SPREAD_QUOTE_FRESH_MS;
  if (!fresh || !q || q.bid == null || q.ask == null) return null;
  const bid = q.bid, ask = q.ask;
  const btn = (side: "SELL" | "BUY", price: number): React.CSSProperties => ({
    minWidth: 84, padding: "2px 8px", borderRadius: 5, cursor: "pointer", textAlign: "center", lineHeight: 1.15,
    border: `1px solid ${side === "SELL" ? "rgba(239,83,80,0.85)" : "rgba(38,166,154,0.85)"}`,
    background: side === "SELL" ? "rgba(239,83,80,0.12)" : "rgba(38,166,154,0.12)",
    color: side === "SELL" ? "#f2a3a1" : "#8fe0d6", fontSize: 11, fontWeight: 800, letterSpacing: "0.04em",
    fontVariantNumeric: "tabular-nums", ...(price ? {} : {}),
  });
  const press = (side: "SELL" | "BUY", price: number) => { requestTicketSide(symbol, side); onTradeAt(price); };
  return (
    <div data-testid="chart-spread-buttons" style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <button type="button" data-testid="chart-sell" onClick={() => press("SELL", bid)} style={btn("SELL", bid)} aria-label={`Sell at the bid ${bid.toFixed(decimals)} — opens the ticket; nothing is sent until you confirm`}>
        <div>{bid.toFixed(decimals)}</div><div style={{ fontSize: 9, opacity: 0.9 }}>SELL</div>
      </button>
      <span style={{ color: "#9a927f", fontSize: 10, fontVariantNumeric: "tabular-nums" }}>{(ask - bid).toFixed(decimals)}</span>
      <button type="button" data-testid="chart-buy" onClick={() => press("BUY", ask)} style={btn("BUY", ask)} aria-label={`Buy at the ask ${ask.toFixed(decimals)} — opens the ticket; nothing is sent until you confirm`}>
        <div>{ask.toFixed(decimals)}</div><div style={{ fontSize: 9, opacity: 0.9 }}>BUY</div>
      </button>
    </div>
  );
}
