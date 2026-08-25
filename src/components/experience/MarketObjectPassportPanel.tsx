"use client";

/**
 * MarketObjectPassportPanel — compact renderer for selectMarketObjectPassport
 * (Founder canon P6 MARKET OBJECT PASSPORT / OBJECT DNA).
 *
 * Each canonical dimension the engine resolved gets a Passport line: label,
 * lifecycle chip, value + fidelity. Pressing a resolved/forming object opens
 * its DNA — evidence lineage (reversible to provider evidence), contradictions,
 * and the honest unknown residue. This is the Evidence-Reversibility Moat as a
 * surface: every claim travels backward to an evidence ref.
 *
 * Pure display — consumes a MarketObjectPassportVM, never derives truth.
 * Auto-Quiet: unresolved objects render dim and collapsed; resolved objects
 * lead. When nothing is sealed the panel states that honestly.
 */

import * as React from "react";
import type {
  MarketObjectPassportVM,
  MarketObjectPassport,
  PassportLifecycle,
} from "@/lib/marketData/viewModels/selectMarketObjectPassport";

export interface MarketObjectPassportPanelProps {
  readonly vm: MarketObjectPassportVM;
}

const LIFECYCLE_COLOR: Record<PassportLifecycle, string> = {
  RESOLVED: "#d4af37", // gold — sealed with evidence
  FORMING: "#c9a55c", // dim gold — partial
  UNRESOLVED: "#8a8271", // muted — nothing verified yet
};

const FIDELITY_TONE: Record<string, string> = {
  OBSERVED: "#d4af37",
  DERIVED: "#c9a55c",
  PROXY: "#b8925a",
  INFERRED: "#9c8a63",
  SIMULATED: "#8a8271",
  UNAVAILABLE: "#6f6a5a",
};

const MUTED = "#8a8271";
const HAIR = "rgba(139,106,41,0.22)";

function fmtTime(ms: number): string {
  try {
    return new Date(ms).toISOString().replace("T", " ").slice(0, 19) + "Z";
  } catch {
    return String(ms);
  }
}

function PassportRow({ obj }: { obj: MarketObjectPassport }): React.ReactElement {
  const color = LIFECYCLE_COLOR[obj.lifecycle];
  const hasDetail =
    obj.evidence.length > 0 || obj.contradictions.length > 0 || obj.unknowns.length > 0;

  const header = (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, letterSpacing: 0.4, color, minWidth: 92, textTransform: "uppercase" }}>
        {obj.label}
      </span>
      <span style={{ fontSize: 9, letterSpacing: 0.5, color, opacity: 0.85, textTransform: "uppercase" }}>
        {obj.lifecycle}
      </span>
      <span style={{ fontSize: 12, color: obj.value ? "#d8cfb8" : MUTED, fontStyle: obj.value ? "normal" : "italic" }}>
        {obj.value ?? obj.summary}
      </span>
      {obj.fidelity && (
        <span style={{ fontSize: 9, letterSpacing: 0.4, color: FIDELITY_TONE[obj.fidelity] ?? MUTED, marginLeft: "auto", textTransform: "uppercase" }}>
          {obj.fidelity}
          {obj.confidence != null ? ` · ${Math.round(obj.confidence * 100)}%` : ""}
        </span>
      )}
    </div>
  );

  if (!hasDetail) {
    return <div style={{ padding: "6px 0", borderBottom: `1px solid ${HAIR}` }}>{header}</div>;
  }

  return (
    <details style={{ padding: "6px 0", borderBottom: `1px solid ${HAIR}` }}>
      <summary style={{ cursor: "pointer", listStyle: "none" }}>{header}</summary>
      <div style={{ marginTop: 8, paddingLeft: 8, display: "flex", flexDirection: "column", gap: 8 }}>
        {obj.evidence.length > 0 && (
          <div>
            <div style={{ fontSize: 9, letterSpacing: 0.5, color: MUTED, marginBottom: 4 }}>EVIDENCE LINEAGE</div>
            {obj.evidence.map((e) => (
              <div key={e.eventId} style={{ fontSize: 11, color: "#c2b892", lineHeight: 1.4 }}>
                <span style={{ color: FIDELITY_TONE[e.fidelity] ?? MUTED }}>{e.fidelity}</span>
                {" · "}
                <span style={{ color: "#d8cfb8" }}>{e.source}</span>
                {" — "}
                {e.basis}
                <span style={{ color: MUTED }}>{"  @ "}{fmtTime(e.availableAt)}</span>
              </div>
            ))}
          </div>
        )}
        {obj.contradictions.length > 0 && (
          <div>
            <div style={{ fontSize: 9, letterSpacing: 0.5, color: "#e07b5c", marginBottom: 4 }}>CONTRADICTION</div>
            {obj.contradictions.map((c, i) => (
              <div key={i} style={{ fontSize: 11, color: "#e0a58c", lineHeight: 1.4 }}>{c}</div>
            ))}
          </div>
        )}
        {obj.unknowns.length > 0 && (
          <div>
            <div style={{ fontSize: 9, letterSpacing: 0.5, color: MUTED, marginBottom: 4 }}>MISSING / INVALIDATION</div>
            {obj.unknowns.map((u, i) => (
              <div key={i} style={{ fontSize: 11, color: MUTED, lineHeight: 1.4, fontStyle: "italic" }}>{u}</div>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

export function MarketObjectPassportPanel({ vm }: MarketObjectPassportPanelProps): React.ReactElement {
  // Resolved / forming objects lead; unresolved are quieted below (Auto-Quiet).
  const ordered = [...vm.objects].sort((a, b) => {
    const rank = (l: PassportLifecycle) => (l === "RESOLVED" ? 0 : l === "FORMING" ? 1 : 2);
    return rank(a.lifecycle) - rank(b.lifecycle);
  });

  return (
    <section
      aria-label="Market object passports"
      style={{
        border: `1px solid ${HAIR}`,
        borderRadius: 10,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.015)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: 0.6, color: "#c9a55c", textTransform: "uppercase" }}>
          Market Object Passports · Object DNA
        </span>
        <span style={{ fontSize: 10, color: MUTED, marginLeft: "auto" }}>
          {vm.resolvedCount}/{vm.totalCount} resolved · {vm.qualityState}
        </span>
      </div>

      {vm.objects.length === 0 ? (
        <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic", padding: "4px 0" }}>
          No sealed market state yet — no objects to passport.
        </div>
      ) : (
        <div>
          {ordered.map((obj) => (
            <PassportRow key={obj.id} obj={obj} />
          ))}
        </div>
      )}

      {vm.snapshotId && (
        <div style={{ fontSize: 9, color: MUTED, marginTop: 8, letterSpacing: 0.3 }}>
          snapshot {vm.snapshotId}
          {vm.capturedAt ? ` · sealed ${fmtTime(vm.capturedAt)}` : ""}
        </div>
      )}
    </section>
  );
}

export default MarketObjectPassportPanel;
