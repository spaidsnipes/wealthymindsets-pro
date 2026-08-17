"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getKnownSessionSymbols,
  subscribeSessionSymbolStore,
  type SessionSymbolSlot,
} from "@/lib/marketData/sessionSymbolStore";
import {
  findSessionNectarChannel,
  getSessionNectarSnapshot,
  subscribeToSessionNectar,
} from "@/lib/marketData/sessionNectar";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { WmWordmark } from "@/components/brand/WmWordmark";
import { SectionBanner } from "@/components/brand/SectionBanner";
import { Panel } from "@/components/ui/Panel";
import { WM } from "@/lib/design/wmTokens";

/**
 * /nectar — the WM Nectar Vault.
 *
 * Founder Aug-14: "i have a grip of data that needs to be saved i dont
 * want it to go anywhere and im trying to switch to tsla also". This is
 * the flagship visible-proof surface: every symbol WM has observed this
 * tab, with its own horizon, running Δ, trade count, big-trade count,
 * and a rolling CVD trajectory.
 *
 * TRUTH RULES:
 *  - Nothing is fabricated. Empty state stays empty.
 *  - Retention tier is stated plainly: session summary in localStorage.
 *    Raw executed prints are NOT durably stored. Server-durable history
 *    is NOT YET IMPLEMENTED. We say so.
 *  - Coverage/fidelity labels use only real values.
 *
 * DESIGN: deep obsidian, warm gold. Uses wmTokens + Panel + SectionBanner
 * so this page belongs to the same visual world as /command-deck.
 */
