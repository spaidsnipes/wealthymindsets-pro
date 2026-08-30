"use client";
import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BarChart3 } from "lucide-react";
import {
  getKnownSessionSymbols,
  subscribeSessionSymbolStore,
  clearSessionSymbol,
} from "@/lib/marketData/sessionSymbolStore";
import {
  findSessionNectarChannel,
  getSessionNectarSnapshot,
  subscribeToSessionNectar,
} from "@/lib/marketData/sessionNectar";
import type { MarketChannelCoverage } from "@/lib/marketData/coverageMap";
import { useActiveSymbol } from "@/contexts/SymbolContext";
import { WmWordmark } from "@/components/brand/WmWordmark";
import { SectionBanner } from "@/components/brand/SectionBanner";
import { Panel } from "@/components/ui/Panel";
import { WM } from "@/lib/design/wmTokens";
import {
  fmtNum,
  formatMemoryAge,
  fidelityToTone,
  coverageTone,
  relTime,
} from "@/lib/nectarFormat";
// Shift-Z Z1: Market Canvas — third canonical consumer of composeMarketCanvasVM
// (after /command-deck and /journal detail). Closes STOP-THE-LINE integration
// gap: canvas VM was computing for this symbol but had no visible consumer on
// the per-symbol memory deep-dive.
import { useMarketCanvasVM } from "@/lib/marketData/viewModels/useMarketCanvasVM";
import { canonicalMarketStateIdentity } from "@/lib/marketData/canonicalIdentity";
import MarketCanvasPanel from "@/components/experience/MarketCanvasPanel";
import CanvasSummaryPill from "@/components/experience/CanvasSummaryPill";

/**
 * /nectar/[symbol] — per-symbol memory deep-dive.
 *
 * A trader clicks a symbol on the /nectar Vault index and lands here
 * to see the full retained memory for that symbol:
 *   · Header wordmark + memory-age hero
 *   · Cumulative Δ + buy/sell volume + trade counts
 *   · Large CVD trajectory
 *   · Trade-channel fidelity + gap receipts (from sessionNectar)
 *   · Retention truth restated (tier + honest bounds)
 *
 * TRUTH RULES — same as parent /nectar:
 *   No fabrication. If a symbol is unknown to the store, the page
 *   shows an honest empty state. UNKNOWN stays UNKNOWN.
 */
