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
 *  - Garden 16 §17: futures carry their POINT VALUE, read from the one owner
 *    (`instrumentEconomics`); a futures root with none on file is refused by
 *    name through `selectJournalPricing`, never priced at 1x or 0.
 *  - §24 R math: R = pnl / plannedRDollars. Never fabricated when
 *    plannedRDollars is missing / zero.
 *  - §4: 1R must be defined BEFORE entry, otherwise R is undefined.
 */

import { realizedR } from "../proofLane/proofLaneR";
import { instrumentEconomics, formatUsd } from "@/lib/marketData/contractEconomics";
import { classifySymbol } from "@/lib/marketData/symbolAssetClass";

export type Side = "long" | "short";
/**
 * What the trader picks in the modal. Deliberately NOT extended with a
 * "future": a futures contract is a fact about the SYMBOL (the class owner,
 * `classifySymbol`, already knows ES1! / ES=F / /ES), not a second thing the
 * trader must remember to press. "stock" is read as "the instrument itself,
 * not an option on it" — see `journalMoneyFor`.
 */
export type ContractType = "stock" | "option";

/** Standard option contract multiplier (canon §6). */
export const OPTION_MULTIPLIER = 100 as const;

/**
 * The stock/option multiplier ALONE — it does not know the symbol, so it can
 * not know a futures point value. Kept for the picker's own words; money for
 * a trade is answered by `journalMoneyFor`, which does know the symbol.
 */
export function contractMultiplierFor(contractType: ContractType | undefined): number {
  return contractType === "option" ? OPTION_MULTIPLIER : 1;
}

/**
 * JOURNAL MONEY — dollars per one point of price, per one unit of size, for
 * the trade in the form. Garden 16 §17: a chart can look right and still be
 * financially wrong.
 *
 * THE DEFECT THIS ENDS (2026-09-26): the journal priced every non-option trade
 * at 1x. An ES trade journaled as ES1! 5000 → 5010, 1 contract, was written
 * down as +$10.00 — the real money is +$500.00 ($50 per point). Win rate did
 * not move (the sign was right), which is exactly why nobody saw it; R, the
 * daily -2R stop and every dollar figure were fifty times too small.
 *
 * ONE OWNER OF PER-INSTRUMENT MONEY: `instrumentEconomics` (contractEconomics.ts),
 * which reads point values from `CONTRACT_MULTIPLIERS` (paperTrade.ts). This
 * function asks it for futures and restates nothing — no second table.
 *
 *   - FUTURES-class symbol, not an option → the owner's point value, or a
 *     NAMED refusal (never 1x, never 0) when no point value is on file.
 *   - option on a FUTURES symbol → refused: an option on ES is $50/point, not
 *     the 100x equity-option standard, and WM has no owner for that number.
 *   - option on anything else → 100x (canon §6).
 *   - everything else → 1x: shares, ETFs, spot crypto and FX units quote in the
 *     dollars they settle in. `ES` with no futures notation is Eversource
 *     Energy (NYSE: ES), a share — the modal prints the basis so a trader who
 *     meant the E-mini sees "1 share · $1.00 per point" before saving.
 */
export type JournalMoneyRefusal = "NO_POINT_VALUE" | "OPTION_ON_FUTURES";

export type JournalMoney =
  | {
      readonly status: "PRICED";
      readonly basis: "share" | "option" | "futures";
      /** Dollars per one point of price per one unit of size. */
      readonly multiplier: number;
      /** Futures root (`ES`) for a futures contract, null otherwise. */
      readonly root: string | null;
      /** Short words for the modal and detail view, e.g. "FUTURES ES · $50.00 / pt". */
      readonly label: string;
    }
  | {
      readonly status: "UNPRICED";
      readonly refusal: JournalMoneyRefusal;
      readonly root: string;
      readonly label: string;
      readonly reason: string;
    };

export interface JournalMoneyInput {
  symbol?: string;
  contractType?: ContractType;
}

export function journalMoneyFor(input: JournalMoneyInput): JournalMoney {
  const symbol = (input.symbol ?? "").trim();
  const isFutures = symbol !== "" && classifySymbol(symbol) === "FUTURES";
  if (isFutures) {
    const econ = instrumentEconomics(symbol, null);
    if (input.contractType === "option") {
      return {
        status: "UNPRICED",
        refusal: "OPTION_ON_FUTURES",
        root: econ.root,
        label: `OPTION ON ${econ.root} · UNPRICED`,
        reason: `an option on ${econ.root} futures is not priced at the 100x equity-option standard, and WM has no point value on file for options on futures`,
      };
    }
    if (econ.status === "PRICED") {
      return {
        status: "PRICED",
        basis: "futures",
        multiplier: econ.pointValue,
        root: econ.root,
        label: `FUTURES ${econ.root} · ${formatUsd(econ.pointValue)} / pt`,
      };
    }
    return {
      status: "UNPRICED",
      refusal: "NO_POINT_VALUE",
      root: econ.root,
      label: `FUTURES ${econ.root} · UNPRICED`,
      reason: econ.reason,
    };
  }
  if (input.contractType === "option") {
    return { status: "PRICED", basis: "option", multiplier: OPTION_MULTIPLIER, root: null, label: "OPTION · 100x" };
  }
  return { status: "PRICED", basis: "share", multiplier: 1, root: null, label: "STOCK · 1x" };
}