export default function NectarVaultPage() {
  const [, setTick] = React.useState(0);
  React.useEffect(() => subscribeSessionSymbolStore(() => setTick(t => t + 1)), []);
  React.useEffect(() => subscribeToSessionNectar(() => setTick(t => t + 1)), []);
  React.useEffect(() => {
    // Age labels drift once per second; re-render at that cadence so
    // "3m memory" becomes "4m memory" without polling every ref.
    const h = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(h);
  }, []);
  const { setActiveSymbol, activeSymbol } = useActiveSymbol();

  const known = getKnownSessionSymbols()
    .filter(s => s.slot.stats.tradeCount > 0)
    .sort((a, b) => b.slot.stats.tradeCount - a.slot.stats.tradeCount);

  const nectar = getSessionNectarSnapshot();

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: `radial-gradient(1200px 800px at 50% -10%, rgba(212,175,55,0.06), transparent 60%), ${WM.surface.deepest}`,
        color: WM.text.body,
        paddingBottom: 48,
      }}
    >
      <VaultHeader />

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "24px clamp(16px, 4vw, 40px) 0",
          display: "grid",
          gap: 28,
        }}
      >
        <VaultHero symbolCount={known.length} tradeTotal={known.reduce((a, s) => a + s.slot.stats.tradeCount, 0)} />

        <section aria-labelledby="vault-symbols">
          <SectionBanner
            number="1"
            label="OBSERVED SYMBOLS"
            tagline={known.length === 0 ? "No trades observed yet this session." : `${known.length} symbol${known.length === 1 ? "" : "s"} with retained tape memory.`}
          />
          {known.length === 0 ? (
            <EmptyVault />
          ) : (
            <div
              style={{
                marginTop: 20,
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
              }}
            >
              {known.map(({ symbol, tapeSource, slot }) => {
                const tradeChannel = findSessionNectarChannel(nectar, symbol, "trade");
                return (
                  <SymbolCard
                    key={`${symbol}::${tapeSource}`}
                    symbol={symbol}
                    tapeSource={tapeSource}
                    slot={slot}
                    isActive={symbol === activeSymbol}
                    fidelity={tradeChannel?.fidelity ?? null}
                    gapCount={tradeChannel?.gapCount ?? 0}
                    onOpen={() => { setActiveSymbol(symbol); }}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section aria-labelledby="vault-retention" style={{ marginTop: 8 }}>
          <SectionBanner
            number="2"
            label="RETENTION TRUTH"
            tagline="What is actually persisted, where, and for how long."
          />
          <div
            style={{
              marginTop: 20,
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
            }}
          >
            <RetentionTier
              tier="0 · SESSION"
              status="ACTIVE"
              tone="ok"
              body="In-memory per-symbol stats — Δ, buy/sell volume, trade count, big-trade count, tape horizon. Always active while the tab is open."
            />
            <RetentionTier
              tier="1 · BROWSER SUMMARY"
              status="ACTIVE"
              tone="ok"
              body="Same summary saved to localStorage. Survives refresh, symbol switch, and tab restart. Bounded to 32 slots, 7 days."
            />
            <RetentionTier
              tier="2 · SERVER SUMMARY"
              status="NOT IMPLEMENTED"
              tone="unknown"
              body="Cross-device durable per-symbol summary. Not yet built. Nothing here is transmitted or stored server-side today."
            />
            <RetentionTier
              tier="3 · DURABLE RAW HISTORY"
              status="RIGHTS UNKNOWN"
              tone="warn"
              body="Per-trade executed-print retention. Fails closed until provider legal review records raw persistence rights per capability registry."
            />
          </div>
        </section>

        <FooterNote />
      </div>
    </main>
  );
}

/* ── Header ─────────────────────────────────────────────── */

function VaultHeader() {
  return (
    <header
      style={{
        borderBottom: `1px solid ${WM.border.hair}`,
        background: `linear-gradient(180deg, ${WM.surface.deep} 0%, rgba(11,11,13,0.6) 100%)`,
        padding: "14px clamp(16px, 4vw, 40px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link
          href="/command-deck"
          aria-label="Back to Command Deck"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: WM.text.muted, fontSize: 11, letterSpacing: 0.2,
            padding: "6px 10px", borderRadius: 8,
            border: `1px solid ${WM.border.hair}`,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={12} /> COMMAND DECK
        </Link>
        <WmWordmark size="compact" />
      </div>
      <div
        style={{
          fontSize: 10, letterSpacing: 0.32,
          color: WM.gold.line, textTransform: "uppercase",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        Nectar Vault
      </div>
    </header>
  );
}

/* ── Hero ───────────────────────────────────────────────── */

function VaultHero({ symbolCount, tradeTotal }: { symbolCount: number; tradeTotal: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "end",
        gap: 24,
        paddingTop: 8,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(28px, 5vw, 44px)",
            lineHeight: 1.05,
            color: WM.text.hero,
            letterSpacing: -0.4,
          }}
        >
          What <span style={{ color: WM.gold.hero }}>WM has observed</span>.
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            lineHeight: 1.6,
            color: WM.text.muted,
            maxWidth: 640,
          }}
        >
          Session-only, per-symbol memory. Every real trade WM sees enters this Vault
          under the symbol it happened on. Switching symbols does not erase prior symbols.
          Nothing here is fabricated — if a symbol is missing, WM never observed it in this tab.
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridAutoFlow: "column",
          gap: 24,
          alignItems: "end",
        }}
      >
        <VaultMetric label="SYMBOLS" value={symbolCount} />
        <VaultMetric label="TRADES OBSERVED" value={tradeTotal} />
      </div>
    </div>
  );
}

function VaultMetric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: "right", minWidth: 80 }}>
      <div
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(28px, 4vw, 40px)",
          color: value > 0 ? WM.gold.hero : WM.text.dim,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {value.toLocaleString()}
      </div>
      <div
        style={{
          marginTop: 6, fontSize: 9, letterSpacing: 0.32,
          color: WM.text.muted, textTransform: "uppercase", fontWeight: 700,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ── Symbol Card ────────────────────────────────────────── */

interface SymbolCardProps {
  symbol: string;
  tapeSource: string;
  slot: SessionSymbolSlot;
  isActive: boolean;
  fidelity: string | null;
  gapCount: number;
  onOpen: () => void;
}

function SymbolCard({ symbol, tapeSource, slot, isActive, fidelity, gapCount, onOpen }: SymbolCardProps) {
  const d = slot.stats.delta;
  const deltaTone = d > 0 ? WM.state.ok : d < 0 ? WM.state.warn : WM.text.muted;
  const memoryAge = slot.horizon ? formatMemoryAge(slot.horizon.startedAtSec) : "no horizon yet";
  const fidelityTone = fidelityToTone(fidelity);
  return (
    <Panel
      label={`${symbol} · ${tapeSource.toUpperCase()}`}
      halo={isActive}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 32,
            lineHeight: 1,
            color: WM.text.hero,
            letterSpacing: -0.3,
          }}
        >
          {symbol}
        </div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: 0.24,
            textTransform: "uppercase",
            color: WM.text.muted,
          }}
        >
          {memoryAge}
        </div>
      </div>

      {/* Fidelity + gap truth for this symbol's trade channel. UNKNOWN
          stays UNKNOWN — never fabricated. */}
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <FidelityChip fidelity={fidelity} tone={fidelityTone} />
        {gapCount > 0 && (
          <span
            title={`${gapCount} coverage gap${gapCount === 1 ? "" : "s"} detected on this symbol's trade channel this session`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 7px", borderRadius: 999,
              border: `1px solid ${WM.state.warn}55`,
              background: `${WM.state.warn}14`,
              color: WM.state.warn,
              fontSize: 9, letterSpacing: 0.32, fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            ! GAPS {gapCount}
          </span>
        )}
      </div>

      {/* CVD sparkline (real rolling samples, no fake data) */}
      <div style={{ marginTop: 12 }}>
        <CvdSpark buffer={slot.cvdSpark} tone={deltaTone} />
      </div>

      {/* Metric grid — responsive auto-wrap */}
      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))",
          gap: 10,
        }}
      >
        <StatCell label="Δ" value={fmtNum(d)} color={deltaTone} />
        <StatCell label="TRADES" value={slot.stats.tradeCount.toLocaleString()} />
        <StatCell label="BIG" value={slot.stats.bigTradeCount.toLocaleString()} />
      </div>

      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${symbol} on the chart`}
        style={{
          marginTop: 14,
          width: "100%",
          padding: "9px 14px",
          borderRadius: 8,
          border: `1px solid ${isActive ? WM.border.strong : WM.border.line}`,
          background: isActive ? `linear-gradient(180deg, rgba(212,175,55,0.14), rgba(212,175,55,0.06))` : "transparent",
          color: isActive ? WM.gold.hero : WM.text.body,
          fontSize: 10,
          letterSpacing: 0.32,
          textTransform: "uppercase",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        {isActive ? "Active on chart" : "Open on chart →"}
      </button>
    </Panel>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 9, letterSpacing: 0.32, textTransform: "uppercase",
          color: WM.text.muted, fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 3,
          fontVariantNumeric: "tabular-nums",
          fontSize: 15, fontWeight: 700,
          color: color ?? WM.text.hero,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ── Fidelity chip ──────────────────────────────────────── */

function FidelityChip({ fidelity, tone }: { fidelity: string | null; tone: string }) {
  const label = fidelity ?? "UNKNOWN";
  return (
    <span
      title={
        fidelity
          ? `Trade-channel fidelity class for this symbol: ${fidelity}. Reflects Nectar collector's observed classification quality this session.`
          : "No trade-channel fidelity has been recorded yet — either no trades observed for this symbol, or Nectar has not classified any."
      }
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", borderRadius: 999,
        border: `1px solid ${tone}55`,
        background: `${tone}12`,
        color: tone,
        fontSize: 9, letterSpacing: 0.32, fontWeight: 800,
        textTransform: "uppercase",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: tone }} />
      {label}
    </span>
  );
}