export default function NectarSymbolDetailPage() {
  const router = useRouter();
  const params = useParams();
  const raw = Array.isArray(params?.symbol) ? params.symbol[0] : (params?.symbol as string | undefined);
  const symbol = (raw ?? "").toUpperCase();

  // SSR-safe mount gate — both stores hydrate from localStorage on
  // the client. SSR sees them empty, client sees them populated →
  // React #418 hydration mismatch. Gate on `mounted` so both trees
  // start with the empty-symbol shell and swap to real data after
  // mount.
  const [mounted, setMounted] = React.useState(false);
  const [, setTick] = React.useState(0);
  React.useEffect(() => { setMounted(true); }, []);
  React.useEffect(() => subscribeSessionSymbolStore(() => setTick(t => t + 1)), []);
  React.useEffect(() => subscribeToSessionNectar(() => setTick(t => t + 1)), []);
  React.useEffect(() => {
    const h = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(h);
  }, []);

  const { setActiveSymbol } = useActiveSymbol();
  const openOnChart = React.useCallback(() => {
    setActiveSymbol(symbol);
    router.push("/charts");
  }, [router, setActiveSymbol, symbol]);

  // Shift-Z Z1: Market Canvas VM — third canonical consumer of the shared
  // composeMarketCanvasVM compiler. Identity is built from route symbol +
  // default 15m timeframe (matches /command-deck + /journal detail). No
  // owner binding — Canvas display is symbol-scoped, not owner-scoped.
  // Silent-safe: returns an empty VM when store has no snapshot for this
  // identity (canon §Silence Is A Feature — undefined ≠ unavailable).
  const nectarCanvasIdentity = React.useMemo(() => {
    if (!symbol) return null;
    try {
      return canonicalMarketStateIdentity({ symbol, timeframe: "15" });
    } catch {
      // Unknown symbol shape (option OCC, non-canonical futures) — no-op.
      return null;
    }
  }, [symbol]);
  const nectarCanvas = useMarketCanvasVM({
    identity: nectarCanvasIdentity,
    ownerId: null,
  });

  // Try to find any slot for this symbol regardless of tape source.
  // Prefer the slot with the highest trade count.
  const matched = mounted
    ? getKnownSessionSymbols()
        .filter(s => s.symbol.toUpperCase() === symbol)
        .sort((a, b) => b.slot.stats.tradeCount - a.slot.stats.tradeCount)
    : [];

  const nectar = mounted ? getSessionNectarSnapshot() : null;
  const tradeChannel = nectar ? findSessionNectarChannel(nectar, symbol, "trade") : null;
  const allChannelsForSymbol = nectar
    ? nectar.channels.filter(ch =>
        (ch.normalizedSymbol?.toUpperCase() === symbol) ||
        (ch.instrumentId.toUpperCase() === symbol),
      )
    : [];

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: `radial-gradient(1200px 800px at 50% -10%, rgba(212,175,55,0.06), transparent 60%), ${WM.surface.deepest}`,
        color: WM.text.body,
        paddingBottom: 48,
      }}
    >
      <SymbolHeader symbol={symbol} />

      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "20px clamp(16px, 4vw, 40px) 0",
          display: "grid",
          gap: 24,
        }}
      >
        {matched.length === 0 ? (
          <UnobservedState symbol={symbol} onOpen={openOnChart} />
        ) : (
          <>
            {matched.map(({ slot, tapeSource }, idx) => (
              <SlotPanels
                key={`${symbol}::${tapeSource}::${idx}`}
                symbol={symbol}
                tapeSource={tapeSource}
                slot={slot}
                fidelity={idx === 0 ? tradeChannel?.fidelity ?? null : null}
                gapCount={idx === 0 ? tradeChannel?.gapCount ?? 0 : 0}
                onOpen={openOnChart}
              />
            ))}

            {/* Shift-Z Z1: Market Canvas — current market reality for this
                symbol per canonicalMarketState. Silent-safe: renders only when
                the canvas has an actual snapshot / blockers / clearances. */}
            {(nectarCanvas.canvas.hasSnapshot ||
              nectarCanvas.canvas.blockers.length > 0 ||
              nectarCanvas.canvas.clearances.length > 0) && (
              <>
                <SectionBanner
                  number="3"
                  label={`MARKET CANVAS · ${symbol} NOW`}
                  tagline="Current 15m reality — MISSING / RESOLVED / WHY NOT / CLEARED / WOULD INVALIDATE — from the shared compiler."
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: -8 }}>
                  <CanvasSummaryPill
                    vm={nectarCanvas.canvas}
                    ariaLabel={`Current market canvas summary for ${symbol}`}
                  />
                </div>
                <MarketCanvasPanel vm={nectarCanvas.canvas} />
              </>
            )}

            {/* Coverage receipts — audit surface for every channel the
                Nectar collector has any evidence of for this symbol.
                Renders nothing when the collector has no channels yet. */}
            {allChannelsForSymbol.length > 0 && (
              <CoverageReceipts channels={allChannelsForSymbol} />
            )}
          </>
        )}
      </div>
    </main>
  );
}

/* ── Header ─────────────────────────────────────────────── */

function SymbolHeader({ symbol }: { symbol: string }) {
  return (
    <header
      style={{
        borderBottom: `1px solid ${WM.border.hair}`,
        background: `linear-gradient(180deg, ${WM.surface.deep} 0%, rgba(11,11,13,0.6) 100%)`,
        padding: "14px clamp(16px, 4vw, 40px)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link
          href="/nectar"
          aria-label="Back to Market Evidence"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: WM.text.muted, fontSize: 11, letterSpacing: 0.2,
            padding: "6px 10px", borderRadius: 8,
            minHeight: 44,
            border: `1px solid ${WM.border.hair}`,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={12} /> EVIDENCE
        </Link>
        <WmWordmark size="compact" />
      </div>
      <div
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 12, letterSpacing: 0.32, textTransform: "uppercase",
          color: WM.gold.line,
        }}
      >
        {symbol || "UNKNOWN"}
      </div>
    </header>
  );
}

/* ── Slot panels ────────────────────────────────────────── */

