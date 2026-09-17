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
import type { EvidenceStanding } from "@/lib/experience/selectEvidenceDebtLedger";

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

/**
 * §9 — "No green shield. No green means safe. Verified truth is a sentence."
 *
 * CLEARED items used to render in #9db88a, a sage green, directly beside the
 * blocker list. That is the green-means-safe grammar the Build Order bans, and
 * it is the more persuasive half of the panel: the eye reaches the colour
 * before it reads either list, so a decision with four blockers and six
 * clearances read as mostly-fine at a glance.
 *
 * A cleared check is a FINDING — this named condition was satisfied when the
 * snapshot was compiled. The house renders findings in ivory. It is not a
 * verdict about the trade, and clearing every check is not permission; that
 * is why the blocker tones stay warm and nothing here answers them in kind.
 */
const CLEARED = "#ede6d3";

/**
 * THE EVIDENCE LEDGER'S THREE FILLS.
 *
 * Told apart by FILL, not by hue (§9) — the distinction has to survive
 * greyscale and colour-blindness, because it is the distinction the 2026-09-16
 * defect erased. A WARN mark is OUTLINED: evidence is present, which is why it
 * has an edge, and unpaid, which is why it has no body. MISSING is a flat grey
 * with neither. Every mark keeps the same width whatever it is worth — an
 * unpaid node may lose its light but it may never lose its place, or the
 * denominator shrinks to flatter the numerator.
 */
const EVIDENCE_MARK: Record<EvidenceStanding, React.CSSProperties> = {
  RESOLVED: { background: CLEARED, boxShadow: "none" },
  WARN: { background: "transparent", boxShadow: `inset 0 0 0 1px ${KIND_TONE.EVIDENCE_WARN}` },
  MISSING: { background: "rgba(138,130,113,0.22)", boxShadow: "none" },
};

export function DecisionWhyPanel({ vm }: DecisionWhyPanelProps): React.ReactElement {
  const accent = vm.clear ? "#d4af37" : "#e07b5c";
  const ledger = vm.evidenceLedger;

  return (
    <section
      aria-label="Why / why not — decision"
      style={{
        // SCENE_FRAGMENTATION cure: full-box border + tinted background
        // made WHY read as "another app in the room." Founder brief:
        // "Turn WHY / Spaidbot into contextual inspection of the SAME
        // canonical decision" — an aspect, not a resident.
        borderTop: `1px solid ${HAIR}`,
        padding: "12px 0 4px",
        background: "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: 0.6, color: "#c9a55c", textTransform: "uppercase" }}>
          Why {vm.clear ? "" : "not"} · right-of-way
        </span>
        <span style={{ fontSize: 11, letterSpacing: 0.5, color: accent, marginLeft: "auto", textTransform: "uppercase" }}>
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
              <span style={{ fontSize: 11, letterSpacing: 0.4, color: KIND_TONE[b.kind], minWidth: 96, textTransform: "uppercase" }}>
                {KIND_LABEL[b.kind]}
              </span>
              <span style={{ fontSize: 11, color: "#d8cfb8", lineHeight: 1.4 }}>
                <span style={{ color: "#c2b892" }}>{b.label}</span>
                {b.detail && b.detail !== b.label ? <span style={{ color: MUTED }}>{" — "}{b.detail}</span> : null}
              </span>
            </div>
          ))}
          {/* `vm.blockers` is a SAMPLE — its evidence entries come from label
              arrays computeEvidenceDebt caps at 3 per bucket. Rendering it
              without naming the shortfall reads as a complete list of what is
              holding the trade. Name the remainder; never absorb it. */}
          {vm.blockerCount > vm.blockers.length && (
            <div
              data-testid="decision-why-blockers-remainder"
              style={{ fontSize: 10, color: MUTED, lineHeight: 1.4, fontStyle: "italic", paddingTop: 2 }}
            >
              +{vm.blockerCount - vm.blockers.length} more blocking, not named here
            </div>
          )}
        </div>
      )}

      {/* THE EVIDENCE DEBT, GIVEN A SHAPE.
          `selectDecisionWhyNot` files "5/8 evidence nodes paid." into
          `clearances` below — the affirmative column — so a chain with three
          unpaid nodes reports its own shortfall under CLEARED. The fraction is
          true; the placement is what flatters. The strip is drawn ABOVE the
          clearances so the unpaid remainder is seen before the sentence that
          files it, and every mark holds its width so the remainder cannot be
          absorbed. Nothing here is measured: the selector partitions a debt
          the compiler already resolved. */}
      {ledger && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: 0.5, color: MUTED, marginBottom: 4 }}>
            EVIDENCE DEBT
          </div>
          <div
            data-testid="decision-why-evidence-band"
            data-payable={ledger.payable}
            data-resolved={ledger.resolved}
            data-unpaid={ledger.unpaid}
            aria-hidden="true"
            style={{ display: "flex", gap: 2 }}
          >
            {ledger.marks.map((mark, i) => (
              <span
                key={i}
                data-testid="decision-why-evidence-mark"
                data-standing={mark.standing}
                style={{
                  flex: "1 1 0",
                  minWidth: 0,
                  height: 4,
                  borderRadius: 1,
                  ...EVIDENCE_MARK[mark.standing],
                }}
              />
            ))}
          </div>
          {/* The band is aria-hidden, so this sentence IS the reading for a
              screen reader — it may not be a caption on a picture, it has to
              carry the whole count on its own. */}
          <p
            data-testid="decision-why-evidence-caption"
            style={{ margin: "6px 0 0", fontSize: 11, lineHeight: 1.5, color: MUTED }}
          >
            {ledger.unpaid === 0
              ? `All ${ledger.payable} payable evidence nodes are resolved.`
              : `${ledger.unpaid} of ${ledger.payable} evidence nodes unpaid — ` +
                `${ledger.warn} below confirmation, ${ledger.missing} with no indicator.`}
            {ledger.watch > 0
              ? ` ${ledger.watch} watch node${ledger.watch === 1 ? "" : "s"} sit outside this ledger and are not drawn.`
              : ""}
          </p>
        </div>
      )}

      {vm.clearances.length > 0 && (
        <div style={{ marginBottom: vm.invalidators.length ? 10 : 0 }}>
          <div style={{ fontSize: 11, letterSpacing: 0.5, color: MUTED, marginBottom: 4 }}>CLEARED</div>
          {vm.clearances.map((c, i) => (
            <div key={i} style={{ fontSize: 11, color: CLEARED, lineHeight: 1.4 }}>{c}</div>
          ))}
        </div>
      )}

      {vm.invalidators.length > 0 && (
        <div
          style={{ paddingTop: 6, borderTop: `1px solid ${HAIR}` }}
          data-testid="decision-why-invalidators"
        >
          {/* canon §Phase 3 Market Canvas — WHAT WOULD INVALIDATE.
              Only meaningful for ACTION verdicts (the trader is about to
              place; they need to know what observation would flip this). */}
          <div style={{ fontSize: 11, letterSpacing: 0.5, color: "#c9a55c", marginBottom: 4, textTransform: "uppercase" }}>
            Would invalidate
          </div>
          {vm.invalidators.map((s, i) => (
            <div key={i} style={{ fontSize: 11, color: "#d8cfb8", lineHeight: 1.4 }}>{s}</div>
          ))}
        </div>
      )}
    </section>
  );
}

export default DecisionWhyPanel;
