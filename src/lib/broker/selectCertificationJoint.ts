/**
 * selectCertificationJoint — pure presentation selector that turns the
 * /api/broker/certification receipt into the ONE sentence a Founder can act on.
 *
 * ── The measured failure this answers ────────────────────────────────────────
 *
 * `/api/broker/certification` has shipped a twelve-stage read side for months
 * and NO surface consumes it. `/readiness` mentions the harness in prose only
 * ("the broker Certification Harness owns that proof") — a sentence pointing at
 * a door that was never cut. Backend green, frontend dark.
 *
 * The obvious cure is the wrong one: rendering all twelve stages per broker is
 * forty-eight rows of the word PENDING. That is READINESS_THEATER — a wall of
 * precise-looking state where the Founder's actual question ("what is the next
 * thing anyone can DO?") is buried in noise that never changes.
 *
 * The cert stage list is ORDERED, and certification.ts says why: "a failure at
 * stage N implies stages N+1..12 are BLOCKED (not FAILED — they were never
 * reachable)." An ordered chain has exactly one interesting element — the first
 * link that is not yet holding. That link IS the work. This selector names it.
 *
 * ── The four states are kept strictly apart ──────────────────────────────────
 *
 * Collapsing these is how a cert board starts lying:
 *
 *   NOT_IMPLEMENTED  no adapter exists in-process. Remedy: WRITE the adapter.
 *   UNPROBED         adapter exists; nothing has ever exercised this stage.
 *                    Remedy: RUN a harness. This is NOT a failure, and must
 *                    never be coloured or worded as one — a stage nobody tested
 *                    is unknown, and unknown is an honest state.
 *   FAILED           something ran it and it did not pass. Remedy: FIX it.
 *   BLOCKED          unreachable because an earlier link failed. Remedy: none,
 *                    directly — fix the earlier joint. Presenting a BLOCKED
 *                    stage as actionable sends the reader at a stage whose
 *                    result is not its own fault.
 *
 * Pure/deterministic: no clock, no I/O. The payload is passed in.
 */

import { CERT_STAGES, type CertStage } from "./certification";

/** Shape of one broker entry in GET /api/broker/certification. */
export interface CertificationBrokerPayload {
  readonly brokerId: string;
  readonly certLevel: string;
  readonly summary: string;
  readonly passedStages: readonly string[];
  readonly pendingStages: readonly string[];
  readonly failedStages: readonly string[];
  readonly blockedStages: readonly string[];
  readonly fullyCertified: boolean;
  /** Whether an adapter for this broker exists in-process. */
  readonly implemented?: boolean;
  readonly note?: string;
}

export interface CertificationPayload {
  readonly generatedAt?: string;
  readonly brokers?: readonly CertificationBrokerPayload[];
  readonly fullyCertifiedCount?: number;
}

export type JointClass =
  | "NOT_IMPLEMENTED"
  | "UNPROBED"
  | "FAILED"
  | "BLOCKED"
  | "FULLY_CERTIFIED";

/** Who has to move next. Kept separate from the class so the UI never has to
 * infer a remedy from a label. */
export type JointOwner = "ENGINEERING" | "HARNESS" | "NOBODY";

export interface CertificationJointRow {
  readonly brokerId: string;
  readonly certLevel: string;
  /** Passed / total, for a progress read that does not pretend to be a score. */
  readonly passedCount: number;
  readonly totalStages: number;
  /**
   * The first stage in canon order that is not PASS — the actual next link.
   * Null ONLY when every stage passed, which is the one case with no joint.
   */
  readonly joint: CertStage | null;
  readonly jointClass: JointClass;
  readonly owner: JointOwner;
  /** One sentence stating what is true and what would change it. */
  readonly detail: string;
  /** Stages proven to have passed, in canon order. */
  readonly passedStages: readonly CertStage[];
  /**
   * True when NOTHING about this broker has ever been measured — every stage is
   * pending. Surfaced explicitly so a board can say "not measured" instead of
   * rendering a 0/12 that reads like a failing grade.
   */
  readonly neverMeasured: boolean;
}

export interface CertificationJointBoard {
  readonly rows: readonly CertificationJointRow[];
  /** Brokers that cleared all twelve. */
  readonly fullyCertifiedCount: number;
  /**
   * Whether any stage anywhere has EVER been probed. False means the harness
   * runner does not exist yet, and the board says so once at the top rather
   * than implying twelve separate unknowns per broker are twelve findings.
   */
  readonly anythingMeasured: boolean;
  /** Header sentence. Never a score; always a statement of what is known. */
  readonly summary: string;
}

