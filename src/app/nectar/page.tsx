"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getKnownSessionSymbols,
  subscribeSessionSymbolStore,
  clearAllSessionSymbols,
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
import { fmtNum, formatMemoryAge, fidelityToTone } from "@/lib/nectarFormat";
import { ContextRibbonContainer, ContextRibbonTile } from "@/components/command/CommandContextRibbon";
import { selectChannelCoverageHealth } from "@/lib/marketData/selectChannelCoverageHealth";

const subscribeHydration = () => () => {};
const getHydratedClientSnapshot = () => true;
const getHydratedServerSnapshot = () => false;

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
  const router = useRouter();
  // SSR-safe mount gate — sessionSymbolStore + sessionNectar both
  // hydrate from localStorage on the client. Reading them during
  // SSR (or the first client render pre-hydration) returns empty,
  // then the second render returns the observed data → React #418
  // hydration mismatch. Gate rendering on `mounted` so SSR and the
  // first client paint agree (both show the empty-state header
  // shell), then swap in real data after mount.
  const mounted = React.useSyncExternalStore(
    subscribeHydration,
    getHydratedClientSnapshot,
    getHydratedServerSnapshot,
  );
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
  const openOnChart = React.useCallback((symbol: string) => {
    setActiveSymbol(symbol);
    router.push("/charts");
  }, [router, setActiveSymbol]);

  // On SSR + pre-mount client: both trees see the same empty session
  // (no localStorage, both `mounted=false`). After mount effect fires,
  // real store data flows in via the setTick subscriptions.
  const known = mounted
    ? getKnownSessionSymbols()
        .filter(s => s.slot.stats.tradeCount > 0)
        .sort((a, b) => b.slot.stats.tradeCount - a.slot.stats.tradeCount)
    : [];
  const nectar: ReturnType<typeof getSessionNectarSnapshot> | null =
    mounted ? getSessionNectarSnapshot() : null;

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
        {(() => {
          // Vault Ribbon — the shared OS context ribbon composed with
          // Vault-specific tiles. Uses ContextRibbonTile from Command
          // Deck so the visual DNA matches; NO duplicate primitive.
          // Founder no-duplication law: one atom, many purposeful views.
          const totalTrades = known.reduce((a, s) => a + s.slot.stats.tradeCount, 0);
          const earliestSec = known.reduce<number | null>((acc, s) => {
            const ts = s.slot.horizon?.startedAtSec ?? null;
            if (ts == null) return acc;
            return acc == null || ts < acc ? ts : acc;
          }, null);
          const gaps = (nectar?.channels ?? []).reduce((a, c) => a + c.gapCount, 0);
          const coverageHealth = selectChannelCoverageHealth(nectar?.channels);
          const channelCount = nectar?.channels.length ?? 0;
          return (
            <ContextRibbonContainer ariaLabel="Market Evidence context ribbon">
              <ContextRibbonTile
                label="EVIDENCE"
                value={known.length === 0 ? "EMPTY" : `${known.length} SYMBOL${known.length === 1 ? "" : "S"}`}
                detail={known.length === 0 ? "no browser-local observations" : "with browser-retained summaries"}
                tone={known.length === 0 ? "unknown" : "resolved"}
              />
              <ContextRibbonTile
                label="TRADES OBSERVED"
                value={totalTrades === 0 ? "0" : totalTrades.toLocaleString("en-US")}
                detail={totalTrades === 0 ? "no browser-local observations" : "trades observed across symbols"}
                tone={totalTrades === 0 ? "unknown" : "resolved"}
              />
              {/* CHANNELS reads the ONE canonical coverage-health reduction.
                  Previously this tile inspected only channelCount + gapCount and
                  ignored coverageState, so six STALE channels with zero recorded
                  gaps rendered as a gold "no gaps recorded" all-clear while the
                  Session Intelligence Strip below proved STALE 6 / OBSERVING 0.
                  Both surfaces now share selectChannelCoverageHealth. */}
              <ContextRibbonTile
                label="CHANNELS"
                value={coverageHealth.total === 0 ? "NONE" : String(coverageHealth.total)}
                detail={coverageHealth.detail}
                tone={coverageHealth.tone}
              />
              <ContextRibbonTile
                label="EARLIEST"
                value={earliestSec == null ? "—" : new Date(earliestSec * 1000).toLocaleString(undefined, { month: "short", day: "numeric" }).toUpperCase()}
                detail={earliestSec == null ? "no horizon yet" : new Date(earliestSec * 1000).toLocaleString(undefined, { hour: "numeric", minute: "2-digit" }).toLowerCase()}
                tone={earliestSec == null ? "unknown" : "resolved"}
              />
              <ContextRibbonTile
                label="RETENTION"
                value="7 DAYS"
                detail="up to 32 symbol slots · browser-local"
                tone="pending"
              />
            </ContextRibbonContainer>
          );
        })()}

        <VaultHero
          symbolCount={known.length}
          tradeTotal={known.reduce((a, s) => a + s.slot.stats.tradeCount, 0)}
          // Earliest observation across every symbol slot — the true
          // "session started at" for this browser Vault. null when
          // nothing has been observed yet (empty Vault).
          earliestHorizonSec={known.reduce<number | null>((acc, s) => {
            const ts = s.slot.horizon?.startedAtSec ?? null;
            if (ts == null) return acc;
            return acc == null || ts < acc ? ts : acc;
          }, null)}
        />

        {/* Session Intelligence — aggregate coverage across every symbol
            the Nectar collector has any channel for. Truthful counters
            only. Renders even when no trades yet, so the trader can see
            "0 live channels" as a real signal, not fabricated silence. */}
        <SessionIntelligenceStrip
          channels={nectar?.channels ?? []}
          symbolCount={known.length}
        />

        <section aria-labelledby="vault-symbols">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <SectionBanner
              number="1"
              label="OBSERVED SYMBOLS"
              tagline={known.length === 0 ? "No trades observed yet this session." : `${known.length} symbol${known.length === 1 ? "" : "s"} with browser-retained summaries.`}
            />
            {known.length > 0 && (
              <div style={{ display: "inline-flex", gap: 8 }}>
                <ExportSessionButton />
                <ClearAllButton knownCount={known.length} />
              </div>
            )}
          </div>
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
                const tradeChannel = nectar ? findSessionNectarChannel(nectar, symbol, "trade") : null;
                return (
                  <SymbolCard
                    key={`${symbol}::${tapeSource}`}
                    symbol={symbol}
                    tapeSource={tapeSource}
                    slot={slot}
                    isActive={symbol === activeSymbol}
                    fidelity={tradeChannel?.fidelity ?? null}
                    gapCount={tradeChannel?.gapCount ?? 0}
                    onOpen={() => openOnChart(symbol)}
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

/* ── Export session — JSON download of every observed slot ── */

function ExportSessionButton() {
  const [busy, setBusy] = React.useState(false);
  const onDownload = () => {
    setBusy(true);
    try {
      const slots = getKnownSessionSymbols().map(({ symbol, tapeSource, slot }) => ({
        symbol,
        tapeSource,
        stats: slot.stats,
        horizon: slot.horizon,
        cvdSpark: slot.cvdSpark,
      }));
      const snapshot = getSessionNectarSnapshot();
      const payload = {
        wmNectarExport: "v1",
        exportedAtIso: new Date().toISOString(),
        retentionTier: "browser-summary",
        rawPayloadsIncluded: false,
        note: "Browser-local per-symbol summary snapshot (up to 32 slots, 7-day retention). Channel-coverage receipts and server-side coverage are separately owned and not included. Raw executed prints are not stored in WM Pro today.",
        sessionNectar: {
          schemaVersion: snapshot.schemaVersion,
          startedAt: snapshot.startedAt,
          updatedAt: snapshot.updatedAt,
          retentionState: snapshot.retentionState,
          unsupportedCapabilities: snapshot.unsupportedCapabilities,
          channels: snapshot.channels,
        },
        symbolSlots: slots,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `wm-market-evidence-session-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={busy}
      aria-label="Export session market evidence as JSON"
      title="Download observed browser-local symbol summaries and channel evidence as JSON. Server-side data and raw prints are not included."
      style={{
        minHeight: 44,
        padding: "7px 12px", borderRadius: 8,
        border: `1px solid ${WM.border.line}`,
        background: "transparent",
        color: WM.text.body,
        fontSize: 10, letterSpacing: 0.32, textTransform: "uppercase", fontWeight: 800,
        cursor: busy ? "wait" : "pointer",
        opacity: busy ? 0.6 : 1,
      }}
    >
      Export JSON
    </button>
  );
}

/* ── Clear-all-browser-stats button — bounded truthful scope ── */

type ClearReceipt = { count: number; persistence: string } | null;

function ClearAllButton({ knownCount }: { knownCount: number }) {
  const [confirming, setConfirming] = React.useState(false);
  const [receipt, setReceipt] = React.useState<ClearReceipt>(null);
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

  if (receipt) return <ClearReceiptPill receipt={receipt} />;

  if (confirming) {
    return (
      <div style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {/* Truthful confirmation copy per Sentinel RETURN. Names the
            exact scope AND the four ownership boundaries it does NOT
            touch, so the trader can't mistake this for a system-wide
            forget. */}
        <span style={{ fontSize: 10, letterSpacing: 0.24, color: WM.text.muted, maxWidth: 320 }}>
          Delete browser-local session stats for {knownCount} symbol{knownCount === 1 ? "" : "s"}?
          Does not clear channel-coverage receipts or server data.
        </span>
        <button
          type="button"
          onClick={() => {
            const result = clearAllSessionSymbols();
            setConfirming(false);
            setReceipt({ count: result.inMemoryRemoved, persistence: result.persistence });
          }}
          style={{
            minHeight: 44, minWidth: 44,
            padding: "12px 16px", borderRadius: 8,
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
            padding: "12px 16px", borderRadius: 8,
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
      aria-label="Clear all browser-local session stats across every symbol. Does not clear channel-coverage receipts or server-side data."
      title={
        "Deletes only browser-local session summary stats (Δ, volumes, " +
        "trade counts, horizons, CVD samples) for every observed symbol.\n\n" +
        "Does NOT clear:\n" +
        "  · channel-coverage receipts\n" +
        "  · coverage-continuity records\n" +
        "  · any server-side coverage or acknowledgement\n" +
        "  · raw executed prints (WM does not store them today)"
      }
      style={{
        minHeight: 44, minWidth: 44,
        padding: "12px 16px", borderRadius: 8,
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

/**
 * Post-clear status pill — renders the bounded readback receipt from
 * sessionSymbolStore so the trader sees a truthful "persisted vs not"
 * signal instead of a silent void. ACKNOWLEDGED gets gold, everything
 * else gets warn. Auto-dismisses after 5s.
 */
function ClearReceiptPill({ receipt }: { receipt: { count: number; persistence: string } }) {
  const acknowledged = receipt.persistence === "ACKNOWLEDGED";
  const tone = acknowledged ? WM.state.ok : WM.state.warn;
  const label = acknowledged
    ? `${receipt.count} browser stat${receipt.count === 1 ? "" : "s"} cleared · reload will show them gone`
    : `${receipt.count} in-memory cleared · persistence ${receipt.persistence.toLowerCase().replace("_", " ")} — reload may still show them`;
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
        maxWidth: 520,
      }}
    >
      {label}
    </div>
  );
}

/* ── Session Intelligence Strip ─────────────────────────── */

function SessionIntelligenceStrip({
  channels, symbolCount,
}: {
  channels: readonly { coverageState: string; gapCount: number }[];
  symbolCount: number;
}) {
  // CoverageState describes collector activity, not licensed feed fidelity.
  // COLLECTING is therefore presented as observing and must never be
  // promoted into a public LIVE claim.
  //
  // Reduced by the SAME canonical selector the Vault Ribbon CHANNELS tile
  // reads, so the two panels cannot drift apart again.
  const health = selectChannelCoverageHealth(channels);
  const observingChannels = health.observing;
  const staleChannels = health.stale;
  const unavailableChannels = health.unavailable;
  const totalGaps = health.gaps;

  return (
    <div
      role="group"
      aria-label="Session intelligence: aggregate coverage across all observed channels"
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
        padding: "14px 16px",
        borderRadius: 12,
        border: `1px solid ${WM.border.line}`,
        background: `linear-gradient(180deg, ${WM.surface.deep} 0%, ${WM.surface.mid} 100%)`,
        boxShadow: `inset 0 0 0 1px rgba(212,175,55,0.04)`,
      }}
    >
      <IntelCell label="SYMBOLS OBSERVED" value={symbolCount} tone={symbolCount > 0 ? WM.state.ok : WM.text.dim} />
      <IntelCell label="CHANNELS OBSERVING" value={observingChannels} tone={observingChannels > 0 ? WM.state.ok : WM.text.dim} />
      <IntelCell label="CHANNELS STALE" value={staleChannels} tone={staleChannels > 0 ? WM.state.warn : WM.text.dim} />
      <IntelCell label="CHANNELS UNAVAILABLE" value={unavailableChannels} tone={unavailableChannels > 0 ? WM.state.warn : WM.text.dim} />
      <IntelCell label="COVERAGE GAPS" value={totalGaps} tone={totalGaps > 0 ? WM.state.warn : WM.state.ok} />
    </div>
  );
}

function IntelCell({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div style={{ textAlign: "left" }}>
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
          marginTop: 4,
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 22,
          fontVariantNumeric: "tabular-nums",
          color: tone,
          letterSpacing: -0.2,
          lineHeight: 1,
        }}
      >
        {value.toLocaleString()}
      </div>
    </div>
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
            minHeight: 44,
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
        Market Evidence
      </div>
    </header>
  );
}

/* ── Hero ───────────────────────────────────────────────── */

function VaultHero({
  symbolCount, tradeTotal, earliestHorizonSec,
}: {
  symbolCount: number;
  tradeTotal: number;
  earliestHorizonSec: number | null;
}) {
  // Absolute wall-clock timestamp of the earliest observation. Renders
  // only after mount (parent gated `known` on mounted). Locale-based
  // formatting is safe here because the mount gate ensures both server
  // and initial client paint see earliestHorizonSec=null.
  const startedAtLabel = earliestHorizonSec
    ? new Date(earliestHorizonSec * 1000).toLocaleString(undefined, {
        month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit",
      })
    : null;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
        alignItems: "end",
        gap: "clamp(16px, 3vw, 24px)",
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
          Browser-local per-symbol evidence summaries (up to 32 symbols, 7-day retention).
          Every real trade this browser observes is attributed to the symbol where it happened.
          Switching symbols does not erase prior symbols. Nothing here is fabricated — if a symbol
          is missing, this browser has never observed it in that window.
        </div>
        {startedAtLabel && (
          <div
            style={{
              marginTop: 10,
              fontSize: 10,
              letterSpacing: 0.32,
              textTransform: "uppercase",
              color: WM.text.dim,
              fontWeight: 700,
            }}
            title="Absolute wall-clock time of the earliest real trade observed across every symbol currently retained. No fabricated chronology."
          >
            Earliest observation · {startedAtLabel}
          </div>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "clamp(12px, 3vw, 24px)",
          alignItems: "end",
          minWidth: 0,
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
    <div style={{ textAlign: "right", minWidth: 0 }}>
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
        <div style={{ textAlign: "right" }}>
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
          {slot.horizon && (
            <div
              style={{
                fontSize: 9,
                letterSpacing: 0.24,
                color: WM.text.dim,
                marginTop: 2,
                fontVariantNumeric: "tabular-nums",
              }}
              title={`Absolute wall-clock time of the first real trade observed for ${symbol} in this browser. From sessionSymbolStore.horizon — no fabrication.`}
            >
              since {new Date(slot.horizon.startedAtSec * 1000).toLocaleString(undefined, {
                month: "short", day: "numeric",
                hour: "numeric", minute: "2-digit",
              })}
            </div>
          )}
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

      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${symbol} on the chart`}
          style={{
            flex: 1,
            minHeight: 44,
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
          {isActive ? "Open active symbol on chart →" : "Open on chart →"}
        </button>
        <Link
          href={`/nectar/${encodeURIComponent(symbol)}`}
          aria-label={`View full memory detail for ${symbol}`}
          title={`Deep-dive into ${symbol}'s retained memory: full CVD, per-stat metrics, coverage receipts`}
          style={{
            padding: "9px 12px",
            borderRadius: 8,
            border: `1px solid ${WM.border.line}`,
            color: WM.text.muted,
            fontSize: 10, letterSpacing: 0.32, textTransform: "uppercase", fontWeight: 800,
            textDecoration: "none",
            display: "inline-flex", alignItems: "center",
            minHeight: 44,
          }}
        >
          Detail
        </Link>
      </div>
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
          ? `Trade-channel fidelity class for this symbol: ${fidelity}. Reflects the recorded channel classification this session.`
          : "No trade-channel fidelity has been recorded yet — either no trades were observed for this symbol, or no channel classification is available."
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
        No market evidence yet.
      </div>
      <div style={{ fontSize: 11, letterSpacing: 0.16 }}>
        Open a chart and let accepted market observations arrive. Each symbol will appear here with its browser-retained summary.
      </div>
      <div style={{ marginTop: 18 }}>
        <Link
          href="/charts"
          style={{
            display: "inline-flex", alignItems: "center",
            minHeight: 44,
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
      Market Evidence shows what WM observed. Coverage shows what WM missed.
      This view never claims WM knows what it did not observe.
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────── */
// fmtNum, formatMemoryAge and fidelityToTone are shared with the
// /nectar/[symbol] detail page and unit-tested in nectarFormat.test.ts.
