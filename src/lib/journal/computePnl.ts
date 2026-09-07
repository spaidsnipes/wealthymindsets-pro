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

/**
 * WHETHER THIS TRADE CAN BE PRICED AT ALL.
 *
 * THE DEFECT THIS EXISTS TO STOP: `computeJournalPnl` returns the NUMBER 0
 * when entry/exit/size are missing — documented as "nothing to price". But 0
 * is not "nothing to price", 0 is BREAKEVEN, and the type has no room to say
 * the difference. So a trade the journal could not price was written down as:
 *
 *     pnl 0 -> classifyFinancialOutcome(0) -> "be"   (a breakeven trade)
 *     pct 0                                          (flat)
 *     realizedR 0 / plannedR -> 0.00R                (a perfectly flat result)
 *
 * and then flowed into win rate, process x outcome, setup grades, and
 * `evaluateShutdown` — the daily -2R circuit breaker. The trader's memory loop
 * (Observe -> Remember -> Reflect) was being taught a trade that never had a
 * price.
 *
 * What makes it sharp: the Log New Trade modal ALREADY tells the truth. Its
 * live Realized-R tile renders "Awaiting entry/exit/size" for exactly this
 * state. The screen is honest while the trader is looking at it and records
 * the lie the moment they press Save.
 *
 * So the verdict lives here, beside the math that cannot express it, and the
 * page is required to ask before it writes.
 */
export type JournalPricingVerdict =
  | { readonly status: "PRICEABLE"; readonly missing: readonly []; readonly note: null }
  /**
   * Canon §3 M0 = NO TRADE. Entry/exit/size are DELIBERATELY absent, not
   * missing. This is a third state on purpose: rounding it down to
   * UNPRICEABLE would block a legitimate reflective record, and rounding it
   * up to PRICEABLE would price a trade that never happened.
   */
  | { readonly status: "NO_TRADE_DAY"; readonly missing: readonly []; readonly note: null }
  | {
      readonly status: "UNPRICEABLE";
      readonly missing: readonly PriceField[];
      readonly note: string;
    };

export type PriceField = "entry" | "exit" | "size";

const PRICE_FIELD_LABELS: Record<PriceField, string> = {
  entry: "entry price",
  exit: "exit price",
  size: "size",
};

export interface JournalPricingInput {
  entry?: number;
  exit?: number;
  size?: number;
  /** Canon §3 M0. The page owns the day model; this module owns the rule. */
  isNoTradeDay?: boolean;
}

export function selectJournalPricing(input: JournalPricingInput): JournalPricingVerdict {
  if (input.isNoTradeDay) return { status: "NO_TRADE_DAY", missing: [], note: null };
  const missing = (["entry", "exit", "size"] as const).filter((field) => {
    const v = input[field];
    // A field is present only if it is a real, positive number. `undefined`,
    // NaN (what `parseFloat("")` yields), 0 and negatives are all absence of a
    // price — and NaN especially must never reach the math, because
    // classifyFinancialOutcome maps non-finite straight to "be" as well.
    return !(typeof v === "number" && Number.isFinite(v) && v > 0);
  });
  if (missing.length === 0) return { status: "PRICEABLE", missing: [], note: null };
  const labels = missing.map((f) => PRICE_FIELD_LABELS[f]);
  const list = labels.length === 1
    ? labels[0]
    : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  return {
    status: "UNPRICEABLE",
    missing,
    // Names the missing field so the trader can act, and says what WM will NOT
    // do — because the alternative it is refusing (a silent 0.00R breakeven) is
    // exactly what a trader would otherwise assume had been saved correctly.
    note: `This trade has no ${list}, so WM cannot price it. `
      + "Recording it now would enter it in your journal as a breakeven at 0.00R "
      + "and count it in your win rate, grades and daily R stop. "
      + `Add the ${labels.length === 1 ? "missing value" : "missing values"} to save it.`,
  };
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
