"use client";
import { useEffect, useState } from "react";
import {
  getKnownSessionSymbols,
  subscribeSessionSymbolStore,
} from "@/lib/marketData/sessionSymbolStore";
import { useActiveSymbol } from "@/contexts/SymbolContext";

/**
 * NectarVaultChip — visible, calm confirmation that WM is holding each
 * symbol's per-tab tape stats independently.
 *
 * Founder problem this solves (2026-08-14): "i have a grip of data that
 * needs to be saved i dont want it to go anywhere and im trying to switch
 * to tsla also but i cant now because i may loose data if i refresh".
 *
 * Renders under the main WM Nectar chip only when ≥2 symbols have been
 * observed this tab session. Each symbol pill shows its own delta / trade
 * count. Clicking a pill does NOT hijack the chart (out of scope for this
 * pass) — the pill is proof-of-safety, not a switcher.
 *
 * Persistence: reads directly from sessionSymbolStore, which is
 * localStorage-backed for the summary tier per the Founder Authority
 * Nectar Persistence doc. Raw tape is NOT stored.
 */
export function NectarVaultChip({ activeSymbol }: { activeSymbol: string }) {
  const [, setTick] = useState(0);
  useEffect(() => subscribeSessionSymbolStore(() => setTick(t => t + 1)), []);
  const { setActiveSymbol } = useActiveSymbol();

  const symbols = getKnownSessionSymbols()
    .filter(s => s.slot.stats.tradeCount > 0)
    .sort((a, b) => b.slot.stats.tradeCount - a.slot.stats.tradeCount);

  if (symbols.length < 2) return null;

  const fmt = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toFixed(2);
  };

  const nowMs = Date.now();
  const fmtMemoryAge = (startedAtSec: number): string => {
    const seconds = Math.max(0, Math.floor(nowMs / 1000 - startedAtSec));
    if (seconds < 60) return `${seconds}s memory`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m memory`;
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    if (hours < 24) return remMin ? `${hours}h ${remMin}m memory` : `${hours}h memory`;
    const days = Math.floor(hours / 24);
    return `${days}d memory`;
  };

  return (
    <div
      className="wm-nectar-vault-chip"
      role="group"
      aria-label={`WM Nectar Vault. ${symbols.length} symbols have retained tape memory this session.`}
      title={
        `WM Nectar Vault — per-symbol summaries persisted for this tab.\n` +
        `Switching symbols and refreshing the page will not erase these counters.\n` +
        `Retention tier: summary only (delta, trade counts, horizon). ` +
        `Raw executed prints are not durably stored while provider rights remain UNKNOWN.`
      }
      style={{
        position: "absolute", top: 104, left: "50%", transform: "translateX(-50%)",
        zIndex: 57, padding: "4px 10px", borderRadius: 999, pointerEvents: "auto",
        background: "linear-gradient(180deg, rgba(11,14,26,0.94) 0%, rgba(11,14,26,0.86) 100%)",
        border: "1px solid rgba(240,180,41,0.22)",
        boxShadow: "0 2px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(240,180,41,0.06)",
        color: "#8B92AC", fontSize: 9.5, fontWeight: 700,
        fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em",
        display: "flex", gap: 10, alignItems: "center", maxWidth: "min(94vw, 720px)",
        overflow: "hidden",
      }}
    >
      <span style={{ color: "#F0B429", fontWeight: 850, letterSpacing: "0.06em" }}>VAULT</span>
      {/* Persistence-tier badge — truth about WHERE this data lives, per
          Founder §14. Summary-tier only today; server/durable-history not
          yet implemented for these per-symbol stats. Never claims more. */}
      <span
        style={{
          color: "#8B92AC", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em",
          padding: "1px 6px", borderRadius: 999,
          background: "rgba(139,146,172,0.08)",
          border: "1px solid rgba(139,146,172,0.18)",
        }}
        title={
          "Persistence tier for this per-symbol data:\n" +
          "• Session (in-memory): always active\n" +
          "• Browser summary (localStorage): active — survives refresh & symbol switch\n" +
          "• Durable server history: NOT YET IMPLEMENTED for these per-symbol stats\n" +
          "• Raw executed prints: NOT retained (provider rights UNKNOWN)"
        }
      >
        LOCAL SUMMARY
      </span>
      <span style={{ color: "rgba(139,146,172,0.55)" }}>·</span>
      {symbols.slice(0, 6).map(({ symbol, slot }) => {
        const isActive = symbol === activeSymbol;
        const d = slot.stats.delta;
        const dColor = d > 0 ? "#00C076" : d < 0 ? "#FF4D6A" : "#8B92AC";
        return (
          <button
            key={symbol}
            type="button"
            onClick={() => { if (!isActive) setActiveSymbol(symbol); }}
            aria-label={`Switch chart to ${symbol}`}
            style={{
              display: "inline-flex", gap: 5, alignItems: "center",
              color: isActive ? "#D8DCEA" : "#8B92AC",
              padding: "1px 7px", borderRadius: 999,
              background: isActive ? "rgba(240,180,41,0.10)" : "transparent",
              border: isActive ? "1px solid rgba(240,180,41,0.30)" : "1px solid transparent",
              cursor: isActive ? "default" : "pointer",
              font: "inherit", letterSpacing: "inherit",
            }}
            title={`${isActive ? "Currently active" : "Click to switch chart"} — ${symbol}: ${slot.stats.tradeCount.toLocaleString()} trades observed. Δ ${fmt(d)}. Big ${slot.stats.bigTradeCount}. ${slot.horizon ? fmtMemoryAge(slot.horizon.startedAtSec) : "no horizon yet"}.`}
          >
            <span style={{ fontWeight: 850, letterSpacing: "0.03em" }}>{symbol}</span>
            <span style={{ color: dColor, fontWeight: 800 }}>{d > 0 ? "+" : ""}{fmt(d)}</span>
            <span style={{ color: "rgba(139,146,172,0.75)" }}>{slot.stats.tradeCount.toLocaleString()}</span>
          </button>
        );
      })}
      {symbols.length > 6 && (
        <span style={{ color: "rgba(139,146,172,0.6)" }}>+{symbols.length - 6}</span>
      )}
    </div>
  );
}