/**
 * The Contract words for a trade ALREADY IN the journal, and whether its
 * stored P&L is the money those words claim.
 *
 * Entries saved before futures were priced carry 1x dollars (an ES trade of
 * 10 points stored as $10, not $500). Printing "FUTURES ES · $50.00 / pt" beside
 * that stored number would be a new lie on top of the old one, so a futures
 * entry whose stored P&L is not its futures money says so, with both numbers.
 * Only futures are checked: a share or option P&L may legitimately differ from
 * the arithmetic (fees, an imported broker figure) and is left alone.
 */
export interface RecordedMoneyInput extends JournalMoneyInput {
  entry: number;
  exit: number;
  size: number;
  side: Side;
  pnl: number;
}

export function selectRecordedMoney(e: RecordedMoneyInput): { readonly label: string; readonly mismatch: string | null } {
  const money = journalMoneyFor(e);
  const priceable = e.entry > 0 && e.exit > 0 && e.size > 0 && Number.isFinite(e.pnl);
  if (!priceable || (money.status === "PRICED" && money.basis !== "futures")) {
    return { label: money.label, mismatch: null };
  }
  if (money.status === "UNPRICED") {
    return {
      label: money.label,
      mismatch: `the recorded P&L ${formatUsd(e.pnl)} is not ${money.root} money — ${money.reason}`,
    };
  }
  const truth = computeJournalPnl(e);
  if (Math.abs(truth - e.pnl) <= 0.005) return { label: money.label, mismatch: null };
  return {
    label: money.label,
    mismatch: `the recorded P&L ${formatUsd(e.pnl)} was not priced at ${formatUsd(money.multiplier)} per point — at ${money.root}'s point value this trade is ${formatUsd(truth)}`,
  };
}

export interface PnlInput {
  entry: number;
  exit: number;
  size: number;
  side: Side;
  contractType?: ContractType;
  /** The traded symbol — a futures contract is priced at its point value. */
  symbol?: string;
}

/**
 * Return the realized dollar P&L for a closed trade.
 * Long: (exit - entry) * size * multiplier
 * Short: negated
 * Multiplier from `journalMoneyFor`: futures point value, options 100x, else 1x.
 * Any non-positive entry/exit/size returns 0 (nothing to price — the save is
 * refused by `selectJournalPricing` before this number can be written).
 * An instrument WM cannot price returns NaN — NOT 0, which would read as a
 * breakeven, and NOT the 1x number, which would read as money. The save gate
 * (`selectJournalPricing`) refuses the same trade by name.
 */
export function computeJournalPnl(input: PnlInput): number {
  const { entry, exit, size, side } = input;
  if (!(entry > 0 && exit > 0 && size > 0)) return 0;
  const money = journalMoneyFor(input);
  if (money.status !== "PRICED") return Number.NaN;
  return (exit - entry) * size * money.multiplier * (side === "short" ? -1 : 1);
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
      /**
       * Set when the INSTRUMENT cannot be priced (no point value on file, an
       * option on futures) — a fact the trader cannot fix by typing a value,
       * so it is named apart from `missing`. Absent when only values are missing.
       */
      readonly money?: Extract<JournalMoney, { status: "UNPRICED" }>;
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
  /** The traded symbol and picker — whether the INSTRUMENT has money on file. */
  symbol?: string;
  contractType?: ContractType;
}

export function selectJournalPricing(input: JournalPricingInput): JournalPricingVerdict {
  if (input.isNoTradeDay) return { status: "NO_TRADE_DAY", missing: [], note: null };
  // The instrument is asked FIRST: no typed value can supply a point value WM
  // does not have, so telling the trader to "add the missing value" would send
  // them after the wrong fix.
  const money = journalMoneyFor(input);
  if (money.status === "UNPRICED") {
    return {
      status: "UNPRICEABLE",
      missing: [],
      money,
      note: `WM cannot price this ${money.root} trade: ${money.reason}. `
        + "It will not be recorded at $1 per point, which would understate the money, "
        + "nor as a breakeven at 0.00R, which would count in your win rate, grades and daily R stop. "
        + "Journal it once its point value is on file.",
    };
  }
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
  // An instrument WM cannot price has no dollars, so it has no R either.
  if (!Number.isFinite(pnl)) return undefined;
  try {
    return realizedR({ plannedRDollars: p, realizedPnlDollars: pnl });
  } catch {
    return undefined;
  }
}
