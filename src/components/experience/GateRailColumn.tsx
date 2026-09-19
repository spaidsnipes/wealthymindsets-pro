"use client";

/**
 * THE GATE RAIL, GIVEN PIXELS — "ONE CONNECTED GATE RAIL."
 *
 * Visual source: WM_NewMockup_133_Gates_One_Rail_Debt.jpg (2026-09-18).
 * Contract source: `src/lib/experience/gateRail.ts`.
 *
 * ── WHAT THE WORD "CONNECTED" IS DOING IN THE HEADING ────────────────────────
 *
 * The mockup does not draw six gate cards. It draws six rungs joined by a
 * single vertical spine, with the debt column hanging off the same spine. That
 * is a claim about the subject matter, not a decoration: these six gates are
 * six readings of ONE decision, and six separate cards would let a trader take
 * four of them seriously and skip the two that disagree.
 *
 * So the spine is a real element here, and the debt marks sit on it rather than
 * inside each rung.
 *
 * ── WHERE THIS DEPARTS FROM THE MOCKUP, AND WHY ──────────────────────────────
 *
 * The mockup paints cleared gates green and owing gates red. §9 is explicit
 * that honesty is not colour-coded — "no green shield, no green means safe" —
 * and the reason is not aesthetic: a trader who learns the hue stops reading
 * the word, and then a rail that loses its colour in bright sun, on a dim
 * monitor, or to a colour-blind eye has lost its entire content.
 *
 * The mockup is a visual build instruction for LAYOUT, SPINE and DEBT COLUMN.
 * The palette obeys the house. The three standings are told apart by FILL and
 * WEIGHT:
 *
 *   ANSWERED    filled mark, ivory label
 *   UNANSWERED  hollow mark, parchment label
 *   UNASKED     no mark at all, muted italic label
 *
 * UNASKED getting no mark is the honest one. A question mark, which is what the
 * mockup gives the arguing gates, would be a claim that somebody asked.
 *
 * ── AND THE LINE UNDER STANCE ────────────────────────────────────────────────
 *
 * Both facts, printed together, always. See gateRail.ts — the failure this
 * guards is a rail that stops drawing the debt column once the wait clears,
 * because the debt column looked like it was ABOUT the wait.
 */

import * as React from "react";

import {
  buildGateRail,
  unaskedGates,
  waitVerdict,
  type GateName,
  type GateRung,
} from "@/lib/experience/gateRail";

/* ── PALETTE ───────────────────────────────────────────────────────────────── */

const BRASS = "#c9a55c";
const IVORY = "#ede6d3";
const PARCHMENT = "#c2b892";
const MUTED = "#8a8271";
const HAIR = "rgba(139,106,41,0.22)";

/** The gate names as a trader reads them, not as the type spells them. */
const GATE_LABEL: Record<GateName, string> = {
  REGIME: "Regime",
  DIRECTION: "Direction",
  LOCATION: "Location",
  ORDER_FLOW: "Order flow",
  CLC: "CLC",
  AVAILABLE_R: "Available R",
};

export interface GateRailColumnProps {
  /**
   * What the house has asked and what it heard back. A gate absent from this
   * map is UNASKED — which owes debt. Undefined means the house has not put a
   * single question yet, and that is a different picture from an empty map.
   */
  readonly answers?: Partial<Record<GateName, boolean>>;
  /** About TIME, and supplied separately because it is a separate fact. */
  readonly waitFinished?: boolean;
  /** Printed in the header. Null when no decision has been minted. */
  readonly decisionId?: string | null;
}

