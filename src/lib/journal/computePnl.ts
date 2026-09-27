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

import { realizedR, type DayModel } from "../proofLane/proofLaneR";
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
  /**
   * Canon §3. An M0 record is not a trade, so it has no money to be wrong
   * about (review, 2026-09-26: an M0 day on ES1! with hidden entry/exit values
   * would otherwise be told its $0.00 "is not ES money").
   */
  dayModel?: DayModel;
}

export interface RecordedMoney {
  readonly label: string;
  readonly mismatch: string | null;
  /** True when the stored P&L is exactly the $1-per-point figure — a pre-§17 save. */
  readonly savedAtOneX: boolean;
}

export function selectRecordedMoney(e: RecordedMoneyInput): RecordedMoney {
  const money = journalMoneyFor(e);
  const priceable = e.entry > 0 && e.exit > 0 && e.size > 0 && Number.isFinite(e.pnl);
  if (e.dayModel === "M0" || !priceable || (money.status === "PRICED" && money.basis !== "futures")) {
    return { label: money.label, mismatch: null, savedAtOneX: false };
  }
  const oneX = (e.exit - e.entry) * e.size * (e.side === "short" ? -1 : 1);
  const savedAtOneX = Math.abs(oneX - e.pnl) <= 0.005;
  if (money.status === "UNPRICED") {
    return {
      label: money.label,
      // §1/§20: WM has no price for this contract, so it cannot say the stored
      // figure is WRONG — only that it cannot be checked (verifier, G16 r3).
      mismatch: `the recorded P&L ${formatUsd(e.pnl)} cannot be checked as ${money.root} money — ${money.reason}`,
      savedAtOneX,
    };
  }
  const truth = computeJournalPnl(e);
  if (Math.abs(truth - e.pnl) <= 0.005) return { label: money.label, mismatch: null, savedAtOneX: false };
  return {
    label: money.label,
    mismatch: `the recorded P&L ${formatUsd(e.pnl)} was not priced at ${formatUsd(money.multiplier)} per point — at ${money.root}'s point value this trade is ${formatUsd(truth)}`,
    savedAtOneX,
  };
}

/**
 * WHICH CONTRACT A JOURNAL ROW IS, by the money it is priced at — not by the
 * stock/option picker alone (review NIT, 2026-09-26). The picker has no
 * futures, so an ES1! trade stored `contractType: "stock"` was filtered under
 * STK and wore no chip. The basis comes from `journalMoneyFor`, the same owner
 * the save used. An option on futures is still an option.
 */
export type JournalContractBasis = "stock" | "option" | "futures";

export function journalContractBasis(e: JournalMoneyInput): JournalContractBasis {
  const money = journalMoneyFor(e);
  if (money.status === "PRICED") return money.basis === "share" ? "stock" : money.basis;
  return money.refusal === "OPTION_ON_FUTURES" ? "option" : "futures";
}

/**
 * The contract chip on a journal list row, or null for a share (a share has
 * never worn one). A futures row names its root, and says so when its stored
 * money is not its futures money.
 */
export interface ContractChip {
  readonly basis: "option" | "futures";
  readonly text: string;
  /** Full words for `title` / `aria-label`. */
  readonly words: string;
  /** True when the row's money is not its contract's money (saved 1x, or unpriced). */
  readonly flagged: boolean;
}

export function selectContractChip(e: RecordedMoneyInput): ContractChip | null {
  const basis = journalContractBasis(e);
  if (basis === "stock") return null;
  const money = journalMoneyFor(e);
  if (basis === "option") {
    return money.status === "PRICED"
      ? { basis, text: "OPT", words: money.label, flagged: false }
      : { basis, text: "OPT", words: `${money.label} — ${money.reason}`, flagged: true };
  }
  const root = money.root ?? "";
  // Canon §3: an M0 row took no trade, so it names its contract and claims no
  // money state (seen on the glass, 2026-09-26: "FUT YM · UNPRICED" on a no-trade day).
  // The words say no money was recorded — never "UNPRICED" beside a blue,
  // unflagged chip (review NIT, 2026-09-26: title "FUTURES YM · UNPRICED" on a
  // chip whose colour said the contract was fine).
  if (e.dayModel === "M0") {
    return { basis, text: `FUT ${root}`, words: `FUTURES ${root} · M0 no-trade day — no money recorded`, flagged: false };
  }
  const recorded = selectRecordedMoney(e);
  if (recorded.mismatch !== null) {
    // "MONEY MISMATCH" only where WM knows the money (a PRICED root): an
    // unpriced root's figure cannot be called a mismatch, only UNPRICED.
    const tag = recorded.savedAtOneX ? "SAVED AT 1x" : money.status === "PRICED" ? "MONEY MISMATCH" : "UNPRICED";
    return {
      basis,
      text: `FUT ${root} · ${tag}`,
      words: `${money.label} — ${recorded.mismatch}`,
      flagged: true,
    };
  }
  if (money.status === "UNPRICED") return { basis, text: `FUT ${root} · UNPRICED`, words: `${money.label} — ${money.reason}`, flagged: true };
  return { basis, text: `FUT ${root}`, words: money.label, flagged: false };
}

