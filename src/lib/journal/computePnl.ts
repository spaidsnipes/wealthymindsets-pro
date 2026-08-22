/**
 * computeJournalPnl — pure P&L + realized-R math for a Journal trade.
 *
 * Extracted so the state-matrix (side × contractType × direction × plannedR
 * present/absent) can be adversarially tested per canon §22 Orkin protocol.
 * The React component in src/app/journal/page.tsx composes these two pure
 * functions; the same code path also feeds the live-Realized-R tile in the
 * Log New Trade modal.
 *
 * Canon anchors:
 *  - §6 Contract Lens: options carry a 100x standard multiplier.
 *  - §24 R math: R = pnl / plannedRDollars. Never fabricated when
 *    plannedRDollars is missing / zero.
 *  - §4: 1R must be defined BEFORE entry, otherwise R is undefined.
 */

import { realizedR } from "../proofLane/proofLaneR";

export type Side = "long" | "short";
export type ContractType = "stock" | "option";

/** Standard option contract multiplier (canon §6). */
export const OPTION_MULTIPLIER = 100 as const;

export function contractMultiplierFor(contractType: ContractType | undefined): number {
  return contractType === "option" ? OPTION_MULTIPLIER : 1;
}

export interface PnlInput {
  entry: number;
  exit: number;
  size: number;
  side: Side;
  contractType?: ContractType;
}

/**
 * Return the realized dollar P&L for a closed trade.
 * Long: (exit - entry) * size * multiplier
 * Short: negated
 * Options: * 100 multiplier.
 * Any non-positive entry/exit/size returns 0 (nothing to price).
 */
export function computeJournalPnl(input: PnlInput): number {
  const { entry, exit, size, side } = input;
  if (!(entry > 0 && exit > 0 && size > 0)) return 0;
  const mult = contractMultiplierFor(input.contractType);
  return (exit - entry) * size * mult * (side === "short" ? -1 : 1);
}

export interface RealizedRInput extends PnlInput {
  plannedRDollars?: number;
}

/**
 * Return realized R when plannedR is defined pre-entry, undefined otherwise.
 * NEVER fabricates an R from bare P&L. NEVER throws when plannedR is missing.
 * NEVER conflates R with contract-return %.
 */
export function computeJournalRealizedR(input: RealizedRInput): number | undefined {
  const p = input.plannedRDollars;
  if (!(typeof p === "number" && Number.isFinite(p) && p > 0)) return undefined;
  const pnl = computeJournalPnl(input);
  try {
    return realizedR({ plannedRDollars: p, realizedPnlDollars: pnl });
  } catch {
    return undefined;
  }
}
