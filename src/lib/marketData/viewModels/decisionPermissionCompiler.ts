/**
 * decisionPermissionCompiler — Founder 2029 Integration Glue canon
 * §NEW GLUE INVENTION — DECISION PERMISSION COMPILER (2026-08-20).
 *
 * Canon verbatim:
 *   "Right of Way must be compiled from explicit prerequisite
 *    contracts, not blended confidence. Each strategy/model defines
 *    REQUIRED, OPTIONAL, CONTRADICTORY, and DISQUALIFYING evidence.
 *    Required unpaid debt blocks authorization. ... The compiler
 *    returns ACTION / WAIT / NO TRADE plus exact reasons and cannot
 *    be overridden by a decorative confidence score."
 *
 * This module is the compiler. It:
 *   1. Reduces a decision-chain node array to an EvidenceDebt view.
 *   2. Combines EvidenceDebt with a PermissionVM into a deterministic
 *      RightOfWay verdict (ACTION / WAIT / NO TRADE / CAUTION / UNKNOWN).
 *   3. Guarantees by construction that RightOfWay cannot say ACTION
 *      while EvidenceDebt has missing nodes (canon rejection #1).
 *
 * PURE / DETERMINISTIC — no I/O, no clock, no fabrication. Test-first
 * so the guarantee survives every future refactor.
 */

import type { DecisionChainNode } from "./selectDecisionChain";
import type { PermissionVM } from "@/lib/traderMemory/viewModels/selectPermission";

export interface EvidenceDebt {
  readonly total: number;
  readonly resolved: number;
  readonly missing: number;
  readonly warn: number;
  /** First-few UNKNOWN-indicator node labels for surface detail. */
  readonly missingLabels: readonly string[];
  /** First-few WARN-indicator node labels for surface detail. */
  readonly warnLabels: readonly string[];
}

export type RightOfWay = "ACTION" | "WAIT" | "NO TRADE" | "CAUTION" | "UNKNOWN";
export type RightOfWayTone = "resolved" | "pending" | "unknown" | "warn";

export interface RightOfWayReading {
  readonly value: RightOfWay;
  readonly detail: string;
  readonly tone: RightOfWayTone;
}

const MAX_LABEL_CHARS = 40;
function trim(reason: string | undefined, fallback: string): string {
  if (!reason) return fallback;
  return reason.length > MAX_LABEL_CHARS ? reason.slice(0, MAX_LABEL_CHARS) + "…" : reason;
}

/** Deterministic reduction of decision-chain nodes to Evidence Debt. */
export function computeEvidenceDebt(
  nodes: readonly DecisionChainNode[] | undefined,
): EvidenceDebt | null {
  if (!nodes || nodes.length === 0) return null;
  let resolved = 0;
  let missing = 0;
  let warn = 0;
  const missingLabels: string[] = [];
  const warnLabels: string[] = [];
  for (const n of nodes) {
    if (n.indicator === "OK") {
      resolved += 1;
    } else if (n.indicator === "UNKNOWN") {
      missing += 1;
      if (missingLabels.length < 3) missingLabels.push(n.label);
    } else if (n.indicator === "WARN") {
      warn += 1;
      if (warnLabels.length < 3) warnLabels.push(n.label);
    }
    // WATCH is neither paid nor blocking — not counted; render as
    // observed-but-not-blocking downstream if surface wants to show it.
  }
  return { total: nodes.length, resolved, missing, warn, missingLabels, warnLabels };
}

/**
 * Compile Right of Way from (permission, evidence debt).
 *
 * Strict deterministic priority — Rule 1 is the canon rejection #1
 * guarantee. Rule 1 is checked BEFORE every downstream permission
 * verdict, including ALLOWED. This means the surface can NEVER read
 * ACTION while there is missing evidence, regardless of what
 * selectPermission returned.
 */
export function computeRightOfWay(
  perm: PermissionVM | null,
  debt: EvidenceDebt | null,
): RightOfWayReading {
  // Rule 1 — Missing evidence blocks Right of Way (canon rejection #1).
  if (debt && debt.missing > 0) {
    const missingDesc = debt.missingLabels
      .slice(0, 2)
      .map(l => l.toLowerCase())
      .join(" + ");
    const rest = debt.missingLabels.length > 2 ? " +" + (debt.missingLabels.length - 2) : "";
    return {
      value: "WAIT",
      detail: `evidence debt: need ${missingDesc}${rest}`,
      tone: "warn",
    };
  }
  // Rule 2 — Explicit permission block.
  if (perm?.verdict === "RESTRICTED") {
    const reason = (perm as unknown as { reason?: string }).reason;
    return { value: "NO TRADE", detail: trim(reason, "hard rule engaged"), tone: "warn" };
  }
  // Rule 3 — Explicit permission caution.
  if (perm?.verdict === "ADVISORY") {
    const reason = (perm as unknown as { reason?: string }).reason;
    return { value: "CAUTION", detail: trim(reason, "soft rule engaged"), tone: "pending" };
  }
  // Rule 4 — Permission ALLOWED and no missing evidence.
  if (perm?.verdict === "ALLOWED") {
    if (debt && debt.warn > 0) {
      // Warn nodes exist but no missing — downgrade ACTION to CAUTION.
      return {
        value: "CAUTION",
        detail: `${debt.warn} watch node${debt.warn === 1 ? "" : "s"}`,
        tone: "pending",
      };
    }
    return {
      value: "ACTION",
      detail: "all evidence paid · steward allows",
      tone: "resolved",
    };
  }
  // Rule 5 — Nothing to say honestly.
  return {
    value: "UNKNOWN",
    detail: perm ? "permission unresolved" : "not evaluated",
    tone: "unknown",
  };
}
