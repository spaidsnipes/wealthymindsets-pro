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
    <div
      className="wm-nectar-vault-chip"
      role="group"
      aria-label={`Market Evidence. ${symbols.length} symbol ${symbols.length === 1 ? "summary" : "summaries"} retained in this browser.`}
      title={
        `Market Evidence — per-symbol observation summaries retained in this browser for up to 7 days (maximum 32 symbols).\n` +
        `Switching symbols or refreshing preserves these summaries within that window.\n` +
        `Raw executed prints are not retained.`
      }
      style={{
        position: "absolute", top: 104, left: "50%", transform: "translateX(-50%)",
        zIndex: 57, padding: "4px 10px", borderRadius: 999, pointerEvents: "auto",
        background: "linear-gradient(180deg, rgba(11,14,26,0.94) 0%, rgba(11,14,26,0.86) 100%)",
        border: "1px solid rgba(240,180,41,0.22)",
        boxShadow: "0 2px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(240,180,41,0.06)",
        color: "#8B92AC", fontSize: 9.5, fontWeight: 700,
        fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em",
        display: "flex", gap: 10, alignItems: "center", width: "max-content",
        maxWidth: "min(720px, calc(100vw - 16px))", boxSizing: "border-box", whiteSpace: "nowrap",
        overflowX: "auto", overflowY: "hidden", overscrollBehaviorX: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <span style={{ color: "#F0B429", fontWeight: 850, letterSpacing: "0.06em", flex: "0 0 auto" }}>EVIDENCE</span>
      {/* Persistence-tier badge — truth about WHERE this data lives, per
          Founder §14. Summary-tier only today; server/durable-history not
          yet implemented for these per-symbol stats. Never claims more. */}
      <span
        style={{
          color: "#8B92AC", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.08em",
          padding: "1px 6px", borderRadius: 999,
          background: "rgba(139,146,172,0.08)",
          border: "1px solid rgba(139,146,172,0.18)", flex: "0 0 auto",
        }}
        title={
          "Retention: browser summary. Survives refresh and symbol switching for up to 7 days (maximum 32 symbols). Raw executed prints are not retained."
        }
      >
        BROWSER SUMMARY
      </span>
      <span style={{ color: "rgba(139,146,172,0.55)", flex: "0 0 auto" }}>·</span>
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
              display: "inline-flex", gap: 5, alignItems: "center",
              color: isActive ? "#D8DCEA" : "#8B92AC",
              padding: "1px 7px", borderRadius: 999,
              minHeight: 44, minWidth: 44,
              flex: "0 0 auto", outlineOffset: 2,
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
        <span style={{ color: "rgba(139,146,172,0.6)", flex: "0 0 auto" }}>+{symbols.length - 6}</span>
      )}
      {/* Discoverable entry point into the full evidence surface.
          Kept as a tiny chip so it doesn't compete with the per-symbol
          pills — traders who want the full memory view can drill in. */}
      <Link
        href="/nectar"
        aria-label="Open Market Evidence"
        title="Open Market Evidence — every symbol WM has observed this session, with retention truth"
        style={{
          marginLeft: 2,
          padding: "1px 7px", borderRadius: 999,
          minHeight: 44, minWidth: 44,
          flex: "0 0 auto", outlineOffset: 2,
          border: "1px solid rgba(240,180,41,0.22)",
          background: "rgba(240,180,41,0.06)",
          color: "#F0B429",
          fontSize: 9, fontWeight: 850, letterSpacing: "0.10em",
          textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 3,
        }}
      >
        DETAILS →
      </Link>
    </div>
  );
}
