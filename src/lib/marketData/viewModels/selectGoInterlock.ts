/**
 * GO IS A DOOR, NOT A MOOD — AND A DOOR EITHER HAS A LOCK ON IT OR IT DOES NOT.
 *
 * ── The canon ────────────────────────────────────────────────────────────────
 *
 * WM_NewMockup_123_F16_Evidence_Debt_WAIT_Finished draws the ledger under a
 * header that is not decoration:
 *
 *     EVIDENCE DEBT — FIRST-CLASS CONDITION · PERMISSION WITHHELD
 *     [DIRECTION ✓] [LOCATION ✓] [AVAILABLE R ✓] [AGGRESSION ?] [CLC ?]
 *     WAIT — evidence debt remains. Permission withheld.
 *
 * "FIRST-CLASS CONDITION" is the whole claim. The debt is not advice sitting
 * beside a decision the trader may take anyway; it is the thing that HOLDS the
 * decision shut. The product already refused to PRINT the word ACTION while a
 * condition was owed — `computeRightOfWay` Rule 1 is checked before every
 * downstream verdict, including ALLOWED — but it never said so. A trader read
 * WAIT and four `?` chips and had to infer that the two facts were connected.
 *
 * Inference is where over-trading lives. A debt that merely CO-OCCURS with a
 * wait is a nag. A debt that is visibly the LOCK is a reason.
 *
 * ── WHAT THIS IS, AND WHAT IT IS NOT ─────────────────────────────────────────
 *
 * This is a second CALLER of one measurement, never a second ANSWER (§24). It
 * decides nothing. Every field below is read out of a verdict that was already
 * compiled and a ledger that was already counted:
 *
 *   state    — from `RightOfWayReading.value` alone. GO means ACTION and
 *              nothing else means GO.
 *   heldBy   — from `EvidenceDebt.roll`, the same roll the chips are drawn
 *              from, so the lock and the roster can never name different
 *              conditions.
 *   release  — a sentence over the same two inputs. No new rule.
 *
 * If this file ever computes a permission of its own, it has become the second
 * answer and the interlock is fiction.
 *
 * ── THE THREE STATES, AND WHY THERE ARE THREE ────────────────────────────────
 *
 *   HELD          — a verdict exists and it is not ACTION. GO is unreachable
 *                   and WM can say what is holding it.
 *
 *   NOT_EVALUATED — UNKNOWN, or no reading at all. GO is STILL unreachable —
 *                   the compiler cannot emit ACTION from nothing — but the
 *                   reason is the absence of a ledger, not a named condition.
 *                   Folding this into HELD would let "we never looked" render
 *                   identically to "we looked and four conditions are owed",
 *                   and the trader would go looking for chips that do not
 *                   exist. Folding it into CLEAR would be far worse: an
 *                   unevaluated chain would read as a paid one.
 *
 *   CLEAR         — ACTION. Every prerequisite the compiler knows about is
 *                   paid and the steward's rules allow. This is the ONLY state
 *                   in which this product says the door is open, and it is the
 *                   compiler's word for it, not this file's.
 *
 * TOTAL over `RightOfWay` on purpose: a sixth verdict added upstream fails the
 * build here rather than silently defaulting to one side of a lock.
 *
 * ── WHAT IT REFUSES ──────────────────────────────────────────────────────────
 *
 * 1. IT NEVER NAMES A PARTIAL ROSTER. `heldBy` is every owed condition or it is
 *    empty. Three names over a debt of four reads as the whole lock, and a
 *    trader who pays three and finds the door still shut learns to distrust the
 *    plaque. Same all-or-nothing discipline as the chips.
 *
 * 2. IT NEVER PROMISES THE DOOR WILL OPEN. Paying the roster removes THIS lock;
 *    the steward's rules are a separate lock evaluated after it. The release
 *    sentence says "removes the evidence block", never "allows entry" — the
 *    NEXT cell already learned this lesson ("Resolving it does not authorise
 *    entry — it removes one block").
 *
 * 3. IT NEVER SAYS "GO" WHILE ANYTHING IS OWED. That is the interlock, and it
 *    is enforced by construction (ACTION cannot coexist with missing evidence
 *    upstream) AND asserted exhaustively in the Sentinel beside this file.
 *
 * Pure / deterministic. No clock, no I/O. Renders elsewhere.
 */

