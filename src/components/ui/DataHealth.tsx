"use client";
import * as React from "react";
import type { MarketQualityState } from "@/lib/marketData/canonicalMarketState";

/**
 * Data-health primitives — QualityBadge, PersistenceBadge, NectarHeartbeat.
 *
 * These three close the Founder's TSLA "not live" concern from the
 * 2026-08-12 P0 trace by giving the UI a truthful vocabulary for
 * separate data-lifecycle states. Wire them into MainChart /
 * BottomIndexBar / FootprintControls / OptionsChain to replace the
 * conflated `LIVE / SAVED` claims that were the surface symptom.
 *
 * Doctrine (from 2026-08-13 helicopter directive):
 *   TRANSPORT ≠ SYMBOL OBSERVATION ≠ CLASSIFICATION ≠ PERSISTENCE.
 *
 * A single green "LIVE" pill for all four is exactly what the founder
 * called out as false — these three primitives make the four states
 * separately truthful and separately renderable.
 */

// ── QualityBadge ────────────────────────────────────────────────────────

const QUALITY_STYLES: Record<MarketQualityState, { text: string; border: string; glyph: string; label: string }> = {
  LIVE:        { text: "#5cb85c", border: "rgba(92,184,92,0.4)",  glyph: "●", label: "Live" },
  DELAYED:     { text: "#c9a55c", border: "rgba(201,165,92,0.5)", glyph: "◐", label: "Delayed" },
  STALE:       { text: "#c05a4a", border: "rgba(192,90,74,0.5)",  glyph: "!", label: "Stale" },
  PARTIAL:     { text: "#c9a55c", border: "rgba(201,165,92,0.5)", glyph: "◑", label: "Partial" },
  PROXY:       { text: "#8a8271", border: "rgba(139,106,41,0.5)", glyph: "≈", label: "Proxy" },
  REPLAY:      { text: "#8a8271", border: "rgba(139,106,41,0.5)", glyph: "⟲", label: "Replay" },
  UNAVAILABLE: { text: "#55503f", border: "rgba(85,80,63,0.5)",   glyph: "—", label: "Unavailable" },
};

export interface QualityBadgeProps {
  /** The MarketQualityState from CanonicalMarketState.qualityState. */
  state: MarketQualityState;
  /** Optional freshness in ms — displayed when state is LIVE/DELAYED. */
  freshnessMs?: number;
  /** Optional custom label override. */
  label?: string;
  /** Compact variant (icon + short text only). */
  compact?: boolean;
  className?: string;
}

export function QualityBadge({ state, freshnessMs, label, compact = false, className }: QualityBadgeProps) {
  const s = QUALITY_STYLES[state];
  const displayLabel = label ?? s.label;
  const freshText = freshnessMs != null && state !== "UNAVAILABLE"
    ? freshnessMs < 1000
      ? `${freshnessMs}ms`
      : `${(freshnessMs / 1000).toFixed(1)}s`
    : null;

  const ariaLabel = `Data quality: ${displayLabel}${freshText ? `, ${freshText} old` : ""}`;

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={[
        "wm-quality-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        "border text-[9px] tracking-[0.28em] uppercase tabular-nums",
        className ?? "",
      ].join(" ")}
      style={{ borderColor: s.border, color: s.text }}
    >
      <span aria-hidden="true">{s.glyph}</span>
      {!compact && <span>{displayLabel}</span>}
      {freshText && !compact && (
        <span className="text-[color:var(--wm-text-3,#55503f)] ml-0.5">· {freshText}</span>
      )}
    </span>
  );
}

// ── PersistenceBadge ────────────────────────────────────────────────────

/**
 * PersistenceAckState — the truth vocabulary for the "Saved N" chip
 * founder called out. Only ACKNOWLEDGED (+ correct count) may say "Saved".
 * Fixes the C2/C3/PR#24 defect from the 2026-08-12 P0 audit.
 */
export type PersistenceAckState =
  | "NOT_REQUESTED"
  | "PENDING"
  | "ACKNOWLEDGED"
  | "PARTIAL"        // server acked fewer than expected
  | "FAILED"
  | "OFFLINE_QUEUED"
  | "UNKNOWN";

const PERSIST_STYLES: Record<PersistenceAckState, { text: string; border: string; glyph: string; label: string; countPrefix: string }> = {
  NOT_REQUESTED:  { text: "#55503f", border: "rgba(85,80,63,0.5)",   glyph: "—", label: "Not requested",  countPrefix: "—" },
  PENDING:        { text: "#c9a55c", border: "rgba(201,165,92,0.5)", glyph: "◐", label: "Pending",        countPrefix: "Pending" },
  ACKNOWLEDGED:   { text: "#5cb85c", border: "rgba(92,184,92,0.4)",  glyph: "◇", label: "Saved",          countPrefix: "Saved" },
  PARTIAL:        { text: "#c9a55c", border: "rgba(201,165,92,0.5)", glyph: "◑", label: "Partial save",   countPrefix: "Saved" },
  FAILED:         { text: "#c05a4a", border: "rgba(192,90,74,0.5)",  glyph: "!", label: "Save failed",    countPrefix: "Failed" },
  OFFLINE_QUEUED: { text: "#c9a55c", border: "rgba(201,165,92,0.5)", glyph: "⌛", label: "Queued offline", countPrefix: "Queued" },
  UNKNOWN:        { text: "#55503f", border: "rgba(85,80,63,0.5)",   glyph: "?", label: "Unknown",        countPrefix: "Local" },
};