/**
 * Re-express a wire-supplied stage list in canon order, DROPPING any name this
 * build does not know. A stage name from a newer producer is not silently
 * accepted into a set the ordering logic then can't place — it is omitted, and
 * the row degrades toward UNPROBED, which is the honest direction.
 */
function order(values: readonly string[]): readonly CertStage[] {
  const set = new Set(values);
  return CERT_STAGES.filter((s) => set.has(s));
}

function describe(
  brokerId: string,
  joint: CertStage | null,
  jointClass: JointClass,
  blockedBy: CertStage | null,
): string {
  switch (jointClass) {
    case "FULLY_CERTIFIED":
      return `${brokerId} cleared all ${CERT_STAGES.length} canon stages.`;
    case "NOT_IMPLEMENTED":
      return `No adapter for ${brokerId} exists in-process, so no stage can be run. This is an integration to write, not a harness to run.`;
    case "FAILED":
      return `${joint} was run for ${brokerId} and did not pass. Every later stage is unreachable until it does.`;
    case "BLOCKED":
      return blockedBy
        ? `${joint} is unreachable for ${brokerId} because ${blockedBy} failed. Fix that stage, not this one.`
        : `${joint} is unreachable for ${brokerId} — an earlier stage failed.`;
    case "UNPROBED":
    default:
      return `Nothing has ever probed ${joint} for ${brokerId}. This is UNKNOWN, not failing — it needs a harness run, not a fix.`;
  }
}

export function selectCertificationJoint(
  payload: CertificationPayload | null | undefined,
): CertificationJointBoard {
  const brokers = payload?.brokers ?? [];

  const rows: CertificationJointRow[] = brokers.map((broker) => {
    const passedStages = order(broker.passedStages ?? []);
    const failed = new Set(order(broker.failedStages ?? []));
    const blocked = new Set(order(broker.blockedStages ?? []));
    const passed = new Set(passedStages);

    const joint = CERT_STAGES.find((s) => !passed.has(s)) ?? null;

    // `implemented` is optional on the wire so an older payload does not crash
    // the board. Absent, it is NOT assumed true — a missing fact stays unknown,
    // and the row falls through to the stage-derived classes below rather than
    // claiming an adapter exists.
    const notImplemented = broker.implemented === false;

    let jointClass: JointClass;
    let blockedBy: CertStage | null = null;
    if (joint === null) jointClass = "FULLY_CERTIFIED";
    else if (notImplemented) jointClass = "NOT_IMPLEMENTED";
    else if (failed.has(joint)) jointClass = "FAILED";
    else if (blocked.has(joint)) {
      jointClass = "BLOCKED";
      // Name the link that actually broke, so the reader is not sent to a stage
      // whose state is somebody else's consequence.
      blockedBy = CERT_STAGES.slice(0, CERT_STAGES.indexOf(joint)).reverse().find((s) => failed.has(s)) ?? null;
    } else jointClass = "UNPROBED";

    const owner: JointOwner =
      jointClass === "FULLY_CERTIFIED" ? "NOBODY"
      : jointClass === "NOT_IMPLEMENTED" ? "ENGINEERING"
      : jointClass === "FAILED" ? "ENGINEERING"
      : jointClass === "BLOCKED" ? "NOBODY"
      : "HARNESS";

    return {
      brokerId: broker.brokerId,
      certLevel: broker.certLevel,
      passedCount: passedStages.length,
      totalStages: CERT_STAGES.length,
      joint,
      jointClass,
      owner,
      detail: describe(broker.brokerId, joint, jointClass, blockedBy),
      passedStages,
      neverMeasured: passedStages.length === 0 && failed.size === 0 && blocked.size === 0,
    };
  });

  const anythingMeasured = rows.some((r) => !r.neverMeasured);
  const fullyCertifiedCount = rows.filter((r) => r.jointClass === "FULLY_CERTIFIED").length;

  const summary =
    rows.length === 0
      ? "No brokers registered — nothing to certify."
      : !anythingMeasured
        ? `No certification stage has ever been run. ${rows.length} broker${rows.length === 1 ? "" : "s"} registered, ` +
          `0 of ${rows.length * CERT_STAGES.length} stage checks performed. These are UNKNOWN, not failures.`
        : `${fullyCertifiedCount} of ${rows.length} broker${rows.length === 1 ? "" : "s"} fully certified.`;

  return { rows, fullyCertifiedCount, anythingMeasured, summary };
}
