"use client";

/**
 * DecisionReceiptPanel — compact renderer for selectDecisionReceipt (canon P8
 * "Decision Receipt").
 *
 * Projects a sealed DecisionMemoryRecord into the trader-facing receipt: the
 * verbatim commitment, the verifiable process facts, the append-only
 * management trail, the attached outcome, and — only if the trader recorded
 * one — their own Decision-Quality Split. It renders NO composite grade of its
 * own (respecting the "score addiction" weakness); a disciplined WAIT / NO_TRADE
 * reads as a complete decision, never a debt. Pure display — never invents.
 */

import * as React from "react";
import type {
  DecisionReceiptVM,
  ReceiptTone,
  ReceiptFact,
} from "@/lib/traderMemory/viewModels/selectDecisionReceipt";

export interface DecisionReceiptPanelProps {
  readonly vm: DecisionReceiptVM;
}

const TONE_COLOR: Record<ReceiptTone, string> = {
  affirm: "#9db88a", // green — process honored
  neutral: "#c2b892", // parchment — informational
  flag: "#e07b5c", // amber — needs attention
};

const STAGE_COLOR: Record<string, string> = {
  SEALED: "#c9a55c",
  MANAGED: "#d4af37",
  CLOSED: "#c2b892",
  REVIEWED: "#9db88a",
};

const MUTED = "#8a8271";
const HAIR = "rgba(139,106,41,0.22)";

const SPLIT_LABEL: Record<string, string> = {
  marketOpportunityQuality: "Opportunity",
  playbookMatch: "Playbook",
  riskQuality: "Risk",
  executionQuality: "Execution",
  processAdherence: "Process",
};

function fmtTime(ms: number): string {
  try {
    return new Date(ms).toISOString().replace("T", " ").slice(0, 19) + "Z";
  } catch {
    return String(ms);
  }
}

function FactRow({ fact }: { fact: ReceiptFact }): React.ReactElement {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
      <span style={{ fontSize: 10, letterSpacing: 0.4, color: MUTED, minWidth: 108, textTransform: "uppercase" }}>
        {fact.label}
      </span>
      <span style={{ fontSize: 11, color: TONE_COLOR[fact.tone], lineHeight: 1.4 }}>{fact.value}</span>
    </div>
  );
}

export function DecisionReceiptPanel({ vm }: DecisionReceiptPanelProps): React.ReactElement {
  const stageColor = STAGE_COLOR[vm.stage] ?? MUTED;

  return (
    <section
      aria-label="Decision receipt"
      style={{
        border: `1px solid ${HAIR}`,
        borderRadius: 10,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.015)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: 0.6, color: "#c9a55c", textTransform: "uppercase" }}>
          Decision Receipt
        </span>
        <span style={{ fontSize: 10, letterSpacing: 0.5, color: stageColor, marginLeft: "auto", textTransform: "uppercase" }}>
          {vm.stage}
        </span>
      </div>

      <div style={{ fontSize: 12, color: "#d8cfb8", lineHeight: 1.4, marginBottom: vm.empty ? 0 : 10 }}>
        {vm.headline}
      </div>

      {vm.empty ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {vm.thesis && (
            <div style={{ fontSize: 11, color: MUTED, fontStyle: "italic", lineHeight: 1.4 }}>
              &ldquo;{vm.thesis}&rdquo;
            </div>
          )}

          {vm.commitment.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 9, letterSpacing: 0.5, color: MUTED, marginBottom: 2 }}>COMMITMENT</div>
              {vm.commitment.map((f, i) => (
                <FactRow key={i} fact={f} />
              ))}
            </div>
          )}

          {vm.processFacts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 9, letterSpacing: 0.5, color: MUTED, marginBottom: 2 }}>PROCESS</div>
              {vm.processFacts.map((f, i) => (
                <FactRow key={i} fact={f} />
              ))}
            </div>
          )}

          {vm.managementTrail.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 9, letterSpacing: 0.5, color: MUTED, marginBottom: 2 }}>MANAGEMENT TRAIL</div>
              {vm.managementTrail.map((m, i) => (
                <div key={i} style={{ fontSize: 11, color: "#c2b892", lineHeight: 1.4 }}>
                  <span style={{ color: "#c9a55c" }}>{m.type}</span>
                  {" — "}
                  {m.detail}
                  <span style={{ color: MUTED }}>{"  @ "}{fmtTime(m.at)}</span>
                </div>
              ))}
            </div>
          )}

          {vm.outcome && (
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", borderTop: `1px solid ${HAIR}`, paddingTop: 8 }}>
              <span style={{ fontSize: 10, letterSpacing: 0.5, color: MUTED, textTransform: "uppercase" }}>Outcome</span>
              <span style={{ fontSize: 12, color: vm.outcome.realizedR >= 0 ? "#9db88a" : "#e07b5c" }}>
                {vm.outcome.realizedR >= 0 ? "+" : ""}
                {vm.outcome.realizedR}R
              </span>
              <span style={{ fontSize: 10, letterSpacing: 0.4, color: MUTED, textTransform: "uppercase" }}>
                {vm.outcome.reason} · {vm.outcome.exitDiscipline === "BY_RULE" ? "by rule" : "discretionary"}
              </span>
            </div>
          )}

          {vm.qualitySplit && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 9, letterSpacing: 0.5, color: MUTED, marginBottom: 2 }}>
                DECISION-QUALITY SPLIT · trader-declared
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {(Object.keys(SPLIT_LABEL) as (keyof typeof SPLIT_LABEL)[]).map((k) => (
                  <span key={k} style={{ fontSize: 11, color: "#c2b892" }}>
                    {SPLIT_LABEL[k]}{" "}
                    <span style={{ color: "#d4af37" }}>
                      {(vm.qualitySplit as unknown as Record<string, number>)[k]}/5
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {vm.lessons.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontSize: 9, letterSpacing: 0.5, color: MUTED, marginBottom: 2 }}>LESSONS</div>
              {vm.lessons.map((l, i) => (
                <div key={i} style={{ fontSize: 11, color: "#c2b892", lineHeight: 1.4 }}>{l}</div>
              ))}
            </div>
          )}

          {vm.pending.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3, borderTop: `1px solid ${HAIR}`, paddingTop: 8 }}>
              {vm.pending.map((p, i) => (
                <div key={i} style={{ fontSize: 10, color: MUTED, fontStyle: "italic", lineHeight: 1.4 }}>{p}</div>
              ))}
            </div>
          )}

          {vm.amendmentCount > 0 && (
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: 0.3 }}>
              {vm.amendmentCount} amendment{vm.amendmentCount === 1 ? "" : "s"} · history preserved
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default DecisionReceiptPanel;
