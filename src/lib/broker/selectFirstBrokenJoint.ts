/**
 * selectFirstBrokenJoint — the executable owner of Ticket B's central
 * requirement (ATH CURRENT COMMAND CENTER, WM PRO OS HARD-FOCUS LOCK,
 * 2026-09-12):
 *
 *   "Ticket B — Webull / Moomoo / Tasty stage cards showing the first
 *    broken joint without collapsing capability stages."
 *
 * And the Provider Health Law it serves, verbatim from the same door:
 *
 *   "No provider breaker may turn GREEN at provider-logo level. Required
 *    provider health must be capability-matrix based: CONFIGURED;
 *    DEPLOYED_SECRET_PRESENT; AUTHENTICATED; ENTITLED; AVAILABLE; FRESH;
 *    NORMALIZED; UI_PROJECTED; EXECUTABLE; RECONCILABLE; RECOVERABLE;
 *    HUMAN_PROVEN."
 *
 *   "A failure must name the first failed rung. 'Keys missing,' 'API
 *    issue,' 'blocked,' 'connected,' or 'ready' alone is invalid."
 *
 * ─────────────────────────────────────────────────────────────────────
 * WHY AN ORDERED LADDER WHEN `healthDimensions` ALREADY EXISTS
 *
 * `lib/ops/healthDimensions` judges an UNORDERED SET: it answers "did any
 * of these six dimensions dissent?" That is the right question for a
 * badge. It is the wrong question for a card whose whole job is to say
 * WHERE the signal dies, because "first" is meaningless without an order.
 *
 * A joint is a SEAM BETWEEN two stages. You cannot have a first one
 * unless the stages are sequenced, and the sequence is load-bearing: it
 * encodes which truths are PREREQUISITE to which other truths. That
 * prerequisite relation is the entire reason this module can refuse to
 * answer downstream questions — see UNREACHED below.
 *
 * So this module owns the ORDER and the WALK. It does not own the state
 * vocabulary and it does not own the dimension names it shares with
 * `healthDimensions`; the `capability ladder vocabulary` suite in
 * `selectFirstBrokenJoint.test.ts` pins the overlap so a rename upstream
 * breaks here loudly instead of drifting.
 *
 * ─────────────────────────────────────────────────────────────────────
 * AUTHENTICATED IS NOT AUTHORIZED — DO NOT "UNIFY" THEM
 *
 * The ladder says AUTHENTICATED. `HEALTH_DIMENSIONS` says AUTHORIZED.
 * These are different questions and the near-identical spelling is the
 * trap:
 *
 *   AUTHENTICATED — did the provider accept who we say we are?
 *   AUTHORIZED    — is this actor permitted to take this action?
 *
 * Webull is the local proof that the gap is real and not pedantic:
 * commit 0078c0b measured Webull as credential-ready while both signing
 * profiles returned BLOCKED_AUTH. Credentials present, identity rejected.
 * A card that collapsed those two words would have had no way to say so.
 *
 * ─────────────────────────────────────────────────────────────────────
 * THE FOUR STAGE STATES, AND WHY THERE ARE FOUR AND NOT TWO
 *
 *   PASS           — measured, and it worked.
 *   FAIL           — measured, and it did not work. A FACT.
 *   UNKNOWN        — nobody measured it. A GAP, not a fact.
 *   UNREACHED      — an earlier stage stopped the walk, so this stage's
 *                    truth is not merely unmeasured, it is UNMEASURABLE
 *                    until the upstream stage clears.
 *   NOT_APPLICABLE — the stage does not apply to this capability.
 *
 * UNKNOWN vs FAIL is the distinction `healthDimensions` already draws
 * between UNREAD_DIMENSION and FALSE_RIPENESS, and it is drawn again here
 * for the same reason: "I could not look" is not "I looked and it is
 * broken." They have opposite next actions — one is a measurement to
 * take, the other is a defect to fix.
 *
 * UNREACHED is the one this module adds, and it is the whole point of
 * ordering. If AUTHENTICATED failed, then ENTITLED is not UNKNOWN — it is
 * unanswerable. Reporting it as UNKNOWN would invite someone to "go
 * measure it," which cannot be done; reporting it as FAIL would invent a
 * second defect out of one. moomoo shows why this matters: with the
 * OpenD bridge down, every downstream reading is UNREACHED, and a card
 * that painted eleven reds would be claiming eleven findings from one.
 *
 * ─────────────────────────────────────────────────────────────────────
 * DIRECTION OF ERROR — THIS FUNCTION CAN ONLY EVER DOWNGRADE
 *
 * A stage is reported PASS if and only if the caller supplied it as PASS.
 * There is no input to this module that causes it to manufacture a green
 * the caller had not already claimed. That is the same one-way discipline
 * the env-manifest suppression pass earned (172e9bc): a false PASS here
 * would tell the Founder a broker rung is proven when it is not, which is
 * exactly the FALSE_RIPENESS this ladder exists to prevent. A false
 * downgrade costs one extra line of reading. The error is pushed entirely
 * into the harmless direction, and `selectFirstBrokenJoint.test.ts`
 * asserts that property directly rather than trusting this paragraph.
 *
 * ─────────────────────────────────────────────────────────────────────
 * REVIVE LEDGER — this Sentinel has failed by name before shipping
 *
 * Break 1: the walk's stop flag was neutered (`if (false && stopped)`) so
 *   a broken joint no longer propagated UNREACHED downstream.
 *   → vitest EXIT=1, SIX tests failed by name, including "refuses a
 *     supplied PASS that sits below a broken joint".
 *   → tsc EXIT=0. TypeScript did NOT catch it. For this defect class —
 *     a wrong answer in a well-typed shape — the suite is the ONLY gate.
 *
 * Break 2: the ladder's AUTHENTICATED rung was renamed to AUTHORIZED,
 *   the exact vocabulary collapse the section above forbids.
 *   → vitest EXIT=1, SIX tests failed by name, including "keeps
 *     AUTHENTICATED and AUTHORIZED in separate vocabularies".
 *   → tsc EXIT=2 as well, because the rung name is a literal union
 *     member. Renames are type-visible; wrong answers are not.
 *
 * Both breaks were restored byte-identically (diff empty, shasum matched)
 * before this file was committed.
 *
 * PURE / DETERMINISTIC — no clock, no I/O, no secrets, no provider list.
 */

