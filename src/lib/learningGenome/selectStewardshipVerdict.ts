/**
 * selectStewardshipVerdict — canon §Stewardship + §Confidence-without-Pride.
 *
 * Canon:
 *   "Win condition = faithful execution and stewardship, not P&L alone.
 *    Confidence: I trust my preparation enough to take the authorized
 *      setup and accept the outcome.
 *    Pride: I believe the market owes me a result, so I force size,
 *      entries, holds, or recovery."
 *
 * Composes today's process signals + recovery-trade detection + the
 * shutdown state into ONE verdict the trader can read at the end of
 * the day: STEWARDSHIP_HELD or STEWARDSHIP_BROKEN, with the specific
 * reasons.
 *
 * Inputs are already-tested signals from sibling selectors:
 *   - dailyScore grade
 *   - shutdownState (whether -2R hit / 2-losses hit / +3R hit)
 *   - recoveryCandidateCount
 *
 * Verdict logic (canon-anchored):
 *   HELD    — no recovery trades AND (dailyScore.grade ∈ {A_PROCESS,
 *             B_PROCESS}) AND shutdownState.state ≠ AT_TWO_R_STOP
 *             or AT_TWO_LOSSES
 *   BROKEN  — recovery trades > 0 OR grade PROCESS_FAILURE OR
 *             hard-stop breach detected
 *   MIXED   — one or more warning signals but not full break
 *   INSUFFICIENT — dailyScore is INSUFFICIENT_EVIDENCE
 *
 * Rejection guarantees:
 *  - INSUFFICIENT is preferred over false HELD when evidence is thin
 *  - BROKEN reasons are canon-cited so the trader gets specific WHY
 *  - Reasons list is empty when HELD (silence is the good signal)
 */

import type { ProcessGrade } from "./selectDailyScore";
import type { ShutdownState } from "./selectShutdownAdvice";

export type StewardshipVerdict =
  | "HELD"
  | "MIXED"
  | "BROKEN"
  | "INSUFFICIENT_EVIDENCE";

export interface StewardshipInput {
  process_grade: ProcessGrade;
  shutdown_state: ShutdownState;
  recovery_candidate_count: number;
}

export interface StewardshipReasonEntry {
  message: string;
  canon: string;
  severity: "PASS" | "WARN" | "FAIL";
}

export interface StewardshipResult {
  verdict: StewardshipVerdict;
  reasons: readonly StewardshipReasonEntry[];
}

export function selectStewardshipVerdict(
  input: StewardshipInput,
): StewardshipResult {
  const reasons: StewardshipReasonEntry[] = [];

  if (input.process_grade === "INSUFFICIENT_EVIDENCE") {
    return {
      verdict: "INSUFFICIENT_EVIDENCE",
      reasons: [
        {
          message: "Not enough measured process categories to grade stewardship yet.",
          canon: "§14 Daily Score",
          severity: "WARN",
        },
      ],
    };
  }

  if (input.recovery_candidate_count > 0) {
    reasons.push({
      message: `${input.recovery_candidate_count} recovery-trade signature${input.recovery_candidate_count === 1 ? "" : "s"} detected — canon: a loss does not create permission for a recovery trade.`,
      canon: "§Daily Risk",
      severity: "FAIL",
    });
  }

  if (input.process_grade === "PROCESS_FAILURE") {
    reasons.push({
      message: "Daily Process Score < 4/10 — canon: mandatory review before next live session.",
      canon: "§14 Process Failure",
      severity: "FAIL",
    });
  }

  if (input.shutdown_state === "AT_TWO_R_STOP") {
    reasons.push({
      message: "-2R hard stop reached today.",
      canon: "§Daily Risk",
      severity: "FAIL",
    });
  }

  if (input.shutdown_state === "AT_TWO_LOSSES") {
    reasons.push({
      message: "Two authorized losses today — canon: stop for the day.",
      canon: "§Daily Risk",
      severity: "FAIL",
    });
  }

  if (input.process_grade === "C_PROCESS") {
    reasons.push({
      message: "Daily Process Score C day — improvement zone, not failure.",
      canon: "§14 Daily Score",
      severity: "WARN",
    });
  }

  // Decide verdict from reasons.
  const hasFail = reasons.some((r) => r.severity === "FAIL");
  const hasWarn = reasons.some((r) => r.severity === "WARN");

  if (hasFail) return { verdict: "BROKEN", reasons };
  if (hasWarn) return { verdict: "MIXED", reasons };

  // Clean path — reasons list is empty; emit one canon PASS reason.
  return {
    verdict: "HELD",
    reasons: [
      {
        message: "Faithful execution — no recovery trades, no risk breach, process grade B or A.",
        canon: "§Stewardship",
        severity: "PASS",
      },
    ],
  };
}
