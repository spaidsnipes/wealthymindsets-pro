/**
 * Canonical user journey for the $100 Academy Challenge.
 *
 * This is presentation/navigation truth only. It owns no enrollment,
 * payment, market data, broker permission, or persistence state.
 */

export type ChallengeJourneyTruth =
  | "BROWSER_LOCAL_PROGRESS"
  | "THEORETICAL_WITH_LOCAL_MEASURED_OVERLAY"
  | "PAPER_SIMULATION"
  | "BROWSER_LOCAL_REVIEW";

export interface ChallengeJourneyStage {
  readonly id: "learn" | "plan" | "practice" | "review";
  readonly step: number;
  readonly title: string;
  readonly description: string;
  readonly href: "/education" | "/proof-lane" | "/paper" | "/journal";
  readonly action: string;
  readonly truth: ChallengeJourneyTruth;
}

export const CHALLENGE_JOURNEY: readonly ChallengeJourneyStage[] = [
  {
    id: "learn",
    step: 1,
    title: "Learn the process",
    description: "Build market, risk, and execution literacy in the Academy.",
    href: "/education",
    action: "Open Academy",
    truth: "BROWSER_LOCAL_PROGRESS",
  },
  {
    id: "plan",
    step: 2,
    title: "Choose the lane",
    description: "Compare the $100 pace mountain without treating it as a promise or permission to trade.",
    href: "/proof-lane",
    action: "Open Proof Lane",
    truth: "THEORETICAL_WITH_LOCAL_MEASURED_OVERLAY",
  },
  {
    id: "practice",
    step: 3,
    title: "Practice safely",
    description: "Exercise the plan with simulated funds before any broker-authorized execution.",
    href: "/paper",
    action: "Practice in Paper",
    truth: "PAPER_SIMULATION",
  },
  {
    id: "review",
    step: 4,
    title: "Review the decision",
    description: "Record Planned R, realized R, process quality, and the lesson in the Journal.",
    href: "/journal",
    action: "Open Journal",
    truth: "BROWSER_LOCAL_REVIEW",
  },
] as const;

/** Live execution is intentionally outside the Academy launch journey. */
export const CHALLENGE_EXECUTION_BOUNDARY = "LIVE_EXECUTION_EXCLUDED" as const;
