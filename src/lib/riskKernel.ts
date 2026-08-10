export const RISK_KERNEL_FORMULA_VERSION = "wm.risk-kernel.v1" as const;

export type TradeSide = "LONG" | "SHORT";

export type AvailableRResult =
  | {
      status: "AVAILABLE";
      formulaVersion: typeof RISK_KERNEL_FORMULA_VERSION;
      value: number;
      barrier: number;
      estimatedCosts: number;
      riskPerUnit: number;
      netRewardPerUnit: number;
    }
  | { status: "UNKNOWN" | "UNAVAILABLE"; reason: string };

export interface AvailableRInput {
  side: TradeSide;
  entry: number | null;
  structuralStop: number | null;
  barrier: number | null;
  /** Dollar value of one full price point for one unit/contract. */
  pointValue: number | null;
  /** Full round-trip spread allowance in price points. */
  spreadPoints: number | null;
  /** Full round-trip slippage allowance in price points. */
  slippagePoints: number | null;
  /** Full round-trip commissions/fees for one unit/contract. */
  feesPerUnit: number | null;
}

export type PositionSizeResult =
  | {
      status: "AVAILABLE";
      formulaVersion: typeof RISK_KERNEL_FORMULA_VERSION;
      quantity: number;
      riskPerUnit: number;
      plannedDollarRisk: number;
      unusedRiskBudget: number;
    }
  | { status: "UNKNOWN" | "UNAVAILABLE"; reason: string };

export interface PositionSizeInput {
  accountRiskBudget: number | null;
  riskPerUnit: number | null;
  quantityStep: number | null;
  maxQuantity?: number | null;
}

const positive = (value: number | null): value is number =>
  value != null && Number.isFinite(value) && value > 0;
const nonNegative = (value: number | null): value is number =>
  value != null && Number.isFinite(value) && value >= 0;

export function calculateAvailableR(input: AvailableRInput): AvailableRResult {
  if (!positive(input.entry) || !positive(input.structuralStop) || !positive(input.barrier) ||
      !positive(input.pointValue)) {
    return { status: "UNKNOWN", reason: "Entry, structural stop, barrier, and point value are required." };
  }
  if (!nonNegative(input.spreadPoints) || !nonNegative(input.slippagePoints) || !nonNegative(input.feesPerUnit)) {
    return { status: "UNKNOWN", reason: "Spread, slippage, and fees must be explicitly resolved." };
  }

  const direction = input.side === "LONG" ? 1 : -1;
  const riskPoints = (input.entry - input.structuralStop) * direction;
  const rewardPoints = (input.barrier - input.entry) * direction;
  if (riskPoints <= 0) {
    return { status: "UNAVAILABLE", reason: `Structural stop is not on the loss side of a ${input.side} entry.` };
  }
  if (rewardPoints <= 0) {
    return { status: "UNAVAILABLE", reason: `Barrier does not provide reward space for a ${input.side} thesis.` };
  }

  const estimatedCosts = ((input.spreadPoints + input.slippagePoints) * input.pointValue) + input.feesPerUnit;
  const riskPerUnit = (riskPoints * input.pointValue) + estimatedCosts;
  const netRewardPerUnit = (rewardPoints * input.pointValue) - estimatedCosts;
  if (netRewardPerUnit <= 0) {
    return { status: "UNAVAILABLE", reason: "Estimated transaction costs consume the available reward space." };
  }

  return {
    status: "AVAILABLE",
    formulaVersion: RISK_KERNEL_FORMULA_VERSION,
    value: netRewardPerUnit / riskPerUnit,
    barrier: input.barrier,
    estimatedCosts,
    riskPerUnit,
    netRewardPerUnit,
  };
}

export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult {
  if (!positive(input.accountRiskBudget) || !positive(input.riskPerUnit) || !positive(input.quantityStep)) {
    return { status: "UNKNOWN", reason: "Risk budget, risk per unit, and quantity step are required." };
  }
  if (input.maxQuantity != null && !positive(input.maxQuantity)) {
    return { status: "UNAVAILABLE", reason: "Maximum quantity must be positive when supplied." };
  }

  const rawQuantity = input.accountRiskBudget / input.riskPerUnit;
  const capped = input.maxQuantity == null ? rawQuantity : Math.min(rawQuantity, input.maxQuantity);
  const quantity = Math.floor((capped + Number.EPSILON) / input.quantityStep) * input.quantityStep;
  if (quantity <= 0) {
    return { status: "UNAVAILABLE", reason: "Risk budget is too small for the minimum quantity step." };
  }
  const plannedDollarRisk = quantity * input.riskPerUnit;
  return {
    status: "AVAILABLE",
    formulaVersion: RISK_KERNEL_FORMULA_VERSION,
    quantity,
    riskPerUnit: input.riskPerUnit,
    plannedDollarRisk,
    unusedRiskBudget: Math.max(0, input.accountRiskBudget - plannedDollarRisk),
  };
}
