"use client";

import React, { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

/* ── Market session detection (ET) ─────────────────────── */
function getSessionLabel(): string {
  const now = new Date();
  // Convert to ET (UTC-5 or UTC-4 depending on DST)
  const etOffset = -5; // simplified; adjust for DST if needed
  const etHour = (now.getUTCHours() + 24 + etOffset) % 24;
  const etMin  = now.getUTCMinutes();
  const t = etHour * 60 + etMin;

  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return "Market Closed";
  if (t >= 4 * 60 && t < 9 * 60 + 30) return "Pre-Market Trading";
  if (t >= 9 * 60 + 30 && t < 16 * 60) return "Market Open";
  if (t >= 16 * 60 && t < 20 * 60) return "After-Hours";
  return "Market Closed";
}

/* ── Individual index ticker ─────────────────────────────── */
function IndexTicker({ label, symbol }: { label: string; symbol: string }) {
  const { ticker } = useWebSocket({ symbol, timeframe: "1m" });
  const up = ticker.change >= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", borderLeft: "1px solid #1E2030" }}>
      <span style={{ color: "#8B8FA8", fontSize: 11 }}>{label}</span>
      <span style={{ color: "#E2E8F0", fontSize: 11, fontFamily: "monospace", fontWeight: 600 }}>
        {ticker.price.toFixed(2)}
      </span>
      <span style={{ color: up ? "#00C076" : "#FF4D67", fontSize: 11, fontFamily: "monospace" }}>
        {up ? "▲" : "▼"} {up ? "+" : ""}{ticker.change.toFixed(2)} {up ? "+" : ""}{ticker.changePct.toFixed(2)}%
      </span>
    </div>
  );
}

export function BottomIndexBar() {
  const [time, setTime] = useState("");
  const [session, setSession] = useState("");

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
      setSession(getSessionLabel());
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
        <span style={{ fontSize: 11, color: "#8B8FA8", fontWeight: 500 }}>{session}</span>
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
