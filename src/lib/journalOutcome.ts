export type FinancialOutcome = "win" | "loss" | "be";

/** Financial outcome only. This never grades process quality. */
export function classifyFinancialOutcome(pnl: number): FinancialOutcome {
  if (!Number.isFinite(pnl) || pnl === 0) return "be";
  return pnl > 0 ? "win" : "loss";
}
