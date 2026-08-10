export type ProcessQuality = "FOLLOWED_PLAN" | "BROKE_RULES" | "UNRESOLVED";
export type ProcessOutcome =
  | "EARNED_WIN"
  | "PROFESSIONAL_LOSS"
  | "DANGEROUS_WIN"
  | "PREVENTABLE_LOSS"
  | "UNRESOLVED";

export function classifyProcessOutcome(processQuality: ProcessQuality, pnl: number): ProcessOutcome {
  if (processQuality === "UNRESOLVED" || !Number.isFinite(pnl) || pnl === 0) return "UNRESOLVED";
  if (processQuality === "FOLLOWED_PLAN") return pnl > 0 ? "EARNED_WIN" : "PROFESSIONAL_LOSS";
  return pnl > 0 ? "DANGEROUS_WIN" : "PREVENTABLE_LOSS";
}

export const PROCESS_OUTCOME_LABELS: Record<ProcessOutcome, string> = {
  EARNED_WIN: "Earned win",
  PROFESSIONAL_LOSS: "Professional loss",
  DANGEROUS_WIN: "Dangerous win",
  PREVENTABLE_LOSS: "Preventable loss",
  UNRESOLVED: "Process unresolved",
};
