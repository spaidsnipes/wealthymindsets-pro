"use client";

import * as React from "react";

import {
  NEVER_GREEN_GRADES,
  type ProtectionGrade,
  type ProtectionState,
} from "@/lib/protectionState";
import { selectProtectionCoverageBar } from "@/lib/protectionCoverageBar";

/**
 * ProtectionGradeLine — §7's grade for the POSITION BOOK.
 *
 * ── What already existed, stated honestly ────────────────────────────────────
 *
 * `PROTECTION_GRADE` is NOT an unrendered element. `ContractStance` has carried
 * the grade and the §7 sentence on /paper's OPTIONS blotter since 2026-09-08,
 * and that is what revived `protectionState` from the screen-reach ledger. This
 * component does not get to claim that credit.
 *
 * Two real holes remained, and they are what this closes:
 *
 *   1. **The equity/futures position book had no grade at all.** `ContractStance`
 *      grades option contracts only. A trader could hold shares or futures with
 *      zero stop coverage and the positions tab said nothing.
 *
 *   2. **The existing grade never reads the order book.** /paper passes
 *      `brokerAckedProtectedQty: 0` as a literal, so the options grade is
 *      UNPROTECTED by construction — true today only because nothing places
 *      protective option orders. It would keep saying UNPROTECTED if something
 *      did. This line is fed by `selectPaperProtection`, which counts the
 *      ACTUAL working stops in the book, so the grade can change when the
 *      truth changes.
 *
 * It is the second half of the RISK attachment, one level below
 * `CapitalPostureLine`: that line says WHETHER you hold something, this one
 * says whether what you hold is COVERED, and numbers the part that is not.
 *
 * ── Material rules (same contract as CapitalPostureLine / AvailableRChip) ─────
 *
 * No box, no card outline, no full-width border — RISK is an aspect of the
 * room, not a resident of it. A 2px brass left-edge hairline is the only
 * structure and its opacity is the only thing the grade changes. Nothing
 * animates: PRICE MAY ONLY MOVE WHEN TRUTH MOVES, and this line carries no
 * price.
 *
 * ── The colour rule is a safety rule ─────────────────────────────────────────
 *
 * BUILD ORDER §9: "No green shield. No green means safe. Verified truth is a
 * sentence." This component has no green in it at ALL — not for
 * `BROKER-WORKING` either. A working stop is a statement about order state, not
 * a promise about outcome; the stop can still gap. So the fully-covered case is
 * rendered as restrained ivory fact, never as reassurance, and the guard test
 * asserts the palette contains no green channel-dominant colour for any grade.
 */
export interface ProtectionGradeLineProps {
  readonly state: ProtectionState;
  /**
   * Which book this grade describes, e.g. "PAPER BOOK". Required, and rendered.
   * A protection grade with no environment on it is the environment-firewall
   * defect in miniature: the same sentence means very different things about a
   * simulated venue and a live one, and the reader cannot tell them apart from
   * the grade alone.
   */
  readonly book: string;
}

/**
 * Brass-family edge accents, loudest where uncovered size exists.
 *
 * Exported so the guard can assert no new palette and no green. `FLAT` is the
 * quietest: a trader holding nothing must not be shouted at, or the one time it
 * matters they will have stopped reading — the same reasoning as `UNREAD` in
 * `CAPITAL_POSTURE_EDGE`.
 */
export const PROTECTION_GRADE_EDGE: Readonly<Record<ProtectionGrade, string>> = {
  UNPROTECTED: "rgba(201,165,92,0.65)",
  "MANUAL-DEGRADED": "rgba(201,165,92,0.55)",
  "WM-SUPERVISED": "rgba(201,165,92,0.40)",
  "UNVERIFIED — LAST KNOWN": "rgba(201,165,92,0.40)",
  "BROKER-WORKING": "rgba(139,106,41,0.30)",
  FLAT: "rgba(139,106,41,0.10)",
};

/** One sentence naming who is holding the uncovered size. */
const GRADE_DETAIL: Readonly<Record<ProtectionGrade, string>> = {
  UNPROTECTED: "No working stop covers this position. You are the protection.",
  "MANUAL-DEGRADED": "Part of this position has no working stop. A human covers the rest.",
  "WM-SUPERVISED": "WM is watching this uncovered size and may send a protective order.",
  "UNVERIFIED — LAST KNOWN":
    "The book could not be read this cycle. This is the last known coverage, not a fresh one.",
  "BROKER-WORKING": "A working stop covers the whole position. A stop can still gap.",
  FLAT: "No position is open, so there is nothing to protect.",
};