function SlotPanels({
  symbol, tapeSource, slot, fidelity, gapCount, onOpen,
}: {
  symbol: string;
  tapeSource: string;
  slot: ReturnType<typeof getKnownSessionSymbols>[number]["slot"];
  fidelity: string | null;
  gapCount: number;
  onOpen: () => void;
}) {
  const d = slot.stats.delta;
  const tone = d > 0 ? WM.state.ok : d < 0 ? WM.state.warn : WM.text.muted;
  const memoryAge = slot.horizon ? formatMemoryAge(slot.horizon.startedAtSec) : "no horizon yet";

  return (
    <>
      {/* Hero */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "end",
          gap: 24,
          paddingTop: 4,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(32px, 6vw, 56px)",
              lineHeight: 1.02,
              color: WM.text.hero,
              letterSpacing: -0.6,
            }}
          >
            {symbol}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, letterSpacing: 0.32, color: WM.text.muted, textTransform: "uppercase" }}>
            {tapeSource.toUpperCase()} · {memoryAge}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onOpen}
            style={{
              padding: "9px 14px", borderRadius: 8,
              minHeight: 44,
              border: `1px solid ${WM.border.strong}`,
              background: `linear-gradient(180deg, rgba(212,175,55,0.16), rgba(212,175,55,0.06))`,
              color: WM.gold.hero,
              fontSize: 10, letterSpacing: 0.32, textTransform: "uppercase", fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <BarChart3 size={12} /> Open on chart
          </button>
          <ClearSlotButton symbol={symbol} tapeSource={tapeSource} />
        </div>
      </div>

      {/* Big CVD */}
      <Panel label="CUMULATIVE Δ · CVD" sublabel="Rolling ring buffer over recent accepted samples. Not persisted.">
        <BigCvd buffer={slot.cvdSpark} tone={tone} />
      </Panel>

      {/* Stat grid */}
      <SectionBanner number="1" label="OBSERVED THIS SESSION" tagline="Real trades WM's tape guard accepted for this symbol." />
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
        }}
      >
        <Metric label="Δ CUMULATIVE" value={fmtNum(d)} color={tone} />
        <Metric label="BUY VOL" value={fmtNum(slot.stats.buyVol)} />
        <Metric label="SELL VOL" value={fmtNum(slot.stats.sellVol)} />
        <Metric label="TRADES" value={slot.stats.tradeCount.toLocaleString()} />
        <Metric label="BIG TRADES" value={slot.stats.bigTradeCount.toLocaleString()} />
      </div>

      {/* Coverage / fidelity truth */}
      <SectionBanner number="2" label="TRADE CHANNEL COVERAGE" tagline="From recorded per-channel evidence." />
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
        }}
      >
        <TruthPanel label="FIDELITY CLASS" value={fidelity ?? "UNKNOWN"} tone={fidelityToTone(fidelity)} />
        <TruthPanel
          label="COVERAGE GAPS"
          value={gapCount > 0 ? `${gapCount} recorded` : "None recorded"}
          tone={gapCount > 0 ? WM.state.warn : WM.state.ok}
        />
        <TruthPanel
          label="RETENTION"
          value="Summary local"
          tone={WM.state.ok}
          body="Δ, volumes, trade counts, horizon, CVD ring. localStorage-backed. Raw prints not retained."
        />
      </div>
    </>
  );
}

/* ── Clear-browser-stats button — bounded truthful scope ── */