function Rung({ rung }: { readonly rung: GateRung }): React.ReactElement {
  const answered = rung.standing === "ANSWERED";
  const unasked = rung.standing === "UNASKED";

  return (
    <li
      data-testid={`gate-rung-${rung.gate}`}
      data-standing={rung.standing}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 0",
        listStyle: "none",
        borderBottom: `1px solid ${HAIR}`,
      }}
    >
      {/* THE MARK. Fill, not hue. UNASKED gets none — a question mark would be
          a claim that somebody asked. */}
      <span
        data-testid={`gate-mark-${rung.gate}`}
        aria-hidden
        style={{
          width: 9,
          height: 9,
          flex: "0 0 auto",
          borderRadius: "50%",
          border: unasked ? `1px dashed ${MUTED}` : `1px solid ${BRASS}`,
          background: answered ? BRASS : "transparent",
        }}
      />
      <span
        style={{
          flex: 1,
          fontSize: 12,
          letterSpacing: 0.4,
          color: answered ? IVORY : unasked ? MUTED : PARCHMENT,
          fontStyle: unasked ? "italic" : "normal",
          fontWeight: answered ? 600 : 400,
        }}
      >
        {GATE_LABEL[rung.gate]}
      </span>

      {/* THE DEBT COLUMN, on the same spine. Present or absent — never a
          quantity, because a gate is not partly owed (§15). */}
      <span
        data-testid={`gate-debt-${rung.gate}`}
        data-owes={rung.owesDebt ? "true" : "false"}
        style={{
          fontSize: 9,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: rung.owesDebt ? PARCHMENT : MUTED,
          border: rung.owesDebt ? `1px solid ${HAIR}` : "1px solid transparent",
          borderRadius: 3,
          padding: "1px 5px",
        }}
      >
        {rung.owesDebt ? "Debt" : "Paid"}
      </span>
    </li>
  );
}

export function GateRailColumn({
  answers,
  waitFinished = false,
  decisionId = null,
}: GateRailColumnProps): React.ReactElement {
  /**
   * NEVER LOOKED vs LOOKED AND FOUND NOTHING.
   *
   * `answers === undefined` is the house not having put a question. Drawing
   * six UNASKED rungs for it would state a finding nobody made — the rail
   * would report five silent gates as though it had gone and checked.
   */
  if (answers === undefined) {
    return (
      <section
        data-testid="gate-rail"
        data-interrogated="false"
        style={{ border: `1px solid ${HAIR}`, borderRadius: 8, padding: "8px 12px" }}
      >
        <div style={{ fontSize: 10, letterSpacing: 1, color: MUTED, textTransform: "uppercase" }}>
          One connected gate rail
        </div>
        <p data-testid="gate-rail-unasked" style={{ fontSize: 11, color: MUTED, margin: "4px 0 0" }}>
          No gate has been put to this decision. The rail has not been read.
        </p>
      </section>
    );
  }

  const rail = buildGateRail(answers);
  const verdict = waitVerdict(rail, waitFinished);
  const owed = unaskedGates(rail);

  return (
    <section
      data-testid="gate-rail"
      data-interrogated="true"
      data-debt={String(rail.debt)}
      style={{ border: `1px solid ${HAIR}`, borderRadius: 8, padding: "8px 12px" }}
    >
      <div style={{ fontSize: 10, letterSpacing: 1, color: MUTED, textTransform: "uppercase" }}>
        One connected gate rail
      </div>
      <div data-testid="gate-rail-decision" style={{ fontSize: 12, color: BRASS, letterSpacing: 0.8 }}>
        {decisionId ? `DECISION_ID ${decisionId}` : "No decision minted"}
      </div>

      {/* THE SPINE. Six readings of ONE decision — six separate cards would let
          a trader take four seriously and skip the two that disagree. */}
      <ul
        data-testid="gate-rail-spine"
        style={{
          margin: "6px 0 0",
          padding: "0 0 0 10px",
          borderLeft: `1px solid ${HAIR}`,
        }}
      >
        {rail.rungs.map((rung) => (
          <Rung key={rung.gate} rung={rung} />
        ))}
      </ul>

      {/* BOTH FACTS, PRINTED TOGETHER, ALWAYS. */}
      <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${HAIR}` }}>
        <div style={{ fontSize: 10, letterSpacing: 1, color: MUTED, textTransform: "uppercase" }}>
          Stance
        </div>
        <div
          data-testid="gate-rail-wait-line"
          data-wait-finished={String(verdict.waitFinished)}
          data-debt-remains={String(verdict.debtRemains)}
          style={{ fontSize: 11, color: verdict.debtRemains ? PARCHMENT : IVORY }}
        >
          {verdict.line}
        </div>

        {/* NAMED, NOT COUNTED. A count says how much is owed; only the names
            say what to go and do. */}
        {owed.length > 0 ? (
          <div data-testid="gate-rail-unasked-names" style={{ fontSize: 10, color: MUTED, marginTop: 3 }}>
            Not yet asked: {owed.map((g) => GATE_LABEL[g]).join(" · ")}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default GateRailColumn;
