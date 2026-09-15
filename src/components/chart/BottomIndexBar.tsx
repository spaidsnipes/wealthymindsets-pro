"use client";

import { selectTickerChangeDisplay } from "@/lib/marketData/selectTickerChangeDisplay";
import React, { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { selectUsCashSessionBarLabel, US_INDEX_BAR_INSTRUMENTS } from "@/lib/marketData/canonicalIdentity";
import { useSessionClockDate } from "@/lib/marketData/useProvenSessionClosure";
import {
  easternClockFact,
  indexChangeFact,
  indexQuoteFact,
  type BarTone,
} from "@/lib/chart/indexBarFacts";

/* Colour comes from a DECLARED TONE and nothing else — never from a sign test
   and never from a nullish check. NONE is visibly neutral because an absence
   is not a result. */
const TONE_COLOR: Record<BarTone, string> = {
  UP: "#00C076",
  DOWN: "#FF4D67",
  FLAT: "#E2E8F0",
  NONE: "#8B8FA8",
};

/* ── Individual index ticker ─────────────────────────────── */
function IndexTicker({ label, symbol }: { label: string; symbol: string }) {
  const { ticker } = useWebSocket({ symbol, timeframe: "1m" });
  // Truth guard: useWebSocket returns a zero-initialized ticker before/without
  // a real subscription. Rendering "0.00 +0.00 +0.00%" for every index is
  // fabricated data. Only paint values when a real quote actually arrived.
  // Shared guard: finiteness alone does not prove a provider reference close
  // exists (0 and 0 are finite). See selectTickerChangeDisplay.
  const chg = selectTickerChangeDisplay(ticker);
  const quoteFact = indexQuoteFact(ticker.price);
  const changeFact = indexChangeFact(quoteFact.measured, chg);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", borderLeft: "1px solid #1E2030" }}>
      <span style={{ color: "#8B8FA8", fontSize: 11 }}>{label}</span>
      <span
        style={{
          color: TONE_COLOR[quoteFact.tone],
          fontSize: 11,
          fontFamily: "monospace",
          fontWeight: quoteFact.measured ? 600 : 400,
        }}
        title={quoteFact.reason}
        aria-label={`${label} price: ${quoteFact.text}. ${quoteFact.reason}`}
      >
        {quoteFact.text}
      </span>
      <span
        style={{ color: TONE_COLOR[changeFact.tone], fontSize: 11, fontFamily: "monospace" }}
        title={changeFact.reason}
        aria-label={`${label} day change: ${changeFact.text}. ${changeFact.reason}`}
      >
        {changeFact.text}
      </span>
    </div>
  );
}

export function BottomIndexBar() {
  // Null until the client has actually taken a reading. There is no clock to
  // read on the server, and a server time rendered in an EXCHANGE clock face is
  // a claim WM has no basis for.
  const [now, setNow] = useState<Date | null>(null);
  // Mount-safe: null on the server and the first client render, so the chip
  // hydrates as STATUS UNKNOWN and only ever sharpens afterwards.
  const sessionLabel = selectUsCashSessionBarLabel(useSessionClockDate());

  // The zone conversion is NOT done here. Hand-rolled offset arithmetic is what
  // put a one-hour-wrong clock on every chart screen for eight months a year;
  // easternClockFact asks the IANA database instead.
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  const clockFact = easternClockFact(now);

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
        <span style={{ fontSize: 11, color: "#8B8FA8", fontWeight: 500 }}>{sessionLabel}</span>
      </div>

      {/* Names come from the canonical owner, never inlined here: these three
          are FUTURES, and labelling them "S&P 500" / "NASDAQ" put a cash-index
          name on a futures price — contradicting the ticker rail one screen
          above, which carried the identical numbers as ES1! / NQ1!. */}
      {US_INDEX_BAR_INSTRUMENTS.map((instrument) => (
        <IndexTicker key={instrument.symbol} label={instrument.label} symbol={instrument.symbol} />
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Clock */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px" }}>
        <span
          style={{ fontSize: 11, color: clockFact.measured ? "#8B8FA8" : "#4A5070", fontFamily: "monospace" }}
          title={clockFact.reason}
          aria-label={`Exchange time: ${clockFact.text}. ${clockFact.reason}`}
        >
          {clockFact.text}
        </span>
        <Eye size={12} color="#4A5070" />
      </div>
    </div>
  );
}