function fidelityToTone(fidelity: string | null): string {
  if (!fidelity) return WM.text.dim;
  const upper = fidelity.toUpperCase();
  if (upper.includes("OBSERVED") || upper.includes("LIVE") || upper.includes("FULL")) return WM.state.ok;
  if (upper.includes("DERIVED") || upper.includes("PARTIAL")) return WM.state.watch;
  if (upper.includes("INFERRED") || upper.includes("STALE") || upper.includes("UNAVAILABLE")) return WM.state.warn;
  return WM.text.muted;
}

/* ── CVD Sparkline ──────────────────────────────────────── */

function CvdSpark({ buffer, tone }: { buffer: number[]; tone: string }) {
  if (buffer.length < 2) {
    return (
      <div
        style={{
          height: 28, display: "flex", alignItems: "center",
          color: WM.text.dim, fontSize: 10, letterSpacing: 0.2,
          borderTop: `1px dashed ${WM.border.hair}`, paddingTop: 8,
        }}
      >
        Awaiting more observations…
      </div>
    );
  }
  const W = 260, H = 28;
  const min = Math.min(...buffer);
  const max = Math.max(...buffer);
  const range = max - min || 1;
  const step = W / (buffer.length - 1);
  const pts = buffer.map((v, i) => `${(i * step).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`).join(" ");
  const zeroY = min <= 0 && max >= 0 ? (H - ((0 - min) / range) * H) : null;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" style={{ display: "block" }}>
      {zeroY !== null && (
        <line x1={0} x2={W} y1={zeroY} y2={zeroY} stroke={WM.border.hair.replace(/[\d.]+\)$/, "0.5)")} strokeDasharray="2 2" strokeWidth={0.5} />
      )}
      <polyline fill="none" stroke={tone} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

