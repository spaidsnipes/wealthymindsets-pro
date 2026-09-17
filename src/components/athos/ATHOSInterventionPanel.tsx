"use client";
import * as React from "react";
import type {
  ATHOSIntervention,
  ATHOSVerdict,
} from "@/lib/traderMemory/viewModels/selectATHOSIntervention";
import { rankInterventions } from "@/lib/traderMemory/viewModels/selectATHOSIntervention";
import { WM } from "@/lib/design/wmTokens";

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
  // "Quiet" is the verdict that says ATHOS observed and found nothing worth
  // saying. That is a FINDING, and it was painted #5A6575 — 3.55:1 at best,
  // below AA on every surface. Silence being a feature does not make silence
  // unreadable. `muted` is the floor for any statement about absence.
  NONE:      { text: WM.text.muted, border: "rgba(90,101,117,0.3)", glyph: "○", label: "Quiet" },
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
  /**
   * MY CONTAINER IS ALREADY THE DISCLOSURE.
   *
   * Two changes, and they are the same decision seen from two sides.
   *
   * 1. NO SILENT NULL — AND THIS IS AN EXCEPTION TO §14, ARGUED NOT ASSUMED.
   *    Founder doctrine §14 says "silence is a feature": ATHOS does not
   *    announce that it has nothing to say. That doctrine governs the
   *    UNPROMPTED case, and it is right — an unasked-for "nothing to report"
   *    banner on every deck render is noise. But §14 was written before
   *    equipment doors existed. Behind a door the trader has just deliberately
   *    pressed, rendering nothing is a PAINTED DOOR: a control that answers a
   *    press with a blank, indistinguishable from a bug. Silence is the right
   *    answer to a question nobody asked and the wrong answer to one somebody
   *    did. The room's mount is unchanged and still silent.
   *
   * 2. NO SECOND FOLD. The "show N more considerations" toggle is correct in
   *    the room, where the trader has not asked for depth. Behind an opened
   *    door it is a fold inside a drawer the trader already opened, which the
   *    interaction directive bans by name. So when disclosed, the additional
   *    considerations render flat — capped, and the cap says so.
   */
  readonly disclosed?: boolean;
  /**
   * Give the considerations their full depth.
   *
   * Orthogonal to `disclosed` and never to be merged with it. `disclosed`
   * answers "has my container already opened me" — structural, who owns the
   * fold. `unabridged` answers "how much room do I have" — the screen. The
   * equipment drawer is disclosed and NOT unabridged; ENTER is both; the
   * in-room mount is neither.
   *
   * The PRIMARY intervention renders at every width. What ENTER buys is the
   * ranked considerations behind it.
   */
  readonly unabridged?: boolean;
}

export function ATHOSInterventionPanel({
  interventions,
  onDismiss,
  onInspectEvidence,
  className,
  disclosed = false,
  unabridged = false,
}: ATHOSInterventionPanelProps) {
  const ranked = React.useMemo(() => rankInterventions(interventions), [interventions]);
  const [expanded, setExpanded] = React.useState(false);
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());
  const visible = React.useMemo(
    () => ranked.filter((iv) => !dismissedIds.has(iv.id)),
    [ranked, dismissedIds],
  );

  // Infinity, not a bigger number: "as many as I was handed" is the house rule.
  // The cap only bites behind an equipment door, because only there does the
  // panel render the considerations flat; the room's fold is untouched.
  const considerationCap = unabridged ? Number.POSITIVE_INFINITY : 3;

  if (visible.length === 0) {
    // Nobody asked, and there is nothing to say. §14: silence is the whole
    // answer, with zero DOM footprint.
    if (!disclosed) return null;
    // Somebody DID press this door. Silence here would be a painted door.
    return (
      <div data-testid="athos-panel" data-athos-disclosed="1">
        <p
          data-testid="athos-quiet"
          style={{ margin: 0, fontSize: 11, lineHeight: 1.55, color: WM.text.muted }}
        >
          {/* WM, not the internal system name. The component is called ATHOS
              because that is what the machinery is called in here; the trader
              is talking to WM. Caught by a live walk of the prod drawer after
              the rail label had already been written to avoid it. */}
          Nothing to raise — WM has watched this session and found nothing
          worth interrupting you about.
        </p>
      </div>
    );
  }

  const primary = visible[0];
  const additional = visible.slice(1);
  const shownAdditional = additional.slice(0, considerationCap);
  const withheldAdditional = additional.length - shownAdditional.length;
  const style = VERDICT_STYLES[primary.verdict];

  const handleDismiss = () => {
    setDismissedIds(new Set([...dismissedIds, primary.id]));
    onDismiss?.(primary.id);
  };

  /**
   * One author for a consideration row. The room's fold and the equipment
   * door render the SAME row from the SAME ranking — two copies of this markup
   * would be two answers to "what did ATHOS also notice", free to drift.
   */
  const considerationRows = (items: readonly ATHOSIntervention[]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((iv) => {
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
  );

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="athos-panel"
      data-athos-disclosed={disclosed ? "1" : undefined}
      className={["wm-athos-panel", className ?? ""].join(" ")}
      style={{
        // SCENE_FRAGMENTATION cure: verdict-tinted full-box border made
        // ATHOS interventions read as an "AI alert app". The verdict
        // colour (NONE / NOTICE / ADVISORY / CAUTION) still carries via
        // a left accent — the intervention is a contextual layer of the
        // same trader-decision, not a separate destination.
        borderLeft: `3px solid ${style.border.replace(/,0\.[3-5]\)/, ",0.7)")}`,
        padding: "10px 14px 10px 18px",
        background: "transparent",
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

      {additional.length > 0 &&
        (disclosed ? (
          /* Behind an opened door: flat, no second press. Capped by the screen,
             and the cap accounts for itself. */
          <>
            {considerationRows(shownAdditional)}
            {withheldAdditional > 0 && (
              <p
                data-athos-considerations-withheld={withheldAdditional}
                style={{
                  margin: 0,
                  fontSize: 9,
                  lineHeight: 1.55,
                  color: WM.text.muted,
                  fontStyle: "italic",
                }}
              >
                +{withheldAdditional} more consideration
                {withheldAdditional === 1 ? "" : "s"}
              </p>
            )}
          </>
        ) : (
          /* In the room, nobody asked for depth. The fold stays exactly as it
             was — this path is deliberately unchanged. */
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
            {expanded && considerationRows(additional)}
          </>
        ))}
    </div>
  );
}

export default ATHOSInterventionPanel;