function ClearSlotButton({ symbol, tapeSource }: { symbol: string; tapeSource: string }) {
  const [confirming, setConfirming] = React.useState(false);
  const [receipt, setReceipt] = React.useState<{ persistence: string } | null>(null);
  React.useEffect(() => {
    if (!confirming) return;
    const h = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(h);
  }, [confirming]);
  React.useEffect(() => {
    if (!receipt) return;
    const h = setTimeout(() => setReceipt(null), 5000);
    return () => clearTimeout(h);
  }, [receipt]);

  if (receipt) {
    const acknowledged = receipt.persistence === "ACKNOWLEDGED";
    const tone = acknowledged ? WM.state.ok : WM.state.warn;
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "10px 14px", borderRadius: 8,
          border: `1px solid ${tone}66`,
          background: `${tone}14`,
          color: tone,
          fontSize: 10, letterSpacing: 0.32, fontWeight: 800, textTransform: "uppercase",
          maxWidth: 360,
        }}
      >
        {acknowledged
          ? `${symbol} browser stats cleared · reload will show them gone`
          : `${symbol} in-memory cleared · persistence ${receipt.persistence.toLowerCase().replace("_", " ")} — reload may still show them`}
      </div>
    );
  }

  if (confirming) {
    return (
      <div style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {/* Truthful confirmation per Sentinel RETURN — names the exact
            scope, not "session memory" which overstates to include
            Nectar / coverage / server data. */}
        <span
          style={{
            fontSize: 10, letterSpacing: 0.24, color: WM.text.muted,
            padding: "0 6px", maxWidth: 320,
          }}
        >
          Delete {symbol}&apos;s browser-local session stats?
          Does not clear channel-coverage receipts or server data.
        </span>
        <button
          type="button"
          onClick={() => {
            const result = clearSessionSymbol(symbol, tapeSource);
            setConfirming(false);
            setReceipt({ persistence: result.persistence });
          }}
          style={{
            minHeight: 44, minWidth: 44,
            padding: "12px 14px", borderRadius: 8,
            border: `1px solid ${WM.state.warn}66`,
            background: `${WM.state.warn}14`,
            color: WM.state.warn,
            fontSize: 10, letterSpacing: 0.32, textTransform: "uppercase", fontWeight: 800,
            cursor: "pointer",
            outlineOffset: 2,
          }}
        >
          Yes, delete browser stats
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          style={{
            minHeight: 44, minWidth: 44,
            padding: "12px 14px", borderRadius: 8,
            border: `1px solid ${WM.border.line}`,
            background: "transparent",
            color: WM.text.muted,
            fontSize: 10, letterSpacing: 0.32, textTransform: "uppercase", fontWeight: 800,
            cursor: "pointer",
            outlineOffset: 2,
          }}
        >
          Cancel
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={`Clear ${symbol}'s browser-local session stats. Does not clear channel-coverage receipts or server-side data.`}
      title={
        `Deletes only ${symbol}'s browser-local session summary stats ` +
        `(Δ, buy/sell vol, trade count, big-trade count, horizon, CVD samples).\n\n` +
        `Does NOT clear:\n` +
        `  · channel-coverage receipts for ${symbol}\n` +
        `  · coverage-continuity records\n` +
        `  · any server-side coverage or acknowledgement\n` +
        `  · raw executed prints (WM does not store them today)`
      }
      style={{
        minHeight: 44, minWidth: 44,
        padding: "12px 14px", borderRadius: 8,
        border: `1px solid ${WM.border.line}`,
        background: "transparent",
        color: WM.text.muted,
        fontSize: 10, letterSpacing: 0.32, textTransform: "uppercase", fontWeight: 800,
        cursor: "pointer",
        outlineOffset: 2,
      }}
    >
      Clear browser stats
    </button>
  );
}

/* ── Coverage receipts ──────────────────────────────────── */