export interface PersistenceBadgeProps {
  state: PersistenceAckState;
  /** Observed count (browser-local). */
  observedCount?: number;
  /** Acknowledged count from server. */
  acknowledgedCount?: number;
  compact?: boolean;
  className?: string;
}

export function PersistenceBadge({
  state,
  observedCount,
  acknowledgedCount,
  compact = false,
  className,
}: PersistenceBadgeProps) {
  const s = PERSIST_STYLES[state];
  const count = state === "ACKNOWLEDGED" || state === "PARTIAL"
    ? acknowledgedCount ?? 0
    : observedCount ?? 0;

  const ariaLabel =
    state === "ACKNOWLEDGED"
      ? `Persistence acknowledged: ${count} observations server-durable`
      : state === "PARTIAL"
      ? `Persistence partial: ${acknowledgedCount ?? 0} of ${observedCount ?? 0} acknowledged`
      : state === "PENDING"
      ? `Persistence pending: ${count} observations in flight`
      : state === "FAILED"
      ? `Persistence failed for ${count} observations`
      : state === "OFFLINE_QUEUED"
      ? `Persistence queued offline: ${count} observations`
      : state === "UNKNOWN"
      ? `Persistence unknown: ${count} local observations`
      : `Persistence not requested`;

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={[
        "wm-persistence-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
        "border text-[9px] tracking-[0.24em] uppercase tabular-nums",
        className ?? "",
      ].join(" ")}
      style={{ borderColor: s.border, color: s.text }}
    >
      <span aria-hidden="true">{s.glyph}</span>
      {!compact && <span>{s.countPrefix}</span>}
      {count > 0 && <span className="text-[color:var(--wm-text-1,#ede6d3)]">{count.toLocaleString()}</span>}
    </span>
  );
}

// ── NectarHeartbeat ─────────────────────────────────────────────────────

/**
 * NectarHeartbeat — truthful "IS NECTAR ACTUALLY OBSERVING THIS SYMBOL?"
 *
 * Derives status from evidence (Date.now() - lastEventAt), NOT from
 * `!paused` or `mounted` or `socket-exists`. Directly answers the founder's
 * TSLA morning question.
 *
 * Rules (from 2026-08-12 P0 doc + 2026-08-13 directive):
 *   - lastEventAt null                  → NO_EVENTS_YET
 *   - age < 30s                         → OBSERVING
 *   - age < 60s                         → DEGRADED
 *   - age < 5 min                       → STALE
 *   - transportConnected===false        → DISCONNECTED
 *   - eligibleSource===false            → NO_ELIGIBLE_SOURCE
 *   - rightsBlocked===true              → RIGHTS_BLOCKED
 *   - otherwise                         → UNKNOWN
 */
export type NectarStatus =
  | "OBSERVING"
  | "DEGRADED"
  | "STALE"
  | "NO_EVENTS_YET"
  | "PAUSED"
  | "DISCONNECTED"
  | "NO_ELIGIBLE_SOURCE"
  | "RIGHTS_BLOCKED"
  | "UNKNOWN";

const NECTAR_STYLES: Record<NectarStatus, { text: string; border: string; glyph: string; label: string }> = {
  OBSERVING:          { text: "#5cb85c", border: "rgba(92,184,92,0.4)",  glyph: "●", label: "Observing" },
  DEGRADED:           { text: "#c9a55c", border: "rgba(201,165,92,0.5)", glyph: "◐", label: "Degraded" },
  STALE:              { text: "#c05a4a", border: "rgba(192,90,74,0.5)",  glyph: "!", label: "Stale" },
  NO_EVENTS_YET:      { text: "#8a8271", border: "rgba(139,106,41,0.5)", glyph: "⌛", label: "Warming up" },
  PAUSED:             { text: "#c9a55c", border: "rgba(201,165,92,0.5)", glyph: "‖", label: "Paused" },
  DISCONNECTED:       { text: "#c05a4a", border: "rgba(192,90,74,0.5)",  glyph: "×", label: "Disconnected" },
  NO_ELIGIBLE_SOURCE: { text: "#55503f", border: "rgba(85,80,63,0.5)",   glyph: "—", label: "No source" },
  RIGHTS_BLOCKED:     { text: "#55503f", border: "rgba(85,80,63,0.5)",   glyph: "▲", label: "Rights blocked" },
  UNKNOWN:            { text: "#55503f", border: "rgba(85,80,63,0.5)",   glyph: "?", label: "Unknown" },
};

