"use client";

import * as React from "react";
import type { PriceSourceBadge } from "@/lib/priceSource";
import { fidelityLabelToFailureReport } from "@/lib/systemHealth/fidelityToHealth";
import {
  weakestCapability,
  evaluatedCapabilityCount,
  degradedNonPriceCapabilities,
  PRICE_BEARING_CAPABILITIES,
  type PerCapabilityFidelityReport,
} from "@/lib/marketData/perCapabilityFidelity";
import { CANONICAL_FIDELITY_LABELS } from "@/lib/marketData/canonicalFidelityLabels";

/**
 * CanonicalFidelityBadge — the single trader-facing chip for a
 * fidelity label + its canon 7-question health narrative.
 *
 * Canon anchors:
 *   §Living Market Visual Systems (2026-08-27) — the seven canon
 *   fidelity strings must appear uniformly across every trader
 *   surface. This component is the ONE renderer that emits them.
 *
 *   §Single-Writer / Many-Readers Law (ATH SYSTEMS CLARITY 2026-08-28) —
 *   the chip's styling, sizing, dot rules, and tooltip enrichment
 *   used to live redundantly in four surfaces (MainChart, ChartsDashboard,
 *   TickerTape, WatchlistPanel). One writer here retires the four
 *   hand-rolled implementations.
 *
 *   §Failure + Recovery Grammar (2026-08-28) — every non-NORMAL
 *   fidelity state emits the canon 7-question narrative in the tooltip
 *   (Affected / Still works / Reason / Impact / Next safe action /
 *   Recovered when). SHIFT-Q atom 4 wired this once for ChartsDashboard;
 *   this primitive gives EVERY surface the same enrichment for free.
 *
 *   §Simplification Dividend (ATH BREAKTHROUGH LAW 2026-08-27) — a
 *   graduated capability owes the product a simplification dividend.
 *   Four hand-rolled chip renders collapse into one shared primitive.
 *
 * The component is presentational: color/dot/size defaults live here,
 * caller may override via `variant` for compact (ticker-row) vs
 * dashboard (chart-chrome) vs inline (watchlist) contexts. Truth stays
 * in the passed-in `badge`; this file only renders it.
 */

export type CanonicalFidelityBadgeVariant =
  /** Chart-chrome pill — bold, framed, ~20px tall (ChartsDashboard). */
  | "chrome"
  /** Ticker-row inline chip — colored dot + short suffix label. */
  | "ticker"
  /** Watchlist inline chip — quieter compact form. */
  | "compact"
  /** Chart status pill — no framed background, plain text. */
  | "status";

export interface CanonicalFidelityBadgeProps {
  /** The canon-emitting badge from priceSourceBadge() or equivalent. */
  readonly badge: PriceSourceBadge;
  /** Render variant — presentation only, no truth effect. */
  readonly variant?: CanonicalFidelityBadgeVariant;
  /** Optional aria-label override; defaults to the canon label. */
  readonly ariaLabel?: string;
  /** Optional caller title override — merged with canon narrative if provided. */
  readonly titleSuffix?: string;
  /**
   * Optional per-capability report (canon §Provider Status Is Resolved
   * Per Capability). When provided AND at least one non-NORMAL evaluated
   * capability exists, the tooltip gains a "Capability status" hint
   * naming the weakest capability + label. The visible chip text stays
   * driven by `badge` (canon: don't fatten the one-glance chip); trader
   * gets the deeper truth on hover only — canon §Semantic Zoom.
   */
  readonly capabilityReport?: PerCapabilityFidelityReport;
}

/**
 * Build the canon-enriched tooltip: caller's original badge title +
 * canon 7-question narrative for any non-NORMAL state. NORMAL keeps
 * the clean one-line tooltip (canon: normal inactivity is not
 * failure — no theater).
 */