/**
 * THE TOTALS SAY WHEN THEY HOLD PRE-§17 FUTURES MONEY.
 *
 * Found in review (2026-09-26): futures entries saved before the journal
 * priced futures at their point value carry $1-per-point dollars (an ES
 * trade of 10 points stored as $10, not $500), and that stored number feeds
 * every total — the header P&L, the coach's averages and setup rows, the
 * chart's P&L strip, /profile — and its stored realizedR feeds the daily R
 * stop. WM does not rewrite a stored figure behind the trader's back, and it
 * does not drop the rows either (that would be a second silent change to the
 * same totals). It counts them as recorded and SAYS so, here, once.
 *
 * THREE GROUPS, THREE SENTENCES (Garden 16 §65, 2026-09-26/27). Only a
 * FUTURES row on a PRICED root (`journalMoneyFor` → PRICED, basis futures)
 * whose stored P&L is exactly the $1-per-point figure (`savedAtOneX`) is
 * counted in `count` and told "$1 per point … understate": WM knows its point
 * value, so it knows the stored dollars are smaller. A futures row on an
 * UNPRICED root (no point value on file — YM, say) saved at $1 per point is
 * counted in `unknownCount`: WM knows how it was saved but NOT what it is
 * worth, so its sentence says the true money is UNKNOWN and names the roots —
 * never "understate", never "open it to see its futures money" (there is none
 * to see). Every other flagged row — an option on futures (stored at the
 * equity 100x), a futures figure that is neither 1x nor the point value, an
 * unpriced root not at 1x — is counted in `otherCount` and gets a neutral
 * sentence that names ONLY the kinds present (and the unpriced roots), and
 * says WM cannot confirm the figure — never that an unpriceable figure is
 * "not" its money, which WM cannot know.
 *
 * Never counted: M0 records (`selectRecordedMoney` owns that rule), shares,
 * equity options. Re-pricing a saved entry is not built yet; the note says
 * that too rather than pointing at a control that does not exist.
 */
export interface LegacyFuturesMoney {
  /** Futures trade records on a PRICED root stored at exactly $1 per point. */
  readonly count: number;
  /** Futures trade records on an UNPRICED root stored at $1 per point — true money UNKNOWN. */
  readonly unknownCount: number;
  /** The unpriced roots behind `unknownCount`, in first-seen order. */
  readonly unknownRoots: readonly string[];
  /** Other records whose stored P&L is not their contract's money. */
  readonly otherCount: number;
  readonly note: string | null;
  /** Short words for the chart's P&L strip; null exactly when `note` is. */
  readonly chip: string | null;
}

export const FUTURES_POINT_VALUE_SINCE = "2026-09-26";

export const NO_LEGACY_FUTURES_MONEY: LegacyFuturesMoney = { count: 0, unknownCount: 0, unknownRoots: [], otherCount: 0, note: null, chip: null };

export function describeLegacyFuturesMoney(records: readonly RecordedMoneyInput[]): LegacyFuturesMoney {
  let count = 0;
  let unknownCount = 0;
  const unknownRoots: string[] = [];
  let otherCount = 0;
  // Which kinds the "other" group actually holds, so its sentence names only
  // those (§20: never list a cause no row has).
  let otherOptionOnFutures = false;
  const otherUnpricedRoots: string[] = [];
  let otherPricedFigure = false;
  for (const r of records) {
    const recorded = selectRecordedMoney(r);
    if (recorded.mismatch === null) continue;
    const money = journalMoneyFor(r);
    if (recorded.savedAtOneX && money.status === "PRICED" && money.basis === "futures") count += 1;
    else if (recorded.savedAtOneX && money.status === "UNPRICED" && money.refusal === "NO_POINT_VALUE") {
      unknownCount += 1;
      if (!unknownRoots.includes(money.root)) unknownRoots.push(money.root);
    } else {
      otherCount += 1;
      if (money.status === "PRICED") otherPricedFigure = true;
      else if (money.refusal === "OPTION_ON_FUTURES") otherOptionOnFutures = true;
      else if (!otherUnpricedRoots.includes(money.root)) otherUnpricedRoots.push(money.root);
    }
  }
  if (count === 0 && unknownCount === 0 && otherCount === 0) return NO_LEGACY_FUTURES_MONEY;
  const sentences: string[] = [];
  const chips: string[] = [];
  if (count > 0) {
    const one = count === 1;
    sentences.push(
      `${count} futures ${one ? "entry was" : "entries were"} not priced at ${one ? "its" : "their"} point value when saved — `
      + `before ${FUTURES_POINT_VALUE_SINCE} the journal priced futures at $1 per point. `
      + `${one ? "It is" : "They are"} counted here as recorded, so these dollars and R understate ${one ? "it" : "them"}. `
      + `Open ${one ? "it" : "one"} to see its futures money; re-pricing saved entries is not available yet.`,
    );
    chips.push(`${count} futures at $1/pt`);
  }
  if (unknownCount > 0) {
    const one = unknownCount === 1;
    const roots = unknownRoots.join(", ");
    sentences.push(
      `${unknownCount} ${count > 0 ? "other " : ""}futures ${one ? "entry was" : "entries were"} saved at $1 per point; `
      + `WM has no point value for ${roots}, so ${one ? "its" : "their"} true money is UNKNOWN. `
      + `${one ? "It is" : "They are"} counted here as recorded.`,
    );
    chips.push(`${unknownCount} futures money UNKNOWN`);
  }
  if (otherCount > 0) {
    const one = otherCount === 1;
    const kinds: string[] = [];
    if (otherOptionOnFutures) kinds.push("an option on futures, which WM cannot price");
    if (otherUnpricedRoots.length > 0) kinds.push(`a futures root WM has no point value for (${otherUnpricedRoots.join(", ")})`);
    if (otherPricedFigure) kinds.push("a futures figure that is neither $1 per point nor the point value");
    sentences.push(
      `${otherCount} ${count + unknownCount > 0 ? "other " : ""}${one ? "entry carries" : "entries carry"} a recorded P&L WM cannot confirm as ${one ? "its" : "their"} contract's money `
      + `(${kinds.join("; ")}). `
      + `${one ? "It is" : "They are"} counted here as recorded. Open ${one ? "it" : "one"} to see why.`,
    );
    chips.push(`${otherCount} money mismatch`);
  }
  return { count, unknownCount, unknownRoots, otherCount, note: sentences.join(" "), chip: chips.join(" · ") };
}

