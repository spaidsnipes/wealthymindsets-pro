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
  /**
   * The subset of `missingLabels` that something can actually PAY — nodes whose
   * producer declares `payableBy: "EVIDENCE"` or `"DECLARATION"`.
   *
   * ── Why a second list instead of reordering the first ─────────────────────
   *
   * `missingLabels` is consumed by several surfaces that print it as a plain
   * sample of what is unpaid. That reading stays correct: regime IS unpaid, and
   * a surface listing unpaid nodes should still name it. What is NOT correct is
   * INSTRUCTING a trader to go and resolve it — see the `payableBy` doc on
   * DecisionChainNode for the live measurement that produced "Resolve regime".
   *
   * Reordering `missingLabels` would have silently changed every one of those
   * surfaces to serve one caller's need. A separate list changes exactly the
   * caller that asked.
   *
   * TRUNCATED to the same sample limit. Its authoritative count is
   * `missingPayable`.
   */
  readonly missingPayableLabels: readonly string[];
  /**
   * Authoritative count of unpaid nodes that something can pay.
   *
   * INVARIANT: `missingPayable <= missing`. The remainder
   * (`missing - missingPayable`) are compositions that resolve only when their
   * own inputs resolve, plus any node whose producer has not asserted a
   * `payableBy` at all — an unasserted node is NOT counted as payable, because
   * assuming payability is exactly the fabrication this field exists to end.
   */
  readonly missingPayable: number;

  /**
   * Unpaid nodes THIS VENUE CANNOT SUPPLY — measured directly, but not here.
   *
   * These are excluded from `missingPayable`, so the invariant is now
   * `missingPayable + venueBlocked <= missing`. They are counted apart from the
   * composition remainder on purpose: a composition resolves when its inputs
   * do, and telling the trader to wait is honest. A venue-blocked node resolves
   * only if the trader CHANGES FEED, and telling them to wait is a lie with no
   * expiry date.
   *
   * OPTIONAL, unlike `missingPayable` — and the reason is measured, not
   * stylistic. When `missingPayableLabels`/`missingPayable` were added as
   * REQUIRED in 28b6cde8, tsc named sixteen files that had to change and every
   * single one was a TEST: no production site builds an `EvidenceDebt` by hand,
   * they all route through `computeEvidenceDebt` below. Required-ness therefore
   * bought no drift protection from production — it bought a sixteen-file
   * fixture edit. `computeEvidenceDebt` ALWAYS emits both of these fields, and
   * a Sentinel test asserts that it does, which is where the real guarantee
   * lives. `undefined` reads as "this debt was built by a fixture that predates
   * venue-blocking", which correctly yields the old behaviour.
   */
  readonly venueBlockedLabels?: readonly string[];
  /** Authoritative count for `venueBlockedLabels` — never capped. */
  readonly venueBlocked?: number;

  /**
   * THE ROLL — one entry per observed node, in chain order, NEVER capped.
   *
   * ── The measured defect this field exists to end ──────────────────────────
   *
   * MEASURED LIVE 2026-09-20 on https://wealthymindsetspro.com/charts, right
   * rail, BTC · 1h. The evidence ledger rendered as seven anonymous dots:
   *
   *     WAIT  ●●●■■■■
   *
   * Three settled, four outstanding — and not one of the seven says WHICH
   * condition it is. A trader who can see that four things are owed still
   * cannot see what they owe, so the shape is unactionable by construction.
   * The rail then prints ONE name beside it ("Resolve available R") sampled
   * from `missingLabels`, and the other three outstanding nodes go unnamed on
   * the screen at all.
   *
   * The cause is structural, not cosmetic, and it is upstream of every
   * surface: this compiler reduced `DecisionChainNode[]` to counts plus two
   * DELIBERATELY TRUNCATED label arrays, so per-node identity was destroyed
   * here, before any renderer could ask for it. `selectEvidenceLadder`'s own
   * doc block records the consequence honestly — "EvidenceDebt carries counts,
   * not a sequence, so this bar cannot and does not claim node-by-node
   * identity." That refusal was correct given its input. This field fixes the
   * input instead of overruling the refusal.
   *
   * ── WHY NOT JUST RAISE EVIDENCE_LABEL_SAMPLE_LIMIT ────────────────────────
   *
   * Because the sample arrays are a DIFFERENT instrument with a different job:
   * they feed sentences ("need direction + regime +2"), where a cap plus
   * `hiddenRemainder` is the honest construction. Uncapping them would change
   * the meaning of every existing reader of those arrays. The roll is a second
   * CALLER of the same measurement, not a second ANSWER — §24. The counts stay
   * authoritative; the roll never contradicts them, and a Sentinel test in
   * decisionPermissionCompiler.test.ts re-derives every count from the roll.
   *
   * ── WHY WATCH NODES ARE IN IT ─────────────────────────────────────────────
   *
   * The roll is the CHAIN, not the ledger. `payable` still excludes WATCH, and
   * `selectEvidenceLadder` still keeps WATCH out of the bar. A roll that
   * dropped them would recreate the unexplained gap between the chain's length
   * and the ledger's length that the `payable` rename exists to end: with the
   * roll, that difference has one name per node.
   *
   * OPTIONAL for the same measured reason `venueBlocked` is optional: no
   * production site builds an `EvidenceDebt` by hand — every one routes
   * through `computeEvidenceDebt`, which ALWAYS emits the roll. Requiring it
   * would buy a large fixture edit and no drift protection. `undefined` reads
   * as "this debt came from a fixture that carries no identity", and every
   * consumer must then fall back to the anonymous shape, which is the truthful
   * response to an input that genuinely has no names in it.
   */
  readonly roll?: readonly EvidenceRollEntry[];
}

