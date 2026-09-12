import type { ProviderReport } from "@/app/api/broker/status/route";
import {
  assertStageEvidence,
  type CapabilityStage,
  type StageEvidenceMap,
} from "./selectFirstBrokenJoint";

/**
 * providerReportToStageEvidence — the seam between the honest report WM
 * already computes and the ladder that can say where the signal dies.
 *
 * ─────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS AT ALL
 *
 * `/api/broker/status` has computed a truthful four-provider report since
 * F-Bkt 3, and every broker adapter's `health()` refuses to claim a
 * connection it did not observe. That work is real and it is correct.
 * It also has ZERO UI consumers. The truth exists inside the program and
 * has never reached the Founder's eye — which the Stewardship canon names
 * directly: "UI must project that owner or honestly show
 * CONFLICTED/UNKNOWN."
 *
 * `selectFirstBrokenJoint` cannot consume `ProviderReport` directly, and
 * deliberately so: it must stay pure of any provider vocabulary, or the
 * ladder becomes a broker module and stops being reusable for AI
 * providers, data feeds, or anything else with staged capability. So the
 * translation lives here, in one place, tested.
 *
 * The `ProviderReport` type is IMPORTED, not retyped. That is G2: the
 * route owns the shape, this file derives from it. A field renamed there
 * must break here at `tsc` rather than drift — which is exactly the
 * failure that let `moomooAdapter` be registered, wired, and never
 * reported, while the suite pinned the omission GREEN.
 *
 * ─────────────────────────────────────────────────────────────────────
 * THE ONE JUDGEMENT THIS FILE MAKES: `connected: false` IS NOT A FAILURE
 *
 * This is the whole reason the mapping needed care rather than a table.
 *
 * `moomooAdapter.health()` returns `connected: false` unconditionally,
 * with the comment "Never claim a connection we have not observed this
 * request." Read literally, that boolean says: NOBODY LOOKED. It does not
 * say the provider refused us.
 *
 * Mapping it to FAIL would manufacture a defect out of a measurement gap
 * and send someone to debug an authentication that was never attempted.
 * So it maps to UNKNOWN, and the card will say "AUTHENTICATED — not a
 * proven defect, this rung has not been measured." That sentence is
 * TRUE, and the static prose it replaces was not even wrong — it was
 * unfalsifiable, printing the same words whether the OpenD bridge was
 * down or the credential had never been deployed.
 *
 * Webull is the counter-case in the same repo: it genuinely measured, and
 * both signing profiles returned BLOCKED_AUTH (0078c0b). A provider that
 * actually observed a refusal deserves FAIL. One that never dialled does
 * not. The `ProviderReport` shape cannot currently tell those two apart
 * from `connected` alone — see the NOT-YET-DISTINGUISHED note below, which
 * is recorded rather than papered over.
 *
 * ─────────────────────────────────────────────────────────────────────
 * WHY ONLY THREE RUNGS ARE EMITTED
 *
 * The report answers three questions: is there code, are the credential
 * NAMES present on this host, and did we observe a connection. That is
 * CONFIGURED, DEPLOYED_SECRET_PRESENT, AUTHENTICATED — and nothing below.
 *
 * The temptation is to fill the rest in, because a card with nine blanks
 * looks unfinished. Filling them would be the FALSE_RIPENESS the ladder
 * exists to prevent. ENTITLED, FRESH, EXECUTABLE and the rest are NOT
 * measured by this endpoint, and a map that omits them lets
 * `selectFirstBrokenJoint` report them as UNREACHED or UNKNOWN — which is
 * the accurate answer and, per the canon, is "a measurement to take, not
 * a defect to fix."
 *
 * Nine honest blanks are the finding. They are the visible shape of how
 * far provider proof actually reaches today.
 *
 * PURE / DETERMINISTIC — no clock, no I/O, no secrets.
 */

/**
 * Recorded gap, deliberately not smoothed over.
 *
 * `connected: false` currently collapses two different facts:
 *   (a) we did not attempt a connection this request  → UNKNOWN
 *   (b) we attempted one and the provider refused     → FAIL
 *
 * This file resolves the ambiguity toward UNKNOWN, because that is the
 * direction that cannot invent a defect. When `ProviderReport` grows a
 * field that separates "not attempted" from "refused", this mapping
 * should read it and emit FAIL for (b). Until then the downgrade is
 * deliberate and the cost is named: a genuine auth refusal will be
 * under-reported as unmeasured on any provider whose adapter does not
 * surface the refusal in `note`.
 */
export const AUTHENTICATION_AMBIGUITY_NOTE =
  "Not measured this request. A false 'connected' is worse than a blank." as const;

/** Prefix used when the report's own note is empty, so FAIL is never causeless. */
const UNNAMED_CAUSE_FALLBACK = "The provider report gave no cause.";

/**
 * Translate one provider's honest report into ladder evidence.
 *
 * Emits at most three rungs and never more than the report can support.
 * Every FAIL carries a cause, enforced here by `assertStageEvidence`
 * rather than trusted — a named rung with an unnamed cause is half of the
 * "blocked"/"API issue" non-diagnosis the Command Center bans.
 */
export function providerReportToStageEvidence(
  report: Pick<ProviderReport, "implemented" | "envConfigured" | "connected" | "note">,
): StageEvidenceMap {
  const cause = report.note.trim() || UNNAMED_CAUSE_FALLBACK;
  const evidence: Partial<Record<CapabilityStage, { state: "PASS" | "FAIL" | "UNKNOWN" }>> = {};
  const map: StageEvidenceMap = evidence as StageEvidenceMap;

  // CONFIGURED — does a real server-side adapter code path exist?
  // The one rung this report can answer with certainty, because it is a
  // fact about THIS BUILD rather than about a remote party.
  map.CONFIGURED = report.implemented
    ? { state: "PASS" }
    : { state: "FAIL", note: cause };

  // Below an absent adapter, nothing downstream is measurable. Stop here
  // and let the walk mark the rest UNREACHED — emitting UNKNOWN for
  // AUTHENTICATED when there is no code to authenticate WITH would invite
  // someone to go measure a thing that cannot be measured.
  if (!report.implemented) return map;

  // DEPLOYED_SECRET_PRESENT — does the RUNNING host carry the credential
  // NAMES the code reads? Never the values.
  //
  // A FAIL here is a genuine measured fact: the process looked at its own
  // environment and the names were absent. That is the one rung where
  // absence IS evidence, because the observer and the observed are the
  // same process. Contrast AUTHENTICATED below, where absence of a
  // positive only means nobody dialled out.
  map.DEPLOYED_SECRET_PRESENT = report.envConfigured
    ? { state: "PASS" }
    : { state: "FAIL", note: cause };

  if (!report.envConfigured) return map;

  // AUTHENTICATED — see the header. `false` means unobserved, not refused.
  map.AUTHENTICATED = report.connected
    ? { state: "PASS" }
    : { state: "UNKNOWN" };

  return map;
}

/**
 * Same translation, with every emitted rung run through the evidence
 * assertion. Callers rendering to a human should prefer this: it converts
 * a malformed FAIL into a thrown error at the seam rather than a
 * causeless red on the Founder's screen.
 */
export function providerReportToCheckedStageEvidence(
  report: Pick<ProviderReport, "implemented" | "envConfigured" | "connected" | "note">,
): StageEvidenceMap {
  const map = providerReportToStageEvidence(report);
  for (const [stage, ev] of Object.entries(map)) {
    if (ev) assertStageEvidence(stage as CapabilityStage, ev);
  }
  return map;
}
