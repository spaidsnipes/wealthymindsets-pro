"use client";

import { selectTickerChangeDisplay } from "@/lib/marketData/selectTickerChangeDisplay";
import React, { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { US_CASH_SESSION_UNKNOWN_LABEL } from "@/lib/marketData/canonicalIdentity";

/* ── Individual index ticker ─────────────────────────────── */
function IndexTicker({ label, symbol }: { label: string; symbol: string }) {
  const { ticker } = useWebSocket({ symbol, timeframe: "1m" });
  // Truth guard: useWebSocket returns a zero-initialized ticker before/without
  // a real subscription. Rendering "0.00 +0.00 +0.00%" for every index is
  // fabricated data. Only paint values when a real quote actually arrived.
  const hasQuote = Number.isFinite(ticker.price) && ticker.price > 0;
  // Shared guard: finiteness alone does not prove a provider reference close
  // exists (0 and 0 are finite). See selectTickerChangeDisplay.
  const chg = selectTickerChangeDisplay(ticker);
  const hasChange = hasQuote && chg.displayable;
  const up = chg.direction === "up";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", borderLeft: "1px solid #1E2030" }}>
      <span style={{ color: "#8B8FA8", fontSize: 11 }}>{label}</span>
      {hasQuote ? (
        <span style={{ color: "#E2E8F0", fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}>
          {ticker.price.toFixed(2)}
        </span>
      ) : (
        <span
          style={{ color: "#8B8FA8", fontSize: 11, fontFamily: "monospace" }}
          title="No verified quote from the current feed yet."
        >—</span>
      )}
      {hasChange ? (
        <span style={{ color: up ? "#00C076" : "#FF4D67", fontSize: 11, fontFamily: "monospace" }}>
          {up ? "▲" : "▼"} {up ? "+" : ""}{chg.change.toFixed(2)} {up ? "+" : ""}{chg.changePct.toFixed(2)}%
        </span>
      ) : null}
    </div>
  );
}

export function BottomIndexBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const etOffset = -5;
      const etMs = now.getTime() + etOffset * 3600 * 1000;
      const et = new Date(etMs);
      const h = String(et.getUTCHours()).padStart(2, "0");
      const m = String(et.getUTCMinutes()).padStart(2, "0");
      const s = String(et.getUTCSeconds()).padStart(2, "0");
      // Get month/day from UTC adjusted
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const mon = months[et.getUTCMonth()];
      const day = et.getUTCDate();
      setTime(`${mon} ${day} ${h}:${m}:${s}`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      height: 28,
      background: "#0A0B10",
      borderTop: "1px solid #1E2030",
      display: "flex",
      alignItems: "center",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      {/* Session status */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px" }}>
        <span style={{ fontSize: 10, color: "#8B8FA8" }}>🇺🇸</span>
        <span style={{ fontSize: 11, color: "#8B8FA8", fontWeight: 500 }}>{US_CASH_SESSION_UNKNOWN_LABEL}</span>
      </div>

      <IndexTicker label="Dow Jones" symbol="YM1!" />
      <IndexTicker label="NASDAQ" symbol="NQ1!" />
      <IndexTicker label="S&P 500" symbol="ES1!" />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Clock */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px" }}>
        <span style={{ fontSize: 11, color: "#8B8FA8", fontFamily: "monospace" }}>{time}</span>
        <Eye size={12} color="#4A5070" />
      </div>
    </div>
  );
}