export function ProtectionGradeLine({
  state,
  book,
}: ProtectionGradeLineProps): React.ReactElement {
  const isAbsence = state.grade === "FLAT";
  const detail = GRADE_DETAIL[state.grade];
  /**
   * "PROTECTED 2 UNPROTECTED 1" and "PROTECTED 1 UNPROTECTED 2" are one
   * character apart on a line whose entire subject is how much size is exposed.
   * The track ranks them. Same three numbers, no second arithmetic.
   */
  const coverage = selectProtectionCoverageBar(state);

  return (
    <section
      data-testid="protection-grade-line"
      data-grade={state.grade}
      data-uncovered={state.uncoveredQty}
      // Read as one label. A screen reader that announced the grade without the
      // sentence would report "MANUAL-DEGRADED" with no uncovered count, and
      // the count is the part that tells the trader how much is exposed.
      aria-label={`Protection grade, ${book}: ${state.grade}. ${state.sentence}. ${detail}`}
      style={{
        borderLeft: `2px solid ${PROTECTION_GRADE_EDGE[state.grade]}`,
        padding: "8px 14px",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: 9,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: "#c9a55c",
          fontWeight: 800,
        }}
      >
        {book}
      </span>

      <span
        data-testid="protection-grade-label"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 16,
          // An absence is never rendered in the ivory reserved for findings.
          // Every non-green grade keeps brass; BROKER-WORKING is stated as
          // restrained ivory FACT — never a reassuring colour.
          color: isAbsence ? "#8a8271" : NEVER_GREEN_GRADES.includes(state.grade) ? "#c9a55c" : "#ede6d3",
          letterSpacing: 0.2,
        }}
      >
        {state.grade}
      </span>

      {/* The §7 grammar, verbatim from the owner. Rendered even when FLAT,
          because the sentence IS the disclosure. */}
      <span
        data-testid="protection-grade-sentence"
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 11,
          letterSpacing: 0.3,
          color: state.uncoveredQty > 0 ? "#ede6d3" : "#8a8271",
        }}
      >
        {state.sentence}
      </span>

      {/* §9 — "No green shield. No green means safe." Covered size is restrained
          ivory FACT and uncovered size is the loud brass, which is the only
          direction this line is allowed to shout in: a working stop can gap, so
          coverage is never drawn as reassurance, while exposure is drawn as the
          finding it is. An unverified read is hatched rather than solid —
          certainty must not increase because a bar looks tidy. */}
      {coverage ? (
        <span
          data-testid="protection-coverage-bar"
          data-uncovered-pct={Math.round(coverage.uncoveredPct)}
          data-stale={coverage.stale ? "true" : undefined}
          aria-hidden="true"
          style={{
            display: "flex",
            flex: "0 0 120px",
            height: 6,
            borderRadius: 1,
            overflow: "hidden",
            boxShadow: "inset 0 0 0 1px rgba(139,106,41,0.30)",
            opacity: coverage.stale ? 0.55 : 1,
          }}
        >
          <span
            data-testid="protection-coverage-covered"
            style={{
              width: `${coverage.protectedPct}%`,
              background: coverage.stale
                ? "repeating-linear-gradient(135deg, rgba(237,230,211,0.45) 0 2px, transparent 2px 4px)"
                : "rgba(237,230,211,0.55)",
            }}
          />
          <span
            data-testid="protection-coverage-uncovered"
            style={{
              width: `${coverage.uncoveredPct}%`,
              background: coverage.stale
                ? "repeating-linear-gradient(135deg, rgba(201,165,92,0.80) 0 2px, transparent 2px 4px)"
                : "rgba(201,165,92,0.85)",
            }}
          />
        </span>
      ) : null}

      <span
        data-testid="protection-grade-detail"
        style={{
          fontSize: 10,
          letterSpacing: 0.2,
          color: "#8a8271",
          flex: "1 1 220px",
          minWidth: 0,
        }}
      >
        {detail}
      </span>
    </section>
  );
}

export default ProtectionGradeLine;
