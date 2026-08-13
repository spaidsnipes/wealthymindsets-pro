"use client";
import * as React from "react";
import type {
  ATHOSIntervention,
  ATHOSVerdict,
} from "@/lib/traderMemory/viewModels/selectATHOSIntervention";
import { rankInterventions } from "@/lib/traderMemory/viewModels/selectATHOSIntervention";

/**
 * ATHOSInterventionPanel — the ATHOS silent-mode consumer.
 *
 * Founder doctrine (§14): "Silence is a feature."
 *  - Empty interventions array → renders NOTHING. Zero DOM footprint.
 *    ATHOS does not announce that it has nothing to say.
 *  - One intervention → single calm panel with the top-ranked verdict.
 *  - Multiple → top-ranked leads; the rest are collapsed under a subtle
 *    "N more considerations" affordance the user may expand.
 *
 * NEVER blocks a user action. NEVER renders a modal. NEVER auto-focuses
 * itself. NEVER reads more than one line aloud (aria-live="polite", not
 * "assertive"). The trader remains sovereign.
 *
 * Evidence class is always visible so the trader can distinguish a
 * SYSTEM_CANDIDATE hypothesis from an OBSERVED fact.
 */

const VERDICT_STYLES: Record<ATHOSVerdict, { text: string; border: string; glyph: string; label: string }> = {
  NONE:      { text: "#5A6575", border: "rgba(90,101,117,0.3)", glyph: "○", label: "Quiet" },
  NOTICE:    { text: "#8892A0", border: "rgba(136,146,160,0.4)", glyph: "•", label: "Notice" },
  ADVISORY:  { text: "#F0B429", border: "rgba(240,180,41,0.4)", glyph: "◐", label: "Advisory" },
  CAUTION:   { text: "#FF7A45", border: "rgba(255,122,69,0.5)", glyph: "!", label: "Caution" },
};

const EVIDENCE_LABEL: Record<string, string> = {
  OBSERVED: "Observed",
  USER_DECLARED: "You reported",
  SYSTEM_CANDIDATE: "Pattern candidate",
  UNKNOWN: "Unknown",
};

export interface ATHOSInterventionPanelProps {
  /** Result of selectATHOSIntervention(). May be empty — panel renders nothing. */
  interventions: readonly ATHOSIntervention[];
  /** Called when the trader dismisses the current intervention. Optional. */
  onDismiss?: (interventionId: string) => void;
  /** Called when the trader clicks an evidence id to drill through. Optional. */
  onInspectEvidence?: (interventionId: string, evidenceId: string) => void;
  className?: string;
}

export function ATHOSInterventionPanel({
  interventions,
  onDismiss,
  onInspectEvidence,
  className,
}: ATHOSInterventionPanelProps) {
  const ranked = React.useMemo(() => rankInterventions(interventions), [interventions]);
  const [expanded, setExpanded] = React.useState(false);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());
  const visible = React.useMemo(
    () => ranked.filter((iv) => !dismissedIds.has(iv.id)),
    [ranked, dismissedIds],
  );

  // Silence is a feature — render literally nothing when there is nothing to say.
  if (visible.length === 0) return null;

  const primary = visible[0];
  const additional = visible.slice(1);
  const style = VERDICT_STYLES[primary.verdict];

  const handleDismiss = () => {
    setDismissedIds(new Set([...dismissedIds, primary.id]));
    onDismiss?.(primary.id);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={["wm-athos-panel", className ?? ""].join(" ")}
      style={{
        border: `1px solid ${style.border}`,
        borderRadius: 8,
        padding: 12,
        background: "rgba(11,11,13,0.9)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            color: style.text,
            fontSize: 14,
            lineHeight: 1,
            marginTop: 2,
            fontWeight: 700,
          }}
        >
          {style.glyph}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 9,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                color: style.text,
                fontWeight: 800,
              }}
            >
              {style.label}
            </span>
            <span style={{ fontSize: 9, color: "#55503f" }}>·</span>
            <span
              style={{
                fontSize: 9,
                letterSpacing: 0.3,
                textTransform: "uppercase",
                color: "#8892A0",
              }}
              title="Evidence class — SYSTEM_CANDIDATE is a hypothesis, not a fact"
            >
              {EVIDENCE_LABEL[primary.evidenceClass] ?? primary.evidenceClass}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "#ede6d3", lineHeight: 1.5, fontWeight: 500 }}>
            {primary.headline}
          </div>
          {primary.detail && (
            <div style={{ fontSize: 11, color: "#8a8271", lineHeight: 1.5, marginTop: 4 }}>
              {primary.detail}
            </div>
          )}
          {onInspectEvidence && primary.evidenceIds.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {primary.evidenceIds.slice(0, 4).map((eid) => (
                <button
                  key={eid}
                  type="button"
                  onClick={() => onInspectEvidence(primary.id, eid)}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(139,106,41,0.35)",
                    color: "#c9a55c",
                    fontSize: 9,
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                    padding: "6px 10px",
                    minHeight: 28,
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                  aria-label={`Inspect evidence ${eid}`}
                >
                  → evidence
                </button>
              ))}
              {primary.evidenceIds.length > 4 && (
                <span style={{ fontSize: 9, color: "#55503f", alignSelf: "center" }}>
                  +{primary.evidenceIds.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss this intervention"
            style={{
              background: "transparent",
              border: "none",
              color: "#55503f",
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
              minWidth: 24,
              minHeight: 24,
            }}
          >
            ×
          </button>
        )}
      </div>

      {additional.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            style={{
              background: "transparent",
              border: "none",
              color: "#8892A0",
              cursor: "pointer",
              fontSize: 10,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              textAlign: "left",
              padding: "4px 0",
              alignSelf: "flex-start",
            }}
          >
            {expanded ? "hide" : "show"} {additional.length} more consideration{additional.length === 1 ? "" : "s"}
          </button>
          {expanded && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {additional.map((iv) => {
                const st = VERDICT_STYLES[iv.verdict];
                return (
                  <div
                    key={iv.id}
                    style={{
                      display: "flex",
                      gap: 8,
                      padding: 8,
                      borderLeft: `2px solid ${st.border}`,
                      background: "rgba(19,19,23,0.5)",
                    }}
                  >
                    <span style={{ color: st.text, fontSize: 12 }} aria-hidden="true">{st.glyph}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "#8a8271", marginBottom: 2 }}>
                        {st.label} · {EVIDENCE_LABEL[iv.evidenceClass] ?? iv.evidenceClass}
                      </div>
                      <div style={{ fontSize: 12, color: "#ede6d3" }}>{iv.headline}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ATHOSInterventionPanel;