/**
 * One observed node, named.
 *
 * `standing` is the node's indicator re-expressed in the ledger's vocabulary,
 * so a consumer never has to re-decide that UNKNOWN means MISSING — that
 * mapping is made once, here, beside the counts it must agree with.
 */
export interface EvidenceRollEntry {
  /** The node's stable key. Identity for React, never shown to a human. */
  readonly key: string;
  /** The node's own label, verbatim. This compiler renames nothing. */
  readonly label: string;
  readonly standing: "RESOLVED" | "WARN" | "MISSING" | "WATCH";
  /**
   * TRUE only when something can actually pay this node — MISSING, not venue
   * blocked, and its producer declared `payableBy`. Carried per-node so a
   * surface can name what is owed WITHOUT implying the trader can go and work
   * on a composition. Mirrors the `missingPayable` rule exactly; an unasserted
   * node is not payable.
   */
  readonly payableNow: boolean;
  /** Measured directly, but not on this venue. Excluded from `payableNow`. */
  readonly venueBlocked: boolean;
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
 *
 * ── 2026-09-18: NINTH SIGHTING — `selectMateriality.summary` ───────────────
 *
 * `reasons.slice(0, 2).map(REASON_LABEL).join(" · ")` — the same three lines
 * again, minus the remainder. Up to FOUR reasons can fire at once (decision +
 * missing + contradiction + primary), so a trader could be told "decision
 * changed · contradiction surfaced" while two more reasons went unnamed.
 *
 * That phrase is not decoration: `selectSecondaryNoise` passes it through
 * verbatim as the `detail` a surface renders, and unlike the WhyInspector
 * lists there is NO true count printed anywhere beside it. Nothing on that
 * screen could have told the trader something was withheld.
 *
 * `separator` joins `lowercase` as a parameter for the same reason: the debt
 * phrases enumerate co-required evidence ("regime + direction"), the
 * materiality summary enumerates independent events ("decision changed ·
 * contradiction surfaced"). That is typography. It is not a second answer
 * about what is hidden, which is the only thing this function owns.
 */
/**
 * A LABEL IS A NAME. LOWERCASING A NAME CAN DESTROY IT.
 *
 * ── The measured defect ───────────────────────────────────────────────────
 *
 * Production /charts?symbol=TSLA, immediately after the venue-blocking atom
 * landed. The NEXT cell read:
 *
 *     Resolve available r
 *     available r is the first directly-resolvable of 7 unpaid evidence nodes…
 *
 * The node's label is `"Available R"`. The R is the R-multiple — the unit the
 * entire Proof Lane, the journal's Planned/Realized columns and the shutdown
 * gate are denominated in. `.toLowerCase()` applied to the whole string turned
 * a named unit into a stray letter, and "available r" is not a thing the
 * product has ever called anything.
 *
 * `CLC` had the same fate waiting one node further on.
 *
 * ── Why the rule is per-WORD and not per-LABEL ─────────────────────────────
 *
 * Mid-sentence, "Direction" genuinely should read "direction" — sentence case
 * is what makes these sentences read as prose rather than as a form. The
 * defect is not lowercasing; it is lowercasing INDISCRIMINATELY.
 *
 * So each word is judged on its own shape. A plain capitalised word
 * (`/^[A-Z][a-z]+$/`) is an ordinary noun and is lowered. Anything else — an
 * acronym (`CLC`), a bare unit (`R`), an internally-capitalised name — was
 * capitalised ON PURPOSE by whoever authored the label, and this function has
 * no standing to overrule that. "Available R" becomes "available R".
 *
 * WHY NOT A LIST OF EXCEPTIONS: a hard-coded set of acronyms is a second place
 * to remember when a node is added, and the node author would have no reason
 * to look here. The shape of the word already carries the intent.
 */
export function inSentence(label: string): string {
  return label
    .split(" ")
    .map((w) => (/^[A-Z][a-z]+$/.test(w) ? w.toLowerCase() : w))
    .join(" ");
}

export function sampledLabelPhrase(
  labels: readonly string[],
  trueCount: number,
  opts: {
    readonly limit?: number;
    readonly lowercase?: boolean;
    readonly separator?: string;
  } = {},
): string {
  const limit = opts.limit ?? 2;
  const shown = labels.slice(0, limit);
  const desc = (opts.lowercase ? shown.map(inSentence) : shown).join(
    opts.separator ?? " + ",
  );
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
  let missingPayable = 0;
  let venueBlocked = 0;
  const missingLabels: string[] = [];
  const missingPayableLabels: string[] = [];
  const venueBlockedLabels: string[] = [];
  const warnLabels: string[] = [];
  // THE ROLL — built in the SAME pass as the counts, from the SAME node, so a
  // future edit cannot move one and leave the other behind. A second loop
  // would be a second place to decide what a node is.
  const roll: EvidenceRollEntry[] = [];
  for (const n of nodes) {
    if (n.indicator === "OK") {
      resolved += 1;
      roll.push({
        key: n.key,
        label: n.label,
        standing: "RESOLVED",
        payableNow: false,
        venueBlocked: false,
      });
    } else if (n.indicator === "UNKNOWN") {
      missing += 1;
      if (missingLabels.length < EVIDENCE_LABEL_SAMPLE_LIMIT) missingLabels.push(n.label);
      // A node the VENUE cannot supply is not payable no matter what kind it
      // is. `payableBy` classifies the node; `venueBlocked` reports the feed.
      // Both must clear before WM may instruct a trader to go and resolve it —
      // see DecisionChainNode.venueBlocked ("PAYABLE BY KIND IS NOT PAYABLE ON
      // THIS VENUE"). Counted separately rather than merged into the
      // composition bucket: a venue-blocked node IS measured directly, so
      // calling it "composed from other readings" would be a fresh false
      // statement replacing the one being removed.
      let payableNow = false;
      if (n.venueBlocked === true) {
        venueBlocked += 1;
        if (venueBlockedLabels.length < EVIDENCE_LABEL_SAMPLE_LIMIT) {
          venueBlockedLabels.push(n.label);
        }
      } else if (n.payableBy === "EVIDENCE" || n.payableBy === "DECLARATION") {
        // An UNASSERTED node is deliberately not payable. Defaulting the other
        // way would re-create the exact defect: a node nobody classified would
        // silently become a legal instruction to the trader.
        missingPayable += 1;
        payableNow = true;
        if (missingPayableLabels.length < EVIDENCE_LABEL_SAMPLE_LIMIT) {
          missingPayableLabels.push(n.label);
        }
      }
      roll.push({
        key: n.key,
        label: n.label,
        standing: "MISSING",
        payableNow,
        venueBlocked: n.venueBlocked === true,
      });
    } else if (n.indicator === "WARN") {
      warn += 1;
      if (warnLabels.length < EVIDENCE_LABEL_SAMPLE_LIMIT) warnLabels.push(n.label);
      roll.push({
        key: n.key,
        label: n.label,
        standing: "WARN",
        payableNow: false,
        venueBlocked: false,
      });
    } else {
      // WATCH is neither paid nor blocking — not counted; render as
      // observed-but-not-blocking downstream if surface wants to show it.
      // It IS rolled, because the roll is the chain and not the ledger: the
      // gap between `nodes.length` and `payable` must keep a name per node.
      roll.push({
        key: n.key,
        label: n.label,
        standing: "WATCH",
        payableNow: false,
        venueBlocked: false,
      });
    }
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
    missingPayableLabels,
    missingPayable,
    venueBlockedLabels,
    venueBlocked,
    roll,
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
