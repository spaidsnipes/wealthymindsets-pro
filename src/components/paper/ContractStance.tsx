"use client";

/**
 * WHAT THIS CONTRACT ACTUALLY IS — the §10 EXPRESSION_CARD, on a screen.
 *
 * `selectExpressionCard` was the LAST §10 compiler with no surface. It was
 * declared AWAITING_SURFACE in the screen-reach ledger, and `protectionState`
 * sat underneath it as a DEAD SUBTREE — reachable only from a module nothing
 * rendered. ATHOS "NO ORPHAN BREAKTHROUGHS" calls that incomplete regardless of
 * how well it is tested, and it was very well tested. This is the consumer.
 *
 * ── WHY THIS ROW EXISTS ──────────────────────────────────────────────────────
 *
 * The blotter already showed premium, P&L and DTE. Those are the numbers that
 * feel like knowledge. It did NOT show the two facts that decide whether the
 * trader is actually in trouble:
 *
 *   1. NOTHING IS PROTECTING THIS. Every open paper contract has zero working
 *      protective orders, so §7's grade is UNPROTECTED and the uncovered size
 *      is the whole position. That was true before this component existed; it
 *      was simply never said. §7: "UNPROTECTED means uncovered size exists and
 *      is numbered."
 *
 *   2. R IS UNKNOWN, AND THAT IS A FINDING. /paper never asks for a planned 1R
 *      before an option is bought, so there is no denominator. H1 is explicit:
 *      "If planned 1R is missing: show R as UNKNOWN. Do not invent R from
 *      contract percent." A +67% contract is not 0.67R and must not be allowed
 *      to imply it, so CONTRACT % is rendered as its own labelled field (H13).
 *
 * Making a hole legible is the point. A surface that quietly omitted protection
 * would let a trader believe the product had looked.
 *
 * ── §9 ───────────────────────────────────────────────────────────────────────
 *
 * No green, anywhere — not even when fully covered, because "safe" is exactly
 * the feeling §7 forbids ("No green badge that means safe"). Every state
 * carries a WORD; colour is never the only message.
 */

import { WM } from "@/lib/design/wmTokens";
import type { ExpressionCard } from "@/lib/expressionCard";

export interface ContractStanceProps {
  readonly card: ExpressionCard;
}

/**
 * §7 vocabulary → colour. Exported so Sentinels assert the real mapping rather
 * than grep for hex, and so the two "not covered" grades can be proven distinct
 * from the merely-unverified one.
 */
export function protectionTone(grade: ExpressionCard["protection"]["grade"]): string {
  // Uncovered size exists. This is the loudest honest statement on the row.
  if (grade === "UNPROTECTED") return WM.state.warn;
  // A human is the protection, or the broker could not be read. Both are real
  // findings the trader can act on, and neither is an error (§8).
  if (grade === "MANUAL-DEGRADED" || grade === "UNVERIFIED — LAST KNOWN") return WM.state.watch;
  // BROKER-WORKING / WM-SUPERVISED / FLAT read as ordinary text. Certainty does
  // not get a colour reward (§9).
  return WM.state.neutral;
}

export function ContractStance({ card }: ContractStanceProps) {
  const { protection } = card;

  return (
    <div className="col-span-full px-3 pb-1.5 pt-0.5">
      {/* §7 grammar, verbatim: POSITION n PROTECTED n UNPROTECTED n. */}
      <p role="note" className="text-[9px] leading-relaxed" style={{ color: protectionTone(protection.grade) }}>
        <span className="font-black uppercase tracking-wider mr-1.5">{protection.grade}</span>
        <span className="font-mono">{protection.sentence}</span>
      </p>

      <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px]" style={{ color: WM.state.neutral }}>
        {/* H1/H13 — R and CONTRACT % are different measurements and never merge. */}
        <span>
          <span className="font-black uppercase tracking-wider mr-1">R</span>
          {card.currentR == null
            ? <span title="No planned 1R was recorded before entry, so there is no denominator. R is not inferred from contract percent.">UNKNOWN</span>
            : <span className="font-mono">{card.currentR >= 0 ? "+" : ""}{card.currentR.toFixed(2)}R</span>}
        </span>
        <span>
          <span className="font-black uppercase tracking-wider mr-1">Contract %</span>
          {card.contractReturnPct == null
            ? "UNKNOWN"
            : <span className="font-mono">{card.contractReturnPct >= 0 ? "+" : ""}{card.contractReturnPct.toFixed(1)}%</span>}
        </span>
        {/* CAPITAL DEPLOYED is the debit and is NOT the planned loss. */}
        <span>
          <span className="font-black uppercase tracking-wider mr-1">Deployed</span>
          {card.capitalDeployed == null
            ? "UNKNOWN"
            : <span className="font-mono">${card.capitalDeployed.toFixed(2)}</span>}
        </span>
        <span>
          <span className="font-black uppercase tracking-wider mr-1">Planned loss</span>
          {card.plannedLoss == null
            ? <span title="A planned 1R was never collected for this contract. The debit is not a substitute for it.">NOT SET</span>
            : <span className="font-mono">${card.plannedLoss.toFixed(2)}</span>}
        </span>
        <span>
          <span className="font-black uppercase tracking-wider mr-1">Time</span>
          {card.timeFit}
        </span>
      </p>

      {/* The premium band if the underlying reaches invalidation. /paper records
          no structural invalidation for an option, so this is UNKNOWN and says
          why — a named missing input, not a blank. */}
      <p className="mt-0.5 text-[9px]" style={{ color: WM.state.neutral }}>
        <span className="font-black uppercase tracking-wider mr-1">At invalidation</span>
        {card.atInvalidation.status === "UNKNOWN"
          ? <span>UNKNOWN — {card.atInvalidation.unknownReason ?? "no reason recorded"}</span>
          : <span className="font-mono">{card.atInvalidation.display}</span>}
      </p>
    </div>
  );
}