/* ── Retention Tier Card ────────────────────────────────── */

function RetentionTier({
  tier, status, tone, body,
}: {
  tier: string;
  status: string;
  tone: "ok" | "watch" | "warn" | "unknown" | "neutral";
  body: string;
}) {
  const color = WM.state[tone];
  return (
    <Panel label={tier}>
      <div
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "3px 8px", borderRadius: 999,
          border: `1px solid ${color}44`,
          background: `${color}14`,
          color,
          fontSize: 9, letterSpacing: 0.32, fontWeight: 800,
          textTransform: "uppercase",
        }}
      >
        <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
        {status}
      </div>
      <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.55, color: WM.text.body }}>
        {body}
      </div>
    </Panel>
  );
}

/* ── Empty state ────────────────────────────────────────── */

function EmptyVault() {
  return (
    <div
      style={{
        marginTop: 20,
        padding: "36px 24px",
        border: `1px dashed ${WM.border.line}`,
        borderRadius: 14,
        textAlign: "center",
        color: WM.text.muted,
      }}
    >
      <div style={{ color: WM.text.body, fontSize: 14, marginBottom: 6 }}>
        The Vault is empty — for now.
      </div>
      <div style={{ fontSize: 11, letterSpacing: 0.16 }}>
        Open a chart, let real trades stream in, and each symbol will appear here with its own retained memory.
      </div>
      <div style={{ marginTop: 18 }}>
        <Link
          href="/charts"
          style={{
            display: "inline-block",
            padding: "8px 14px",
            border: `1px solid ${WM.border.strong}`,
            borderRadius: 8,
            color: WM.gold.hero,
            fontSize: 10, letterSpacing: 0.32, textTransform: "uppercase", fontWeight: 800,
            textDecoration: "none",
          }}
        >
          Open Charts →
        </Link>
      </div>
    </div>
  );
}

/* ── Footer ─────────────────────────────────────────────── */

function FooterNote() {
  return (
    <div
      style={{
        marginTop: 12,
        padding: "14px 16px",
        borderTop: `1px solid ${WM.border.hair}`,
        color: WM.text.dim,
        fontSize: 10, letterSpacing: 0.24, lineHeight: 1.6,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      Nectar remembers what WM observed. Coverage remembers what WM missed.
      The Vault will never tell you WM knows something it does not.
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────── */

function fmtNum(n: number): string {
  const abs = Math.abs(n);
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(2)}K`;
  return `${sign}${abs.toFixed(2)}`;
}

function formatMemoryAge(startedAtSec: number): string {
  const secs = Math.max(0, Math.floor(Date.now() / 1000 - startedAtSec));
  if (secs < 60) return `${secs}s memory`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m memory`;
  const hrs = Math.floor(mins / 60);
  const remMin = mins % 60;
  if (hrs < 24) return remMin ? `${hrs}h ${remMin}m memory` : `${hrs}h memory`;
  const days = Math.floor(hrs / 24);
  return `${days}d memory`;
}
