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
 * ── THE SECOND CIRCUIT, AND THE DEFECT THAT PUT IT HERE ──────────────────────
 *
 * The first draft of this file read CLEAR off `RightOfWayReading.value === ACTION`
 * and nothing else. That verdict is compiled from the steward's permission and
 * the evidence ledger — it knows the chain is paid and the rules allow. It does
 * not know, and cannot know, whether the BARS ARE LIVE or whether a BROKER has
 * ever answered. So a STALE chart beside an UNVERIFIED broker could carry a
 * plaque reading PERMISSION GRANTED, over a perfectly paid roster.
 *
 * E-301 names that failure in its own hazard annotation:
 *
 *     FALSE RIPENESS if STALE plus pretty Clarity.
 *
 * and draws GO as two contactors in series, not one:
 *
 *     INTENT CIRCUIT — requires EXECUTABLE AND broker not UNVERIFIED
 *     GO CIRCUIT     — requires intent AND gates not in debt
 *
 * This file now reads BOTH contactors, and reads the intent one by CALLING
 * `canCompileIntent` — never by spelling the conjunction itself, which is the
 * move `marketFidelityAlgebra.sentinel.test.ts` exists to forbid and which the
 * algebra's own doc calls out: "Surfaces that check only one half are how the
 * forbidden badge gets drawn."
 *
 * ── AND WHAT HAPPENS WHEN A CIRCUIT WAS NEVER SHOWN ──────────────────────────
 *
 * A caller that passes no `circuits` has not told this file the bars are live —
 * it has told it nothing. THE ABSENCE OF A MEASUREMENT IS NOT A PASSING ONE.
 * An unmeasured intent circuit therefore yields NOT_EVALUATED, never CLEAR:
 * the plaque may say "WM has not established this", and may not say "granted".
 *
 * `GoCircuits` keeps all three keys REQUIRED for exactly this reason. A caller
 * that knows the fidelity but not the broker must say `broker: null` out loud
 * and get a refusal, rather than omit the key and get a grant.
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
 *   CLEAR         — ACTION **and** a measured, closed intent circuit. Every
 *                   prerequisite is paid, the steward's rules allow, the bars
 *                   are executable and a broker has answered. This is the ONLY
 *                   state in which this product says the door is open, and
 *                   every term in it is someone else's word, not this file's.
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
import {
  canCompileIntent,
  type BrokerHonesty,
  type MarketFidelityReading,
} from "../marketFidelityAlgebra";

export type GoInterlockState = "HELD" | "NOT_EVALUATED" | "CLEAR";

/**
 * The E-301 intent circuit, as presented by the surface. ALL THREE KEYS ARE
 * REQUIRED — see the header. A `null` is a measurement that came back empty
 * (honest, and refuses); an omitted key is a measurement that was never taken,
 * and this type does not allow one.
 */
export interface GoCircuits {
  /** The market panel's own reading. Null = attached and not established. */
  readonly reading: MarketFidelityReading | null;
  /** The broker domain, which is NOT tied to the market panel (E-301). */
  readonly broker: BrokerHonesty | null;
  /** Planned 1R. Unknown R is not zero R. */
  readonly availableR: number | null;
}

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

/**
 * Why the intent contactor is open, in the trader's words — or null if it is
 * closed. Ordered most-actionable first, and it names ONE reason, because a
 * plaque that lists every open contactor at once is a diagnostic panel.
 */
function intentBlocker(circuits: GoCircuits): string | null {
  if (canCompileIntent(circuits.reading, circuits.broker)) {
    if (typeof circuits.availableR !== "number" || !Number.isFinite(circuits.availableR)) {
      return "Available R is not known, and unknown R is not zero R";
    }
    return null;
  }
  if (!circuits.reading) return "the market panel has not established a fidelity";
  if (circuits.broker == null || circuits.broker === "UNVERIFIED") {
    return "no broker has answered, so nothing here could be sent";
  }
  return "these bars are not executable";
}

export function selectGoInterlock(
  decision: RightOfWayReading | null | undefined,
  debt: EvidenceDebt | null | undefined,
  circuits?: GoCircuits | null,
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

    case "ACTION": {
      // The evidence contactor is CLOSED — that is what ACTION means, and the
      // Sentinel beside this file proves it over the whole input space. The
      // intent contactor is a separate device on the same line (E-301), and
      // this is the one place in the product where both must be read.
      if (!circuits) {
        // Never shown the second circuit. Not a grant, and not a lock either —
        // WM does not know whether the bars are live or a broker has answered.
        return {
          state: "NOT_EVALUATED",
          verdict: "ACTION",
          plaque: PLAQUE.NOT_EVALUATED,
          heldBy: [],
          release: `${decision.detail} — every evidence condition is paid and no rule is engaged. WM has not been shown the market fidelity or the broker, so it cannot say this is executable; paid is not the same as ripe.`,
        };
      }

      const blocker = intentBlocker(circuits);
      if (blocker) {
        return {
          state: "HELD",
          verdict: "ACTION",
          plaque: PLAQUE.HELD,
          // Not a roster item. Sending the trader to pay chips would be a lie:
          // the ledger is already empty and paying more of it changes nothing.
          heldBy: [],
          release: `Every evidence condition is paid — and ${blocker}. Evidence and execution are two separate locks; this one does not open by paying the ledger.`,
        };
      }

      return {
        state: "CLEAR",
        verdict: "ACTION",
        plaque: PLAQUE.CLEAR,
        heldBy: [],
        release: `${decision.detail}. No evidence condition is outstanding, no rule is engaged, these bars are executable and a broker has answered.`,
      };
    }
  }
}

export default selectGoInterlock;
