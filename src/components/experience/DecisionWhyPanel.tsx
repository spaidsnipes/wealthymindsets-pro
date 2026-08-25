"use client";

/**
 * DecisionWhyPanel — compact renderer for selectDecisionWhyNot (canon P6
 * "WHY / WHY NOT" for the DECISION).
 *
 * Reverses the current RightOfWay verdict to its concrete causes: engaged
 * rules, active contradiction, unpaid/warned evidence debt — each shown
 * verbatim from the canonical engine. When the path is clear it shows the
 * clearances instead. Pure display — never invents a reason.
 */

import * as React from "react";
import type {
  DecisionWhyVM,
  WhyBlockerKind,
} from "@/lib/marketData/viewModels/selectDecisionWhyNot";

export interface DecisionWhyPanelProps {
  readonly vm: DecisionWhyVM;
}

const KIND_LABEL: Record<WhyBlockerKind, string> = {
  HARD_RULE: "HARD RULE",
  CONTRADICTION: "CONTRADICTION",
  EVIDENCE_DEBT: "MISSING",
  EVIDENCE_WARN: "BELOW CONFIRM",
  SOFT_RULE: "SOFT RULE",
};

const KIND_TONE: Record<WhyBlockerKind, string> = {
  HARD_RULE: "#e07b5c",
  CONTRADICTION: "#e07b5c",
  EVIDENCE_DEBT: "#c9a55c",
  EVIDENCE_WARN: "#b8925a",
  SOFT_RULE: "#9c8a63",
};

const MUTED = "#8a8271";
const HAIR = "rgba(139,106,41,0.22)";

export function DecisionWhyPanel({ vm }: DecisionWhyPanelProps): React.ReactElement {
  const accent = vm.clear ? "#d4af37" : "#e07b5c";

  return (
    <section
      aria-label="Why / why not — decision"
      style={{
        border: `1px solid ${HAIR}`,
        borderRadius: 10,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.015)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: 0.6, color: "#c9a55c", textTransform: "uppercase" }}>
          Why {vm.clear ? "" : "not"} · right-of-way
        </span>
        <span style={{ fontSize: 10, letterSpacing: 0.5, color: accent, marginLeft: "auto", textTransform: "uppercase" }}>
          {vm.verdict}
        </span>
      </div>

      <div style={{ fontSize: 12, color: "#d8cfb8", lineHeight: 1.4, marginBottom: vm.blockers.length || vm.clearances.length ? 10 : 0 }}>
        {vm.headline}
      </div>

      {vm.blockers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: vm.clearances.length ? 10 : 0 }}>
          {vm.blockers.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", borderBottom: `1px solid ${HAIR}`, paddingBottom: 5 }}>
              <span style={{ fontSize: 9, letterSpacing: 0.4, color: KIND_TONE[b.kind], minWidth: 96, textTransform: "uppercase" }}>
                {KIND_LABEL[b.kind]}
              </span>
              <span style={{ fontSize: 11, color: "#d8cfb8", lineHeight: 1.4 }}>
                <span style={{ color: "#c2b892" }}>{b.label}</span>
                {b.detail && b.detail !== b.label ? <span style={{ color: MUTED }}>{" — "}{b.detail}</span> : null}
              </span>
            </div>
          ))}
        </div>
      )}

      {vm.clearances.length > 0 && (
        <div>
          <div style={{ fontSize: 9, letterSpacing: 0.5, color: MUTED, marginBottom: 4 }}>CLEARED</div>
          {vm.clearances.map((c, i) => (
            <div key={i} style={{ fontSize: 11, color: "#9db88a", lineHeight: 1.4 }}>{c}</div>
          ))}
        </div>
      )}
    </section>
  );
}

export default DecisionWhyPanel;
