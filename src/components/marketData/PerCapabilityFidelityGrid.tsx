"use client";

import * as React from "react";
import {
  CANONICAL_CAPABILITIES,
  type CanonicalCapability,
  type PerCapabilityFidelityReport,
} from "@/lib/marketData/perCapabilityFidelity";
import { fidelityLabelToFailureReport } from "@/lib/systemHealth/fidelityToHealth";

/**
 * PerCapabilityFidelityGrid — canon §Provider Status Is Resolved Per
 * Capability (Founding Contract 2026-08-29) rendered.
 *
 * Given a PerCapabilityFidelityReport, renders each capability as a
 * canon-labeled row. Undefined slots render as "not evaluated" (silent
 * per canon §Silence Is A Feature; NOT a red "UNKNOWN" alarm).
 *
 * This is the Level-3 semantic-zoom surface for market fidelity: the
 * trader can inspect the full seven-capability grid instead of the
 * one-glance <CanonicalFidelityBadge> chip. Suitable for /profile
 * Broker tab, /command-deck Data Health drawer, or an Evidence
 * Inspector panel.
 *
 * Every non-NORMAL evaluated row carries the canon 7-question tooltip
 * automatically via `fidelityLabelToFailureReport`.
 */

const CAPABILITY_LABELS: Record<CanonicalCapability, string> = {
  bars:      "Bars (OHLCV)",
  quotes:    "Quotes",
  ticks:     "Ticks / trades",
  options:   "Options",
  greeks:    "Greeks",
  depth:     "Market depth (L2)",
  orderFlow: "Order flow (derived)",
};

export interface PerCapabilityFidelityGridProps {
  readonly report: PerCapabilityFidelityReport;
  /** Optional symbol name — shown in the header row when provided. */
  readonly symbol?: string;
  /**
   * When true, show unevaluated capabilities as dim "— not evaluated"
   * rows so the trader knows what's covered vs missing. When false,
   * hide them entirely (silent — the default; canon §Silence).
   */
  readonly showUnevaluated?: boolean;
}

export function PerCapabilityFidelityGrid({
  report,
  symbol,
  showUnevaluated = false,
}: PerCapabilityFidelityGridProps): React.ReactElement {
  return (
    <section
      aria-label={symbol ? `${symbol} per-capability fidelity` : "Per-capability fidelity"}
      className="rounded-lg border border-wm-border bg-wm-black/40 p-3"
    >
      {symbol && (
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-wm-text-muted mb-2">
          {symbol} · fidelity per capability
        </div>
      )}
      <ul role="list" className="space-y-1">
        {CANONICAL_CAPABILITIES.map((cap) => {
          const label = report[cap];
          if (!label && !showUnevaluated) return null;
          const displayName = CAPABILITY_LABELS[cap];
          if (!label) {
            return (
              <li
                key={cap}
                className="flex items-center gap-2 text-[10px]"
                style={{ color: "#5D6478" }}
              >
                <span className="min-w-[128px] font-mono">{displayName}</span>
                <span className="italic">— not evaluated</span>
              </li>
            );
          }
          const report7q = fidelityLabelToFailureReport(label);
          const isNormal = report7q.state === "NORMAL";
          const tooltip = isNormal
            ? `${displayName}: ${label}`
            : [
                `${displayName}: ${label}`,
                "",
                `State: ${report7q.state}`,
                report7q.affected      && `Affected: ${report7q.affected}`,
                report7q.stillWorks    && `Still works: ${report7q.stillWorks}`,
                report7q.reason        && `Reason: ${report7q.reason}`,
                report7q.userImpact    && `Impact: ${report7q.userImpact}`,
                report7q.nextSafeAction && `Next: ${report7q.nextSafeAction}`,
                report7q.recoveredWhen && `Recovered when: ${report7q.recoveredWhen}`,
              ].filter(Boolean).join("\n");
          return (
            <li
              key={cap}
              title={tooltip}
              className="flex items-center gap-2 text-[10px] cursor-help"
              style={{ color: isNormal ? "#00E88A" : "#F5A623" }}
            >
              <span
                aria-hidden
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: isNormal ? "#00E88A" : "#F5A623",
                  boxShadow: isNormal ? "0 0 3px #00E88A" : "none",
                  flexShrink: 0,
                }}
              />
              <span className="min-w-[128px] font-mono">{displayName}</span>
              <span className="font-semibold tracking-wide">{label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
