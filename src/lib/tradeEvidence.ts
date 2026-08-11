export interface TradeOutcomeEvidence {
  entryPrice?: unknown;
  exitPrice?: unknown;
  pnl?: unknown;
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * A realized outcome is usable only when its price basis is present.
 * A standalone P&L number cannot establish a closed-trade result because it
 * cannot be reconciled to an entry, an exit, slippage, or fees.
 */
export function hasResolvedTradeOutcome(
  evidence: TradeOutcomeEvidence,
): evidence is Required<TradeOutcomeEvidence> {
  return (
    isFinitePositive(evidence.entryPrice) &&
    isFinitePositive(evidence.exitPrice) &&
    typeof evidence.pnl === "number" &&
    Number.isFinite(evidence.pnl)
  );
}
