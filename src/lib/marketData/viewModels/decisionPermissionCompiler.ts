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
  /**
   * Size of the LEDGER — the nodes that carry a gradeable indicator, and so
   * the only honest denominator for "X of N paid".
   *
   * Invariant, enforced by test: `payable === resolved + missing + warn`.
   *
   * ── The measured defect this field exists to end ──────────────────────────
   *
   * This used to be `total`, defined as `nodes.length`. But WATCH nodes are
   * deliberately counted in NONE of the three buckets — the loop below says so
   * in its own comment: "WATCH is neither paid nor blocking — not counted".
   * So `nodes.length` put nodes in the denominator that could never appear in
   * any numerator.
   *
   * Observed live on https://wealthymindsetspro.com/command-deck, two lines
   * apart inside the SAME card:
   *
   *     EVIDENCE DEBT   0 of 9 paid
   *     8 evidence nodes unpaid: regime + direction +6
   *
   * Zero paid plus eight unpaid is eight, not nine. The ninth node was a WATCH
   * node: present in the denominator, absent from every count that explains it.
   * LIVING-PIXEL LAW — that 9 had no owner anywhere on the screen.
   *
   * It also made `resolved === total` unreachable for any chain holding a
   * WATCH node, so the ribbon's "authorization complete" branch was dead code
   * on exactly the chains that were closest to complete.
   *
   * The rename from `total` is deliberate. Silently redefining a field leaves
   * every existing reader looking correct while meaning something new; renaming
   * makes the compiler walk every call site, which is what a change to the
   * meaning of a denominator deserves.
   */
  readonly payable: number;
  /**
   * Nodes observed but NOT part of the ledger — WATCH indicators.
   *
   * Surfaced rather than discarded so the difference between `payable` and the
   * chain's length always has a name a surface can print. An unexplained gap
   * between two counts is how the defect above stayed invisible.
   */
  readonly watch: number;
  readonly resolved: number;
  readonly missing: number;
  readonly warn: number;
  /**
   * First-few UNKNOWN-indicator node labels for surface detail.
   * TRUNCATED — never use `.length` as a count of missing evidence.
   * The authoritative count is `missing`. See hiddenRemainder().
   */
  readonly missingLabels: readonly string[];
  /**
   * First-few WARN-indicator node labels for surface detail.
   * TRUNCATED — the authoritative count is `warn`.
   */
  readonly warnLabels: readonly string[];
}

/** Max labels retained for surface detail. Counts are never capped. */
export const EVIDENCE_LABEL_SAMPLE_LIMIT = 3;

/**
 * Suffix for "a + b +N" label lists.
 *
 * Real from-USE defect (2026-09-03): both /command-deck surfaces computed this
 * from `missingLabels.length` — an array capped at 3 — while the leading count
 * came from the true `missing` total. With 9 missing nodes the strip rendered
 * "9 evidence nodes unpaid: regime + direction +1", so the "+1" contradicted
 * the "9" in the same sentence (LIVING-PIXEL LAW: the 1 had no owner).
 *
 * The remainder MUST derive from the authoritative count.
 */
export function hiddenRemainder(trueCount: number, shownLabels: number): string {
  const hidden = trueCount - shownLabels;
  return hidden > 0 ? ` +${hidden}` : "";
}

/**
 * ── 2026-09-18: THE SUFFIX HAD AN OWNER. THE PHRASE DID NOT. ──────────────
 *
 * `hiddenRemainder` above owns the "+N". It does not own the three lines that
 * must surround it, and those three lines were re-typed at SIX call sites:
 *
 *   selectOneStory.missingPhrase        (missing)   correct
 *   selectOneStory.missingPhrase        (warn)      correct
 *   computeRightOfWay                   (missing)   correct
 *   selectOneNextThing                  (missing)   correct
 *   CommandContextRibbon detail         (missing)   correct
 *   CommandContextRibbon detail         (warn)      DRIFTED — no remainder
 *
 * The sixth is one line below the fifth, in one template literal, in one file.
 * Five correct copies did not make the sixth correct; they only made it look
 * correct, because a reader scanning the file sees `hiddenRemainder` and stops.
 * That is the whole argument for an owner over a convention: a convention is
 * re-decided at every call site, and the sixth decision was wrong.
 *
 * Found the same day as selectQuestionFocus's silent truncation, which was a
 * SEVENTH instance of the same three lines. Fixing instance six and seven
 * without giving the phrase an owner would only have set up instance eight.
 *
 * §24: a second CALLER of one owner is fine, a second ANSWER is not.
 *
 * Casing is a parameter because it is genuinely per-surface — the ribbon and
 * the story speak lowercase mid-sentence ("need regime + direction +3"), the
 * question focus speaks Title Case as a label ("Regime + Direction +3"). That
 * is typography, not a second answer about what is hidden.
 */
export function sampledLabelPhrase(
  labels: readonly string[],
  trueCount: number,
  opts: { readonly limit?: number; readonly lowercase?: boolean } = {},
): string {
  const limit = opts.limit ?? 2;
  const shown = labels.slice(0, limit);
  const desc = (opts.lowercase ? shown.map(l => l.toLowerCase()) : shown).join(" + ");
  return `${desc}${hiddenRemainder(trueCount, shown.length)}`;
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
      if (missingLabels.length < EVIDENCE_LABEL_SAMPLE_LIMIT) missingLabels.push(n.label);
    } else if (n.indicator === "WARN") {
      warn += 1;
      if (warnLabels.length < EVIDENCE_LABEL_SAMPLE_LIMIT) warnLabels.push(n.label);
    }
    // WATCH is neither paid nor blocking — not counted; render as
    // observed-but-not-blocking downstream if surface wants to show it.
  }
  // The LEDGER is exactly the nodes that carry a gradeable indicator. WATCH
  // nodes are observed but ungradeable, so they are named separately rather
  // than padding a denominator no numerator can ever reach.
  const payable = resolved + missing + warn;
  return {
    payable,
    watch: nodes.length - payable,
    resolved,
    missing,
    warn,
    missingLabels,
    warnLabels,
  };
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
    // Remainder derives from the AUTHORITATIVE count, never the capped array.
    const need = sampledLabelPhrase(debt.missingLabels, debt.missing, { lowercase: true });
    return {
      value: "WAIT",
      detail: `evidence debt: need ${need}`,
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
  // Rule 4 — ALLOWED only clears the trader-rule layer. It cannot certify a
  // prerequisite ledger that was never evaluated (or contains only WATCH).
  if (perm?.verdict === "ALLOWED") {
    if (debt && debt.warn > 0) {
      // Warn nodes exist but no missing — downgrade ACTION to CAUTION.
      return {
        value: "CAUTION",
        detail: `${debt.warn} watch node${debt.warn === 1 ? "" : "s"}`,
        tone: "pending",
      };
    }
    if (!debt || !(debt.payable > 0) || !(debt.resolved > 0)) {
      return {
        value: "UNKNOWN",
        detail: "required evidence not evaluated",
        tone: "unknown",
      };
    }
    return {
      value: "ACTION",
      detail: "required evidence paid · steward allows",
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
