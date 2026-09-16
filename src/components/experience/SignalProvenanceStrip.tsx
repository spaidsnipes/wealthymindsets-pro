"use client";

/**
 * SignalProvenanceStrip — the anti-fabrication disclosure, extracted so it can
 * stand where a trader will actually see it.
 *
 * ── THE MEASUREMENT THAT FORCED THIS EXTRACTION ──────────────────────────────
 *
 * `surfaceElementReach.enforcement.test.ts` generalised a rule that
 * `humilityReach` had already stated for one element: A MOUNT NESTED INSIDE
 * `<details>` IS NOT A SURFACE. A disclosure the trader has to open is not a
 * disclosure. Generalising it immediately reported that FIDELITY_CHIPS reached
 * NO screen — the chips live inside `SceneAdmissionPanel`, and both of its
 * mounts (/command-deck's "Open the proof chain", /paper's "show admission")
 * are behind a closed toggle.
 *
 * That measurement is correct, and the honest response was not to write
 * FIDELITY_CHIPS into the debt ledger. The ledger is for surfaces that do not
 * exist. This one exists; it was merely unreachable. HEALING IS NOT HIDING THE
 * WOUND — so the chips move out to where they can be read, and the ledger stays
 * reserved for real absence.
 *
 * ── WHY EXTRACT RATHER THAN RE-RENDER ────────────────────────────────────────
 *
 * The obvious fix — paste a second copy of the chip loop into the deck's
 * always-visible column — would create a SECOND ANSWER to "which signals did WM
 * actually read?". §24 allows a second CALLER of one owner and forbids a second
 * ANSWER. So the loop is lifted into one component, `SceneAdmissionPanel`
 * becomes its first caller, and the deck becomes its second. Both render the
 * same pixels from the same props because they run the same code, not because
 * two edits happened to agree.
 *
 * Presentation only. Reads canonical owners, decides no facts.
 */

import React from "react";

import {
  SIGNAL_GROUPS,
  type SignalGroup,
  type SignalProvenance,
} from "@/lib/experience/deckSceneSignals";

const GOLD = "#d4af37";
const MUTED = "#8a8271";

const GROUP_LABEL: Record<SignalGroup, string> = {
  SESSION: "Session",
  DECISION: "Decision",
  POSITION: "Position",
  ORDERS: "Orders",
  LINK: "Broker link",
};

export interface SignalProvenanceStripProps {
  readonly provenance: Readonly<Record<SignalGroup, SignalProvenance>>;
  readonly observedCount: number;
  readonly totalCount: number;
  /**
   * `full` carries the heading rule and the explanatory sentence — the form
   * that belongs inside the audit panel, where the reader came looking for
   * proof.
   *
   * `inline` drops the rule and the paragraph but keeps EVERY CHIP and the
   * observed/total count. What it removes is framing, never a signal. A compact
   * variant that dropped unobserved groups would be the exact overclaim this
   * strip exists to prevent, so the chip list is not a function of the variant.
   */
  readonly variant?: "full" | "inline";
}

export function SignalProvenanceStrip({
  provenance,
  observedCount,
  totalCount,
  variant = "full",
}: SignalProvenanceStripProps): React.ReactElement {
  /**
   * Named from `provenance`, never from the route. A hard-coded sentence would
   * keep naming a group long after it started being read — the sentence can
   * only ever name groups that actually came back UNOBSERVED.
   */
  const unobservedLabels = React.useMemo(
    () =>
      SIGNAL_GROUPS.filter((g) => provenance[g] !== "OBSERVED").map((g) =>
        GROUP_LABEL[g].toLowerCase(),
      ),
    [provenance],
  );

  const inline = variant === "inline";

  return (
    <div
      data-testid="signal-provenance-strip"
      style={
        inline
          ? { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "baseline" }
          : { borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 8 }
      }
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: MUTED,
          marginBottom: inline ? 0 : 5,
          whiteSpace: "nowrap",
        }}
      >
        Signals observed · {observedCount} / {totalCount}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {SIGNAL_GROUPS.map((g) => {
          const observed = provenance[g] === "OBSERVED";
          return (
            <span
              key={g}
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 5,
                border: `1px solid ${observed ? "rgba(212,175,55,0.45)" : "rgba(138,130,113,0.3)"}`,
                color: observed ? GOLD : MUTED,
                background: observed ? "rgba(212,175,55,0.08)" : "transparent",
                whiteSpace: "nowrap",
              }}
            >
              {GROUP_LABEL[g]} · {observed ? "OBSERVED" : "UNOBSERVED"}
            </span>
          );
        })}
      </div>
      {!inline && unobservedLabels.length > 0 && (
        <p style={{ margin: "7px 0 0", fontSize: 11, lineHeight: 1.5, color: MUTED }}>
          WM has not read {unobservedLabels.join(", ")} on this screen. Those
          signals are not assumed flat or safe — the scene above them is
          compiled only from what was actually seen.
        </p>
      )}
    </div>
  );
}

export default SignalProvenanceStrip;
