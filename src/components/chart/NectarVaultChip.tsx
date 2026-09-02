"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
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
  // SSR-safe mount gate — same class of hydration mismatch (React #418)
  // the HeaderVaultPill fix addressed. sessionSymbolStore hydrates from
  // localStorage on the client; SSR sees 0 symbols and returns null,
  // client sees observed symbols and renders the chip → tree shape
  // diverges. Gate on `mounted` so both SSR and initial client paint
  // agree (null), then swap in real content after mount.
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => subscribeSessionSymbolStore(() => setTick(t => t + 1)), []);
  const { setActiveSymbol } = useActiveSymbol();

  if (!mounted) return null;

  const symbols = getKnownSessionSymbols()
    .filter(s => s.slot.stats.tradeCount > 0)
    .sort((a, b) => b.slot.stats.tradeCount - a.slot.stats.tradeCount);

  // Was gated to ≥2 symbols. Founder §14 wants immediate visible proof of
  // retention — show the Vault the moment WM has observed any real trade,
  // even for a single symbol. Still hidden when nothing has been observed
  // so it never adds noise to an empty session.
  if (symbols.length === 0) return null;

  const fmt = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toFixed(2);
  };

  const nowMs = Date.now();
  const fmtMemoryAge = (startedAtSec: number): string => {
    const seconds = Math.max(0, Math.floor(nowMs / 1000 - startedAtSec));
    if (seconds < 60) return `${seconds}s observed`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m observed`;
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    if (hours < 24) return remMin ? `${hours}h ${remMin}m observed` : `${hours}h observed`;
    const days = Math.floor(hours / 24);
    return `${days}d observed`;
  };

  return (
    <details
      className="wm-nectar-vault-chip"
      style={{
        position: "absolute", top: 8, right: 8, zIndex: 57,
        pointerEvents: "auto", color: "#8B92AC", fontSize: 9.5,
        fontWeight: 700, fontVariantNumeric: "tabular-nums",
      }}
    >
      <summary
        aria-label={`Market Evidence. ${symbols.length} symbol ${symbols.length === 1 ? "summary" : "summaries"} retained in this browser. Open details.`}
        title="Open retained browser summaries"
        style={{
          minHeight: 32, padding: "0 10px", borderRadius: 8, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6, listStyle: "none",
          background: "rgba(11,14,26,0.88)", border: "1px solid rgba(139,146,172,0.18)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.24)", whiteSpace: "nowrap",
        }}
      >
        <span aria-hidden="true" style={{ color: "#00C076" }}>●</span>
        <span>Evidence saved</span>
        <span style={{ color: "#62697d" }}>· {symbols.length}</span>
      </summary>
      <div
        role="group"
        aria-label="Retained Market Evidence summaries"
        style={{
          position: "absolute", top: 38, right: 0, width: 260, maxWidth: "calc(100vw - 24px)",
          padding: 10, borderRadius: 10, background: "rgba(8,10,18,0.98)",
          border: "1px solid rgba(139,146,172,0.20)", boxShadow: "0 10px 28px rgba(0,0,0,0.48)",
          display: "flex", flexWrap: "wrap", gap: 6,
        }}
      >
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
              aria-pressed={isActive}
              style={{
                minHeight: 44, minWidth: 44, padding: "4px 8px", borderRadius: 8,
                background: isActive ? "rgba(240,180,41,0.10)" : "rgba(255,255,255,0.025)",
                border: isActive ? "1px solid rgba(240,180,41,0.30)" : "1px solid rgba(139,146,172,0.14)",
                color: isActive ? "#D8DCEA" : "#8B92AC", cursor: isActive ? "default" : "pointer",
                font: "inherit", display: "inline-flex", alignItems: "center", gap: 5,
              }}
              title={`${isActive ? "Currently active" : "Click to switch chart"} — ${symbol}: ${slot.stats.tradeCount.toLocaleString()} trades observed. Δ ${fmt(d)}. Big ${slot.stats.bigTradeCount}. ${slot.horizon ? fmtMemoryAge(slot.horizon.startedAtSec) : "no horizon yet"}.`}
            >
              <span style={{ fontWeight: 850 }}>{symbol}</span>
              <span style={{ color: dColor }}>{d > 0 ? "+" : ""}{fmt(d)}</span>
            </button>
          );
        })}
        <Link
          href="/nectar"
          aria-label="Open Market Evidence"
          title="Open Market Evidence"
          style={{
            minHeight: 44, padding: "0 9px", borderRadius: 8, display: "inline-flex", alignItems: "center",
            border: "1px solid rgba(240,180,41,0.22)", color: "#F0B429", textDecoration: "none",
          }}
        >
          View all →
        </Link>
      </div>
    </details>
  );
}
