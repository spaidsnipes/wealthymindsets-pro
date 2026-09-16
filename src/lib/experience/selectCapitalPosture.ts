/**
 * selectCapitalPosture — the second RISK pixel the canon asks for.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────
 *
 * Ticket T / Command Center (2026-09-11) asks for "visible RISK pixels for
 * Available R + invalidation + protection/humility." `AvailableRChip` shipped
 * the first of those three. The other two were never rendered anywhere:
 * `compileScene` admits the surface elements `PROTECTION_GRADE` and
 * `HUMILITY_PANEL`, and `SceneAdmissionPanel` even carries their human labels
 * ("Protection grade", "What we do not know") — but on 2026-09-16 a grep for
 * those two identifiers found ZERO renderers in the whole repo. The vocabulary
 * existed; the pixels did not.
 *
 * So /command-deck's `scene-risk` region said exactly one thing about risk —
 * how much R was available — and said NOTHING AT ALL about whether the trader
 * is currently holding anything. That silence is not neutral. §14.1 exists
 * because the dangerous failure is a trader with capital exposed being allowed
 * to believe they hold none, and a screen that never mentions the book is a
 * screen that lets them assume it. An empty risk column reads as a calm one.
 *
 * ── What this does NOT do ────────────────────────────────────────────────────
 *
 * It does not read a book. /command-deck has no broker panel; `deckSceneSignals`
 * reports the entire capital column as UNOBSERVED on purpose, and that stays
 * true. This selector's whole job is to turn that honest absence into a
 * SENTENCE the trader can read, instead of leaving it as blank space they will
 * read as "flat".
 *
 * UNREAD is therefore the most common output on this route, by construction —
 * the same way `AVAILABLE_R_UNWIRED_DETAIL` is. It names the CONDITION, never a
 * future tense. "WM has not read a book here" is a fact about this build. "The
 * book has not been read YET" would be a promise that the trader's next action
 * causes a read, and nothing on this route does.
 *
 * PURE — no React, no I/O, no clock.
 */

import type { PositionConfidence, PositionLabel } from "../positionTruth";
import type { SignalProvenance } from "./deckSceneSignals";

/**
 * How loudly the line should read.
 *
 * `EXPOSED` is reserved for a book that actually reports a side. `UNREAD` is
 * the honest-absence tone and is deliberately QUIET: a trader who has never
 * connected a broker must not be shouted at forever, or the one time it
 * matters they will already have stopped reading. This mirrors the reasoning
 * in `compileScene.capitalIsAtRisk`, which refuses to call a never-connected
 * book DEGRADED for the same reason.
 */
export type CapitalPostureTone = "EXPOSED" | "UNSETTLED" | "SETTLED" | "UNREAD";

export interface CapitalPostureInput {
  /** The `position` field of `SceneSignals` — ultimately `selectPositionTruth().label`. */
  readonly position: PositionLabel;
  /** The `positionConfidence` field of `SceneSignals`. */
  readonly confidence: PositionConfidence;
  /**
   * `deckSceneSignals().provenance.POSITION`. The distinction this carries is
   * the whole point of the selector: "POSITION UNCONFIRMED / UNOBSERVED"
   * because no source exists on this route is a DIFFERENT fact from the same
   * pair produced by a broker that was asked and did not answer. Collapsing
   * them would make a real outage look like a design decision.
   */
  readonly provenance: SignalProvenance;
  /** `compileScene().capitalAtRisk`. */
  readonly capitalAtRisk: boolean;
}

export interface CapitalPostureVM {
  /** Short uppercase read. Never a badge grade, never a score (§15). */
  readonly label: string;
  /** One sentence a trader who has read no canon can act on. */
  readonly detail: string;
  readonly tone: CapitalPostureTone;
  /**
   * True when this line is stating an absence of knowledge rather than a
   * finding. Surfaces use it to choose calm material over alarm material —
   * NOT to hide the line. The line is never hidden; that is the defect.
   */
  readonly isAbsence: boolean;
}

/**
 * The sentence for "no capital source exists on this surface".
 *
 * Exported so a guard test can pin the wording beside the measurement that
 * justifies it. The trailing clause is load-bearing and is the same clause
 * `positionTruth.describe` uses: whatever else a trader takes from this line,
 * they must not take "flat".
 */
export const CAPITAL_UNREAD_DETAIL =
  "No broker book is read on this surface, so WM cannot tell you what you hold. " +
  "This is not a confirmation that you are flat.";

export function selectCapitalPosture(input: CapitalPostureInput): CapitalPostureVM {
  const { position, confidence, provenance, capitalAtRisk } = input;

  // ── 1. Nothing was ever asked ───────────────────────────────────────────────
  // Checked FIRST and independently of the label. An UNOBSERVED provenance
  // means no source was consulted, and in that state the label carries no
  // information at all — it is the adapter's constant. Reading it would let a
  // hard-coded "POSITION UNCONFIRMED" masquerade as a finding about this book.
  if (provenance === "UNOBSERVED") {
    return {
      label: "POSITION UNREAD",
      detail: CAPITAL_UNREAD_DETAIL,
      tone: "UNREAD",
      isAbsence: true,
    };
  }

  // ── 2. A side is reported ───────────────────────────────────────────────────
  if (position === "LONG" || position === "SHORT") {
    return {
      label: position,
      detail:
        confidence === "CONFIRMED"
          ? `A ${position} position is open and confirmed — it is yours to steward.`
          : `A ${position} position is reported but the book is ${confidence} — treat the size as unproven.`,
      tone: "EXPOSED",
      isAbsence: false,
    };
  }

  // ── 3. Flatness that was actually observed ──────────────────────────────────
  // §14.1: FLAT is a FINDING. Both halves are required, because the label alone
  // can read FLAT off a single stale source.
  if (position === "FLAT" && confidence === "CONFIRMED") {
    return {
      label: "FLAT",
      detail: capitalAtRisk
        ? "Every source reported zero, but something on this decision can still create exposure."
        : "Every source reported zero. Nothing is exposed.",
      tone: capitalAtRisk ? "UNSETTLED" : "SETTLED",
      isAbsence: false,
    };
  }

  // ── 4. A source was asked and the answer is not usable ──────────────────────
  // FLAT-but-not-CONFIRMED lands here on purpose and is NOT allowed to print
  // the word FLAT as its headline, which is the precise shape of the
  // 2026-09-03 Alpaca defect: an empty list from a failed fetch rendered as
  // "No open positions".
  return {
    label: "POSITION UNCONFIRMED",
    detail: `The book was consulted and came back ${confidence}. This is not a confirmation that you are flat.`,
    tone: "UNSETTLED",
    isAbsence: false,
  };
}

export default selectCapitalPosture;