/**
 * The ladder, verbatim and in the Command Center's own order.
 *
 * The order is the contract. Reordering these is a semantic change, not a
 * cosmetic one: it redefines which stage is prerequisite to which, and
 * therefore which joint gets named first.
 */
export const CAPABILITY_STAGES = [
  "CONFIGURED",
  "DEPLOYED_SECRET_PRESENT",
  "AUTHENTICATED",
  "ENTITLED",
  "AVAILABLE",
  "FRESH",
  "NORMALIZED",
  "UI_PROJECTED",
  "EXECUTABLE",
  "RECONCILABLE",
  "RECOVERABLE",
  "HUMAN_PROVEN",
] as const;

export type CapabilityStage = (typeof CAPABILITY_STAGES)[number];

/**
 * What each rung actually asks, in the words a human would use.
 *
 * Present for the same reason `DIMENSION_QUESTION` is: without a shared
 * gloss, every surface invents its own, and "ENTITLED" quietly becomes
 * "connected" on one screen and "subscribed" on another.
 */
export const STAGE_QUESTION: Readonly<Record<CapabilityStage, string>> = {
  CONFIGURED: "Does this build know how to talk to the provider at all?",
  DEPLOYED_SECRET_PRESENT: "Does the RUNNING host actually carry the credential names the code reads?",
  AUTHENTICATED: "Did the provider accept who we say we are?",
  ENTITLED: "Is this account permitted to receive THIS field, on THIS instrument?",
  AVAILABLE: "Did the provider answer at all?",
  FRESH: "Is the answer recent enough for the decision being made on it?",
  NORMALIZED: "Did the answer survive translation into WM's canonical shape?",
  UI_PROJECTED: "Does a real WM surface render this, where a human can see it?",
  EXECUTABLE: "Has execution capability been proven, not merely configured?",
  RECONCILABLE: "Can WM's view of state be checked against the broker's own?",
  RECOVERABLE: "If this broke mid-flight, can the true state be re-established?",
  HUMAN_PROVEN: "Has a person completed the job end to end on this rung?",
};

/** What a caller may assert about a rung it looked at. */
export type MeasuredStageState = "PASS" | "FAIL" | "UNKNOWN" | "NOT_APPLICABLE";

/** What this module may report about a rung, including the derived one. */
export type StageState = MeasuredStageState | "UNREACHED";

export interface StageEvidence {
  readonly state: MeasuredStageState;
  /**
   * Why. Required for FAIL — a named rung with an unnamed cause is the
   * "blocked" non-diagnosis the Command Center explicitly bans — and
   * `assertStageEvidence` enforces that rather than leaving it to prose.
   */
  readonly note?: string;
}

export interface StageVerdict {
  readonly stage: CapabilityStage;
  readonly state: StageState;
  readonly question: string;
  readonly note: string | null;
}

export type JointVerdictClass =
  /** Every applicable rung was measured and passed. */
  | "PROVEN_THROUGH"
  /** A rung was measured and failed. A defect to fix. */
  | "BROKEN_JOINT"
  /** A rung was never measured. A gap to close. */
  | "UNMEASURED_JOINT";

export interface JointVerdict {
  /** All twelve rungs, always, in ladder order. Never a filtered subset. */
  readonly stages: readonly StageVerdict[];
  readonly verdictClass: JointVerdictClass;
  /** The first rung measured as FAIL, if any. */
  readonly firstBrokenJoint: CapabilityStage | null;
  /** The first rung nobody measured, if the walk stopped there instead. */
  readonly firstUnmeasuredJoint: CapabilityStage | null;
  /** The last rung that actually passed before the walk stopped. */
  readonly provenThrough: CapabilityStage | null;
  /** One sentence naming the rung — never a colour, never "blocked". */
  readonly headline: string;
  /** The single next thing that would discriminate. Garden Machine Contract. */
  readonly nextDiscriminatingAction: string;
}