export interface NectarHeartbeatProps {
  /** Symbol this heartbeat pertains to — never global "hub healthy" claim. */
  symbol: string;
  /** epoch ms of last observed event for THIS symbol, or null. */
  lastEventAt: number | null;
  /** Total observations for this symbol this runtime. */
  observedCount?: number;
  /** WebSocket transport connectivity — separate from observation. */
  transportConnected: boolean;
  /** User-paused? */
  paused?: boolean;
  /** No eligible provider for this asset/session? */
  noEligibleSource?: boolean;
  /** Provider rights UNKNOWN or blocked? */
  rightsBlocked?: boolean;
  /** For freshness thresholds — provide "now" for testability. */
  nowMs?: number;
  className?: string;
}

export function deriveNectarStatus(props: NectarHeartbeatProps): { status: NectarStatus; ageMs: number | null } {
  const now = props.nowMs ?? Date.now();
  if (props.paused) return { status: "PAUSED", ageMs: null };
  if (props.rightsBlocked) return { status: "RIGHTS_BLOCKED", ageMs: null };
  if (props.noEligibleSource) return { status: "NO_ELIGIBLE_SOURCE", ageMs: null };
  if (!props.transportConnected) return { status: "DISCONNECTED", ageMs: null };
  if (props.lastEventAt == null) return { status: "NO_EVENTS_YET", ageMs: null };
  const age = now - props.lastEventAt;
  if (age < 30_000) return { status: "OBSERVING", ageMs: age };
  if (age < 60_000) return { status: "DEGRADED", ageMs: age };
  if (age < 300_000) return { status: "STALE", ageMs: age };
  return { status: "STALE", ageMs: age };
}

export function NectarHeartbeat(props: NectarHeartbeatProps) {
  const { status, ageMs } = deriveNectarStatus(props);
  const s = NECTAR_STYLES[status];
  const ageText = ageMs != null
    ? ageMs < 1000
      ? `${ageMs}ms ago`
      : ageMs < 60_000
      ? `${(ageMs / 1000).toFixed(1)}s ago`
      : `${Math.floor(ageMs / 60_000)}m ago`
    : null;

  const ariaLabel = `${props.symbol} Nectar ${s.label.toLowerCase()}${ageText ? `, last event ${ageText}` : ""}${props.observedCount != null ? `, ${props.observedCount} observed this session` : ""}`;

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={[
        "wm-nectar-heartbeat inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
        "border text-[9px] tracking-[0.24em] uppercase tabular-nums",
        props.className ?? "",
      ].join(" ")}
      style={{ borderColor: s.border, color: s.text }}
    >
      <span aria-hidden="true">{s.glyph}</span>
      <span>Nectar</span>
      <span className="text-[color:var(--wm-text-1,#ede6d3)]">{s.label}</span>
      {ageText && <span className="text-[color:var(--wm-text-3,#55503f)]">· {ageText}</span>}
    </span>
  );
}

// ── Composed: MarketDataHealth row ──────────────────────────────────────

export interface MarketDataHealthProps {
  symbol: string;
  quality: MarketQualityState;
  qualityFreshnessMs?: number;
  provider?: string;
  coverageScope?: string;
  transportConnected: boolean;
  lastEventAt: number | null;
  observedCount?: number;
  persistenceState: PersistenceAckState;
  persistenceObservedCount?: number;
  persistenceAcknowledgedCount?: number;
  paused?: boolean;
  noEligibleSource?: boolean;
  rightsBlocked?: boolean;
  className?: string;
}

/**
 * MarketDataHealth — compact composed row for Command Deck header.
 *
 * Renders each layer independently truthful:
 *   TRANSPORT · QUALITY · PROVIDER · COVERAGE · NECTAR · PERSISTENCE
 *
 * Never collapses all four into one "LIVE" pill.
 */
export function MarketDataHealth({
  symbol,
  quality,
  qualityFreshnessMs,
  provider,
  coverageScope,
  transportConnected,
  lastEventAt,
  observedCount,
  persistenceState,
  persistenceObservedCount,
  persistenceAcknowledgedCount,
  paused,
  noEligibleSource,
  rightsBlocked,
  className,
}: MarketDataHealthProps) {
  return (
    <div
      className={["wm-market-data-health flex flex-wrap items-center gap-2", className ?? ""].join(" ")}
      role="group"
      aria-label={`${symbol} market data health`}
    >
      <QualityBadge state={quality} freshnessMs={qualityFreshnessMs} />
      {provider && (
        <span className="text-[10px] tracking-[0.24em] uppercase text-[color:var(--wm-text-2,#8a8271)]">
          {provider}{coverageScope ? ` · ${coverageScope}` : ""}
        </span>
      )}
      <NectarHeartbeat
        symbol={symbol}
        lastEventAt={lastEventAt}
        observedCount={observedCount}
        transportConnected={transportConnected}
        paused={paused}
        noEligibleSource={noEligibleSource}
        rightsBlocked={rightsBlocked}
      />
      <PersistenceBadge
        state={persistenceState}
        observedCount={persistenceObservedCount}
        acknowledgedCount={persistenceAcknowledgedCount}
      />
    </div>
  );
}