function CoverageReceipts({ channels }: { channels: readonly MarketChannelCoverage[] }) {
  return (
    <>
      <SectionBanner
        number="4"
        label="COVERAGE RECEIPTS"
        tagline="Recorded channel health for this symbol. Operational receipts only — no raw payloads retained."
      />
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
        }}
      >
        {channels.map((ch, i) => (
          <Panel key={`${ch.instrumentId}::${ch.channel}::${ch.providerPath}::${i}`} label={ch.channel.toUpperCase()}>
            <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
              <ReceiptRow label="Coverage state" value={ch.coverageState} tone={coverageTone(ch.coverageState)} />
              <ReceiptRow label="Fidelity class" value={ch.fidelity} tone={fidelityToTone(ch.fidelity)} />
              <ReceiptRow label="Observed events" value={ch.observedEventCount.toLocaleString()} tone={ch.observedEventCount > 0 ? WM.state.ok : WM.text.dim} />
              <ReceiptRow label="Gaps" value={ch.gapCount > 0 ? String(ch.gapCount) : "None"} tone={ch.gapCount > 0 ? WM.state.warn : WM.state.ok} />
              <ReceiptRow label="Last event" value={ch.lastEventAt ? relTime(ch.lastEventAt) : "—"} />
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}

function ReceiptRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 11 }}>
      <span style={{ color: WM.text.muted, letterSpacing: 0.16 }}>{label}</span>
      <span
        style={{
          color: tone ?? WM.text.hero,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: 0.06,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Unobserved state ───────────────────────────────────── */

function UnobservedState({ symbol, onOpen }: { symbol: string; onOpen: () => void }) {
  return (
    <div
      style={{
        marginTop: 24,
        padding: "48px 24px",
        border: `1px dashed ${WM.border.line}`,
        borderRadius: 14,
        textAlign: "center",
        color: WM.text.muted,
      }}
    >
      <div
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(28px, 5vw, 40px)",
          color: WM.text.hero,
          letterSpacing: -0.4,
        }}
      >
        {symbol}
      </div>
      <div style={{ marginTop: 12, fontSize: 12 }}>
        WM has not observed any real trades for this symbol in the current tab.
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: WM.text.dim }}>
        Open it on the chart and let market observations arrive — this page will populate as observation begins.
      </div>
      <div style={{ marginTop: 18, display: "inline-flex", gap: 8 }}>
        <button
          onClick={onOpen}
          style={{
            padding: "9px 14px", borderRadius: 8,
            minHeight: 44,
            border: `1px solid ${WM.border.strong}`,
            background: `linear-gradient(180deg, rgba(212,175,55,0.16), rgba(212,175,55,0.06))`,
            color: WM.gold.hero,
            fontSize: 10, letterSpacing: 0.32, textTransform: "uppercase", fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Open {symbol} on chart →
        </button>
        <Link
          href="/nectar"
          style={{
            padding: "9px 14px", borderRadius: 8,
            border: `1px solid ${WM.border.line}`,
            color: WM.text.muted,
            fontSize: 10, letterSpacing: 0.32, textTransform: "uppercase", fontWeight: 800,
            textDecoration: "none",
            display: "inline-flex", alignItems: "center",
            minHeight: 44,
          }}
        >
          Back to Market Evidence
        </Link>
      </div>
    </div>
  );
}

/* ── Primitives (page-local, wmTokens-styled) ───────────── */

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Panel label={label}>
      <div
        style={{
          fontVariantNumeric: "tabular-nums",
          fontSize: 26,
          fontWeight: 700,
          color: color ?? WM.text.hero,
          letterSpacing: -0.2,
          lineHeight: 1.05,
        }}
      >
        {value}
      </div>
    </Panel>
  );
}

function TruthPanel({ label, value, tone, body }: { label: string; value: string; tone: string; body?: string }) {
  return (
    <Panel label={label}>
      <div
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "3px 8px", borderRadius: 999,
          border: `1px solid ${tone}55`,
          background: `${tone}14`,
          color: tone,
          fontSize: 10, letterSpacing: 0.32, fontWeight: 800, textTransform: "uppercase",
        }}
      >
        <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: tone }} />
        {value}
      </div>
      {body && (
        <div style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.55, color: WM.text.body }}>
          {body}
        </div>
      )}
    </Panel>
  );
}

function BigCvd({ buffer, tone }: { buffer: number[]; tone: string }) {
  if (buffer.length < 2) {
    return (
      <div
        style={{
          height: 96, display: "flex", alignItems: "center", justifyContent: "center",
          color: WM.text.dim, fontSize: 11, letterSpacing: 0.2,
        }}
      >
        Awaiting more observations to draw the trajectory…
      </div>
    );
  }
  const W = 800, H = 96;
  const min = Math.min(...buffer);
  const max = Math.max(...buffer);
  const range = max - min || 1;
  const step = W / (buffer.length - 1);
  const pts = buffer.map((v, i) => `${(i * step).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`).join(" ");
  const zeroY = min <= 0 && max >= 0 ? (H - ((0 - min) / range) * H) : null;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" style={{ display: "block", marginTop: 4 }}>
      {zeroY !== null && (
        <line x1={0} x2={W} y1={zeroY} y2={zeroY} stroke="rgba(139,106,41,0.35)" strokeDasharray="3 3" strokeWidth={0.5} />
      )}
      <polyline fill="none" stroke={tone} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

/* ── Helpers ────────────────────────────────────────────── */
// fmtNum, formatMemoryAge, fidelityToTone, coverageTone, memoryStateTone,
// persistenceRightTone, and relTime live in @/lib/nectarFormat and are
// unit-tested in nectarFormat.test.ts.