/**
 * THE GATES THAT DECIDE WHETHER A JOURNAL ROW SHOWS ITS CONTRACT (Garden 16
 * §17 / §65). A futures or option row is shown as one even when it carries
 * no Model and no realized R — the gate reads the money basis, not the
 * stock/option picker. Owned here so /journal's list row and its Proof Lane
 * tile cannot drift apart, and so the rule is tested, not only read.
 */
export interface JournalProofFields extends JournalMoneyInput {
  dayModel?: DayModel;
  realizedR?: number;
  plannedRDollars?: number;
  mfeR?: number;
}

/** The list row's chip strip (Model, R, contract chip). */
export function journalRowShowsProofChips(e: JournalProofFields): boolean {
  return Boolean(e.dayModel) || typeof e.realizedR === "number" || journalContractBasis(e) !== "stock";
}

/** The detail view's "Proof Lane · Trade R Truth" block with its Contract tile. */
export function journalShowsProofLane(e: JournalProofFields): boolean {
  return Boolean(e.dayModel)
    || typeof e.plannedRDollars === "number"
    || journalContractBasis(e) !== "stock"
    || typeof e.mfeR === "number";
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

/**
 * WHAT saveEntry WRITES FOR MONEY — P&L and realized R — or a refusal.
 *
 * Found in review (Garden 16 §17, 2026-09-26): `selectJournalPricing` answers
 * NO_TRADE_DAY for M0 before it asks about the instrument, and saveEntry then
 * called `computeJournalPnl` anyway. On M0 the entry/exit/size fields are
 * hidden but keep whatever was typed, so an M0 day on YM1! (no point value on
 * file) with hidden values was written as pnl NaN → `result "be"` →
 * `JSON.stringify` null → refused by `hydrateJournalEntry` on the next load →
 * dropped from the book, and the persistence effect re-saved the book without
 * it. A no-trade record, lost for good.
 *
 *   - M0: no trade was taken, so there is no money to compute. pnl 0 (the
 *     stored shape needs a number, and `describeRecordOutcome` never shows it
 *     as money), realizedR undefined — what the modal already promises
 *     ("Realized R will be recorded as undefined"). `computeJournalPnl` is not
 *     called.
 *   - Otherwise: the P&L must be FINITE or nothing is written. The gate should
 *     have refused first; this is the second lock on the same door, because a
 *     NaN written here is not a wrong number, it is a deleted record.
 */
export interface JournalSaveMoneyInput extends RealizedRInput {
  /** Canon §3 M0, from the page's day model. */
  isNoTradeDay?: boolean;
}

export type JournalSaveMoney =
  | { readonly status: "WRITE"; readonly pnl: number; readonly realizedR: number | undefined }
  | { readonly status: "REFUSED"; readonly reason: string };

export function selectJournalSaveMoney(input: JournalSaveMoneyInput): JournalSaveMoney {
  if (input.isNoTradeDay) return { status: "WRITE", pnl: 0, realizedR: undefined };
  const pnl = computeJournalPnl(input);
  if (!Number.isFinite(pnl)) {
    const money = journalMoneyFor(input);
    return {
      status: "REFUSED",
      reason: money.status === "UNPRICED"
        ? `WM cannot price this ${money.root} trade: ${money.reason}`
        : "WM could not compute a finite P&L for this trade",
    };
  }
  return { status: "WRITE", pnl, realizedR: computeJournalRealizedR(input) };
}