import type {
  EvidenceDebt,
  RightOfWay,
  RightOfWayReading,
} from "./decisionPermissionCompiler";

export type GoInterlockState = "HELD" | "NOT_EVALUATED" | "CLEAR";

export interface GoInterlockVM {
  readonly state: GoInterlockState;
  /** The verdict this was read from. Echoed, never re-derived. */
  readonly verdict: RightOfWay | null;
  /** The canon plaque line. Short enough to sit above the roster. */
  readonly plaque: string;
  /**
   * Every owed condition holding the lock, by name — or empty.
   *
   * ALL OR NOTHING. Empty means "this lock is not held by named conditions"
   * (a steward rule, a caution, an unevaluated chain) or "the ledger could not
   * name them". It never means "here are some of them".
   */
  readonly heldBy: readonly string[];
  /** One sentence: what would remove this lock. Never a promise of entry. */
  readonly release: string;
}

const PLAQUE: Record<GoInterlockState, string> = {
  HELD: "PERMISSION WITHHELD",
  NOT_EVALUATED: "PERMISSION NOT EVALUATED",
  CLEAR: "PERMISSION GRANTED",
};

/**
 * The owed conditions by name, or [] — see refusal 1.
 *
 * The roll is only trusted when its MISSING entries exactly equal the
 * authoritative `missing` count. A roll that disagrees with the count is two
 * ledgers, and the honest move is to name none rather than to pick one.
 */
function owedNames(debt: EvidenceDebt | null | undefined): readonly string[] {
  if (!debt || !debt.roll) return [];
  const owed = debt.roll.filter((e) => e.standing === "MISSING");
  if (owed.length !== debt.missing) return [];
  return owed.map((e) => e.label);
}

export function selectGoInterlock(
  decision: RightOfWayReading | null | undefined,
  debt: EvidenceDebt | null | undefined,
): GoInterlockVM {
  if (!decision) {
    return {
      state: "NOT_EVALUATED",
      verdict: null,
      plaque: PLAQUE.NOT_EVALUATED,
      heldBy: [],
      release:
        "No right-of-way reading was compiled, so WM cannot say what holds this decision shut — only that it has not been opened.",
    };
  }

  switch (decision.value) {
    case "WAIT": {
      // The canon case. The lock IS the ledger, so it is named from the ledger.
      const heldBy = owedNames(debt);
      const owed = debt ? debt.missing : 0;
      const named =
        heldBy.length > 0
          ? `${heldBy.join(" · ")}`
          : `${owed} outstanding ${owed === 1 ? "condition" : "conditions"}`;
      return {
        state: "HELD",
        verdict: "WAIT",
        plaque: PLAQUE.HELD,
        heldBy,
        release:
          owed > 0
            ? `Evidence debt is a first-class condition: ${named} ${heldBy.length === 1 || owed === 1 ? "is" : "are"} owed, and until every one is paid this decision stays shut. Paying them removes the evidence block — it does not authorise entry.`
            : "Right of way is withheld and the ledger does not say which condition holds it, so WM cannot name what would release it.",
      };
    }

    case "NO TRADE":
      // A rule, not a condition. Naming chips here would send the trader to
      // pay a debt that is not what is holding the door.
      return {
        state: "HELD",
        verdict: "NO TRADE",
        plaque: PLAQUE.HELD,
        heldBy: [],
        release: `A hard rule is engaged — ${decision.detail}. No evidence pays this off; only the rule releasing opens this.`,
      };

    case "CAUTION":
      // Not GO. Flagged evidence is observed rather than owed, so it is not a
      // roster item and is not named as one.
      return {
        state: "HELD",
        verdict: "CAUTION",
        plaque: PLAQUE.HELD,
        heldBy: [],
        release: `${decision.detail}. Flagged evidence is observed, not owed — re-reading it is what moves this, not paying a debt.`,
      };

    case "UNKNOWN":
      return {
        state: "NOT_EVALUATED",
        verdict: "UNKNOWN",
        plaque: PLAQUE.NOT_EVALUATED,
        heldBy: [],
        release: `${decision.detail}. Nothing here is open — WM simply has not evaluated what would hold it.`,
      };

    case "ACTION":
      return {
        state: "CLEAR",
        verdict: "ACTION",
        plaque: PLAQUE.CLEAR,
        heldBy: [],
        release: `${decision.detail}. No evidence condition is outstanding and no rule is engaged.`,
      };
  }
}

export default selectGoInterlock;
