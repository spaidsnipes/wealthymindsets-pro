/**
 * selectSetupGradeReasons — canon §A-Setup teaching layer.
 *
 * The bare grade (A+ / A / B+ / B / NO_TRADE) is diagnostic; a good
 * trader-development system also shows the WHY. This selector takes
 * the same input as selectSetupGrade and returns the CANONICAL
 * reason list for why the grade landed there — which specific rule
 * from canon §A-Setup / §Model 0/1/2 fired.
 *
 * Every reason cites its canon source so the trader can inspect
 * WHY-to-evidence per canon §WHY? / §Evidence Reversibility.
 */

import type { SetupGrade, SetupGradeInput } from "./selectSetupGrade";
import { selectSetupGrade } from "./selectSetupGrade";

export interface GradeReason {
  /** Short one-line reason (canon-quoted where possible). */
  message: string;
  /** Canon anchor (e.g. "§A-Setup", "§Model 1"). */
  canon: string;
  /** severity: PASS = green, WARN = amber, FAIL = red. */
  severity: "PASS" | "WARN" | "FAIL";
}

export interface SetupGradeExplained {
  grade: SetupGrade;
  reasons: readonly GradeReason[];
}

export function selectSetupGradeReasons(input: SetupGradeInput): SetupGradeExplained {
  const grade = selectSetupGrade(input);
  const reasons: GradeReason[] = [];

  if (input.dayModel === "M0") {
    reasons.push({
      message: "M0 = no-trade day. Any trade taken is a misread of the day model.",
      canon: "§Model 0",
      severity: "FAIL",
    });
    return { grade, reasons };
  }

  if (input.processQuality === "BROKE_RULES") {
    reasons.push({
      message: "Process quality = BROKE_RULES. Authorization failed regardless of outcome.",
      canon: "§A-Setup",
      severity: "FAIL",
    });
  }

  if (input.processQuality === "UNRESOLVED") {
    reasons.push({
      message: "Process unresolved — cannot verify plan adherence, cannot grade A/A+.",
      canon: "§A-Setup",
      severity: "WARN",
    });
  }

  if (typeof input.plannedR !== "number" || !Number.isFinite(input.plannedR)) {
    reasons.push({
      message: "Planned R multiple missing — R is undefined without pre-entry planning.",
      canon: "§4 / §A-Setup",
      severity: "WARN",
    });
  }

  if (input.dayModel === undefined && grade !== "NO_TRADE") {
    reasons.push({
      message: "Day model not classified — canon requires M1 or M2 for a live-capital grade.",
      canon: "§Model 1/2",
      severity: "WARN",
    });
  }

  if (input.dayModel === "M1" && typeof input.plannedR === "number") {
    if (input.plannedR >= 4) {
      reasons.push({
        message: `Model 1 (TREND): planned R ${input.plannedR.toFixed(1)} ≥ 4R — A+ live-capital threshold met.`,
        canon: "§Model 1 (4R+ preferred)",
        severity: "PASS",
      });
    } else if (input.plannedR >= 3) {
      reasons.push({
        message: `Model 1 (TREND): planned R ${input.plannedR.toFixed(1)} ≥ 3R — A threshold met, below A+ (need 4R+).`,
        canon: "§Model 1 (3R minimum)",
        severity: "PASS",
      });
    } else {
      reasons.push({
        message: `Model 1 (TREND): planned R ${input.plannedR.toFixed(1)} < 3R minimum runway.`,
        canon: "§Model 1 (3R minimum)",
        severity: "FAIL",
      });
    }
  }

  if (input.dayModel === "M2" && typeof input.plannedR === "number") {
    if (input.plannedR >= 2) {
      reasons.push({
        message: `Model 2 (CHOP): planned R ${input.plannedR.toFixed(1)} ≥ 2R — A+ expansion.`,
        canon: "§Model 2 (2R+ expansion)",
        severity: "PASS",
      });
    } else if (input.plannedR >= 1) {
      reasons.push({
        message: `Model 2 (CHOP): planned R ${input.plannedR.toFixed(1)} ≥ 1R baseline.`,
        canon: "§Model 2 (1R baseline)",
        severity: "PASS",
      });
    } else {
      reasons.push({
        message: `Model 2 (CHOP): planned R ${input.plannedR.toFixed(1)} < 1R baseline.`,
        canon: "§Model 2 (1R baseline)",
        severity: "FAIL",
      });
    }
  }

  if (input.processQuality === "FOLLOWED_PLAN" && reasons.length === 0) {
    reasons.push({
      message: "Followed plan with no failing gate — A/A+ authorized on discipline.",
      canon: "§A-Setup",
      severity: "PASS",
    });
  }

  return { grade, reasons };
}