export function buildCanonicalFidelityTooltip(
  badge: PriceSourceBadge,
  titleSuffix?: string,
  capabilityReport?: PerCapabilityFidelityReport,
): string {
  const report = fidelityLabelToFailureReport(badge.label);
  const base = titleSuffix ? `${badge.title} ${titleSuffix}` : badge.title;

  // Canon §Provider Status Is Resolved Per Capability — if a
  // per-capability report is supplied AND at least one evaluated
  // capability is non-NORMAL, tell the trader on hover which
  // capability is weakest. NORMAL badge state with all-NORMAL
  // capabilities keeps the calm one-line tooltip.
  //
  // §14.7 — "missing Greeks cannot dirty a verified last price." This chip
  // labels a PRICE, so the weakness it reports is scoped to the capabilities
  // the price actually rests on (bars / quotes / ticks). Before this scope, a
  // blocked Greek entitlement was reported as "Weakest capability" on a quote
  // verified one second earlier. Greeks, depth and options are still
  // disclosed — on their own line, where they speak only for themselves.
  const weakest = capabilityReport
    ? weakestCapability(capabilityReport, PRICE_BEARING_CAPABILITIES)
    : null;
  const weakestIsProblem =
    weakest !== null &&
    weakest.label !== CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE &&
    weakest.label !== CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED;
  const nonPriceDegraded = capabilityReport
    ? degradedNonPriceCapabilities(capabilityReport)
    : [];
  const evaluatedCount = capabilityReport ? evaluatedCapabilityCount(capabilityReport) : 0;

  // Early return only when there's NOTHING to add: badge is NORMAL,
  // no weakest problem, and no evaluated capabilities to report count for.
  if (report.state === "NORMAL" && !weakestIsProblem && evaluatedCount === 0) {
    return base;
  }

  const lines: string[] = [base];

  // Badge-level narrative only fires when the badge itself is not NORMAL.
  if (report.state !== "NORMAL") {
    lines.push("", `State: ${report.state}`);
    if (report.affected)       lines.push(`Affected: ${report.affected}`);
    if (report.stillWorks)     lines.push(`Still works: ${report.stillWorks}`);
    if (report.reason)         lines.push(`Reason: ${report.reason}`);
    if (report.userImpact)     lines.push(`Impact: ${report.userImpact}`);
    if (report.nextSafeAction) lines.push(`Next: ${report.nextSafeAction}`);
    if (report.recoveredWhen)  lines.push(`Recovered when: ${report.recoveredWhen}`);
  }

  if (weakestIsProblem && weakest) {
    lines.push("");
    lines.push(`Weakest price capability: ${weakest.capability} · ${weakest.label}`);
    lines.push(`Capabilities evaluated: ${evaluatedCount} / 7`);
    if (nonPriceDegraded.length > 0) {
      lines.push(
        `Not affecting this price: ${nonPriceDegraded.map((c) => `${c.capability} · ${c.label}`).join("; ")}`,
      );
    }
  } else if (nonPriceDegraded.length > 0) {
    // The price's own chain is fine. Say so plainly, then name the other
    // capabilities WITHOUT letting them describe the price.
    lines.push("");
    lines.push(
      `Not affecting this price: ${nonPriceDegraded.map((c) => `${c.capability} · ${c.label}`).join("; ")}`,
    );
    lines.push(`Capabilities evaluated: ${evaluatedCount} / 7`);
  } else if (capabilityReport && evaluatedCount > 0) {
    // Report supplied but everything is NORMAL — still tell the trader
    // coverage count. Canon §Vector, not god score: the count IS the
    // truth, not a synthesized "health %" hiding disagreement.
    lines.push("");
    lines.push(`Capabilities evaluated: ${evaluatedCount} / 7 — all normal`);
  }

  return lines.join("\n");
}

export function CanonicalFidelityBadge({
  badge,
  variant = "chrome",
  ariaLabel,
  titleSuffix,
  capabilityReport,
}: CanonicalFidelityBadgeProps): React.ReactElement {
  const tooltip = buildCanonicalFidelityTooltip(badge, titleSuffix, capabilityReport);
  const isLive = badge.live;
  const dotColor  = isLive ? "#00E88A" : "#F5A623";
  const textColor = isLive ? "#00E88A" : "#F5A623";
  const bgColor   = isLive ? "#00C0762A" : "#F5A62322";
  const borderColor = isLive ? "#00C07680" : "#F5A62360";

  if (variant === "chrome") {
    // Framed pill — matches ChartsDashboard historic size (SHIFT-Q).
    return (
      <span
        title={tooltip}
        aria-label={ariaLabel ?? badge.label}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
          color: textColor, background: bgColor, border: `1px solid ${borderColor}`,
          borderRadius: 4, padding: "3px 7px", flexShrink: 0, cursor: "help",
          height: 20, alignSelf: "center",
        }}
      >
        <span aria-hidden style={{
          width: 7, height: 7, borderRadius: "50%",
          background: dotColor,
          boxShadow: isLive ? `0 0 4px ${dotColor}` : "none",
        }} />
        {badge.label}
      </span>
    );
  }

  if (variant === "status") {
    // Chart status text — no framed background (MainChart chrome).
    return (
      <span
        title={tooltip}
        aria-label={ariaLabel ?? badge.label}
        className="text-[10px] font-semibold"
        style={{ color: isLive ? "#00E88A" : "#F5A623" }}
      >
        {badge.label}
      </span>
    );
  }

  if (variant === "ticker") {
    // Ticker-row: colored dot only when non-live; short label suffix.
    return (
      <span
        title={tooltip}
        aria-label={ariaLabel ?? badge.label}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
          fontSize: 10, fontWeight: 600, letterSpacing: "0.03em",
          color: textColor, cursor: "help",
        }}
      >
        <span aria-hidden style={{
          width: 7, height: 7, borderRadius: "50%",
          background: dotColor,
          boxShadow: isLive ? `0 0 3px ${dotColor}` : "none",
        }} />
        {!isLive && (
          <span>{badge.label}</span>
        )}
      </span>
    );
  }

  // variant === "compact" — watchlist rows.
  return (
    <span
      title={tooltip}
      aria-label={ariaLabel ?? badge.label}
      style={{
        display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0,
        fontSize: 9, fontWeight: 600, opacity: 0.85,
        color: textColor, cursor: "help",
      }}
    >
      <span aria-hidden style={{
        width: 5, height: 5, borderRadius: "50%",
        background: dotColor,
      }} />
      {badge.label}
    </span>
  );
}