export type StageEvidenceMap = Partial<Record<CapabilityStage, StageEvidence>>;

/**
 * Reject evidence that names a failure without naming its cause.
 *
 * Separate from the walk on purpose: the walk must stay total (it has to
 * render SOMETHING for every provider, including a badly-instrumented
 * one), while callers that build evidence can opt into a loud failure at
 * the point the evidence is CONSTRUCTED, which is where the bug is.
 */
export function assertStageEvidence(stage: CapabilityStage, evidence: StageEvidence): void {
  if (evidence.state === "FAIL" && (evidence.note ?? "").trim() === "") {
    throw new Error(
      `Stage ${stage} was reported FAIL with no note. A named rung with an ` +
      `unnamed cause is the "blocked" non-diagnosis the Provider Health Law ` +
      `rejects; supply what the provider actually said.`,
    );
  }
}

function headlineFor(
  verdictClass: JointVerdictClass,
  joint: CapabilityStage | null,
  provenThrough: CapabilityStage | null,
  note: string | null,
): string {
  const reached = provenThrough ? `Proven through ${provenThrough}.` : "Nothing proven yet.";
  if (verdictClass === "PROVEN_THROUGH") {
    return `Every applicable rung measured and passed, through ${provenThrough ?? "no rungs"}.`;
  }
  if (verdictClass === "BROKEN_JOINT") {
    return `${reached} First broken joint: ${joint}${note ? ` — ${note}` : "."}`;
  }
  return `${reached} First unmeasured joint: ${joint}. Nothing past it is knowable yet.`;
}

function nextActionFor(
  verdictClass: JointVerdictClass,
  joint: CapabilityStage | null,
): string {
  if (verdictClass === "PROVEN_THROUGH") {
    return "No rung is outstanding. Re-measure on the capability's revalidation trigger.";
  }
  if (verdictClass === "BROKEN_JOINT") {
    return `Repair ${joint}: ${STAGE_QUESTION[joint as CapabilityStage]} Every rung below it stays UNREACHED until it clears — do not open a second ticket for them.`;
  }
  return `Measure ${joint}: ${STAGE_QUESTION[joint as CapabilityStage]} This is a missing reading, not a proven defect.`;
}

/**
 * Walk the ladder in order and stop at the first rung that is not PASS.
 *
 * NOT_APPLICABLE does NOT stop the walk — a capability that cannot be
 * executed (a read-only market-data lane) still has a meaningful FRESH
 * and UI_PROJECTED rung below EXECUTABLE, and halting there would hide
 * them behind a stage that was never relevant.
 *
 * Everything below the stop is UNREACHED, including rungs the caller DID
 * supply evidence for. That is deliberate and it is the one place this
 * function overrides its input: evidence gathered below a broken joint is
 * not trustworthy as a statement about the live capability. If a probe
 * reports ENTITLED=PASS while AUTHENTICATED=FAIL, the probe is describing
 * a cached or assumed entitlement, not a measured one, and promoting it
 * would let one stale reading certify a rung the provider never answered.
 */
export function selectFirstBrokenJoint(evidence: StageEvidenceMap): JointVerdict {
  const stages: StageVerdict[] = [];
  let firstBrokenJoint: CapabilityStage | null = null;
  let firstUnmeasuredJoint: CapabilityStage | null = null;
  let provenThrough: CapabilityStage | null = null;
  let stoppedNote: string | null = null;
  let stopped = false;

  for (const stage of CAPABILITY_STAGES) {
    const question = STAGE_QUESTION[stage];

    if (stopped) {
      stages.push({ stage, state: "UNREACHED", question, note: null });
      continue;
    }

    const supplied = evidence[stage];
    const note = supplied?.note?.trim() ? supplied.note.trim() : null;

    if (supplied === undefined || supplied.state === "UNKNOWN") {
      firstUnmeasuredJoint = stage;
      stoppedNote = note;
      stopped = true;
      stages.push({ stage, state: "UNKNOWN", question, note });
      continue;
    }

    if (supplied.state === "NOT_APPLICABLE") {
      stages.push({ stage, state: "NOT_APPLICABLE", question, note });
      continue;
    }

    if (supplied.state === "FAIL") {
      firstBrokenJoint = stage;
      stoppedNote = note;
      stopped = true;
      stages.push({ stage, state: "FAIL", question, note });
      continue;
    }

    provenThrough = stage;
    stages.push({ stage, state: "PASS", question, note });
  }

  const verdictClass: JointVerdictClass =
    firstBrokenJoint !== null
      ? "BROKEN_JOINT"
      : firstUnmeasuredJoint !== null
        ? "UNMEASURED_JOINT"
        : "PROVEN_THROUGH";

  const joint = firstBrokenJoint ?? firstUnmeasuredJoint;

  return {
    stages,
    verdictClass,
    firstBrokenJoint,
    firstUnmeasuredJoint,
    provenThrough,
    headline: headlineFor(verdictClass, joint, provenThrough, stoppedNote),
    nextDiscriminatingAction: nextActionFor(verdictClass, joint),
  };
}

export default selectFirstBrokenJoint;
