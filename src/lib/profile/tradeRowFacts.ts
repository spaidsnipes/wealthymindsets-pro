/**
 * tradeRowFacts — the Recent Trades row on /profile.
 *
 * Same chain as scannerMetricFacts / scannerFundamental, a different surface.
 * These rows are the trader's own history, which makes a vague cell worse here
 * than anywhere: WM is not failing to describe a stock, it is failing to
 * describe something the trader DID.
 *
 * ── DEFECT ONE: ONE CONDITION, TWO VOCABULARIES, SIDE BY SIDE ────────────
 *
 * The P&L span and the R:R span are adjacent children of the same flex row and
 * they fire on overlapping conditions, in different languages:
 *
 *     pnl: resolvedPnl !== null ? `…$…` : "Unresolved",
 *     rr:  outcomeResolved && t.rr != null ? `${t.rr.toFixed(1)}R` : "—",
 *
 * When the outcome is unresolved the reader sees the WORD "Unresolved" and,
 * three pixels to its right, a `—` in gold. Two renderings of one fact that do
 * not agree with each other. The P&L span even carries a `title` explaining
 * itself; the R:R span carries nothing at all.
 *
 * ── DEFECT TWO: TWO DIFFERENT SILENCES SHARE THE DASH ────────────────────
 *
 * `outcomeResolved && t.rr != null` is one `&&` hiding two facts. WM has not
 * confirmed the trade closed is NOT the same as the trade closed and the trader
 * never wrote down a planned R. The first is a gap in WM's evidence; the second
 * is a gap in the trader's own record, and it is the one WM could actually
 * prompt them to fill.
 *
 * ── DEFECT THREE: `!= null` IS NOT `isFinite`, AND THE CELL PRINTS "NaNR" ──
 *
 * `t.rr` is parsed from localStorage and typed `number | undefined`, which the
 * compiler believes. `NaN != null` is TRUE, so a corrupt or half-written entry
 * reaches `NaN.toFixed(1)` — the string "NaN" — and the row renders
 *
 *     NaNR
 *
 * in gold, bold, with no tooltip, styled EXACTLY like a real measurement.
 * That is worse than the dash it sits beside: the dash admits it knows nothing,
 * and this one does not.
 *
 * ── WHAT IS DELIBERATELY *NOT* CLAIMED ───────────────────────────────────
 *
 * Nothing here computes an R:R that the trader did not record. Entry, exit and
 * P&L are present on a resolved row, and a risk multiple could be *guessed*
 * from them by assuming a stop — but the stop is exactly what WM does not have.
 * An assumed stop is an invented denominator, which is the volume-ratio defect
 * wearing a trading vocabulary. WM states that no planned R was recorded.
 *
 * Nothing here calls an unresolved trade a loss, or a win, or open. WM says its
 * evidence is incomplete and names which evidence.
 *
 * PURE — no clock, no I/O, no React.
 */

export type TradeRowState =
  /** WM holds the figure and it is finite. */
  | "MEASURED"
  /** WM has not confirmed the trade closed. A gap in WM's EVIDENCE. */
  | "OUTCOME_UNRESOLVED"
  /** The trade closed; the trader never recorded this field. Their record. */
  | "NOT_RECORDED"
  /** A value is present and is not a usable number. Corrupt, not absent. */
  | "NOT_NUMERIC";

export interface TradeRowFact {
  /** What the cell says. Never a bare glyph, never "NaNR". */
  readonly text: string;
  readonly state: TradeRowState;
  /** Carried on both `title` and `aria-label`. */
  readonly reason: string;
}

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Risk multiple. THE FIX FOR ALL THREE DEFECTS.
 *
 * `outcomeResolved` is passed in rather than re-derived so this owner and the
 * P&L cell beside it cannot drift onto different answers for the same row —
 * a second predicate for one question is a second place for the two to disagree.
 */
export function riskMultipleFact(
  rr: unknown,
  outcomeResolved: boolean,
  symbol: string,
): TradeRowFact {
  if (!outcomeResolved) {
    return {
      text: "Unresolved",
      state: "OUTCOME_UNRESOLVED",
      reason: `WM has not confirmed that the ${symbol} trade closed — the record is missing a usable entry price, exit price, or both — so it will not state a realized risk multiple. The P&L beside this cell is withheld for the same reason and says so in the same words. WM is not claiming the trade was a loss, a win, or still open.`,
    };
  }
  if (rr == null) {
    return {
      text: "No planned R",
      state: "NOT_RECORDED",
      reason: `The ${symbol} trade closed with entry and exit evidence, but no planned R was recorded when it was logged, so there is no risk to divide the result by. WM will NOT infer one from the entry and exit: that would require assuming a stop WM never saw, and an assumed denominator is an invented figure. This is a gap in the trade record, not in WM's data.`,
    };
  }
  if (!finite(rr)) {
    return {
      text: "Unreadable",
      state: "NOT_NUMERIC",
      reason: `The ${symbol} trade carries a planned-R value that is not a usable number. WM is naming it as unreadable rather than formatting it — the previous rendering put it through toFixed and printed the literal text "NaNR" in the same gold as a real measurement, which claimed more than a dash would have.`,
    };
  }
  return {
    text: `${rr.toFixed(1)}R`,
    state: "MEASURED",
    reason: `The ${symbol} trade returned ${rr.toFixed(1)} times the risk the trader planned for it. This is the recorded planned R applied to a closed outcome WM confirmed from entry and exit prices, not a figure WM derived on its own.`,
  };
}

/**
 * A price the row shows beside the symbol. Entry and exit both printed `—`,
 * and the two are not the same absence on an OPEN position: no exit price is
 * the normal state of a trade still running.
 */
export function tradePriceFact(
  price: unknown,
  which: "entry" | "exit",
  symbol: string,
): TradeRowFact {
  if (finite(price) && price > 0) {
    return {
      text: String(price),
      state: "MEASURED",
      reason: `Recorded ${which} price for the ${symbol} trade, as the trader logged it.`,
    };
  }
  if (price == null) {
    return {
      text: "Not recorded",
      state: "NOT_RECORDED",
      reason: `No ${which} price was recorded for this ${symbol} trade. Without it WM cannot treat the outcome as resolved, which is why the P&L on this row is withheld too.`,
    };
  }
  return {
    text: "Unreadable",
    state: "NOT_NUMERIC",
    reason: `The ${which} price stored for this ${symbol} trade is present but is not a usable positive number, so WM will not print it as though it were one.`,
  };
}

/**
 * The symbol itself. `t.symbol ?? "—"` made the row's IDENTITY a glyph — the
 * one field that tells the trader which trade they are looking at.
 */
/**
 * ── DEFECT FOUR: THE COLUMN THAT ASKED THE WRONG FIELD ───────────────────
 *
 * The row's date cell read:
 *
 *     date: t.createdAt ? new Date(t.createdAt).toLocaleDateString(…) : "—",
 *
 * `/journal` HAS NEVER WRITTEN `createdAt`. Its save path writes
 * `date: new Date().toISOString().slice(0, 10)` and nothing else. The ternary's
 * true arm was therefore UNREACHABLE for every journal-sourced row, and every
 * one of them printed `—` — while the very object being destructured two lines
 * above carried the date under `date`, a field the local type even DECLARES.
 *
 * WM held the date, in the same expression, and said nothing. That is the
 * understating-knowledge defect from the /charts header, on a second surface:
 * the ternary was not measuring absence, it was measuring a typo.
 *
 * ── DEFECT FIVE: A DATE-ONLY STRING IS NOT AN INSTANT ────────────────────
 *
 * MEASURED, in America/New_York:
 *
 *     new Date("2026-03-03").toLocaleDateString("en-US", {month:"short", day:"numeric"})
 *       → "Mar 2"
 *
 * `YYYY-MM-DD` is parsed by the spec as UTC MIDNIGHT, then rendered in local
 * time — so west of Greenwich every date-only journal entry renders as THE DAY
 * BEFORE the day the trader logged it. Not a formatting wobble: a wrong date on
 * the trader's own record, printed with no hedge. A calendar date carries no
 * timezone, so it must never be routed through an instant to be displayed.
 *
 * ── DEFECT SIX: "Invalid Date" IS "NaNR" IN A DATE'S VOCABULARY ──────────
 *
 * `t.createdAt ? …` is a TRUTHINESS test, not a parse check. Any non-empty
 * string passes it, so a corrupt value reaches `toLocaleDateString` and the cell
 * renders the literal text
 *
 *     Invalid Date
 *
 * in the same mono as a real date — the exact failure `riskMultipleFact` was
 * written to end, wearing different words.
 *
 * ── DEFECT SEVEN: TWO POPULATIONS WEARING ONE COLUMN ─────────────────────
 *
 * The journal mapper feeds this column the date the trade was OPENED; the paper
 * mapper feeds it the date the trade was CLOSED. They interleave in one list
 * under no header at all, so two rows showing the same figure are answering two
 * different questions and nothing on screen says which. The basis now travels
 * WITH the date.
 *
 * ── WHAT IS DELIBERATELY *NOT* CLAIMED ───────────────────────────────────
 *
 * Nothing here infers a date from a neighbouring field, and nothing substitutes
 * "today" for a missing one. A row whose date WM cannot read says so and keeps
 * its place in the list — a trade the trader took is not erased because one
 * field is unreadable.
 */

/** Which question this row's date answers. The two are NOT interchangeable. */
export type TradeDateBasis = "OPENED" | "CLOSED";

export interface TradeDateFact extends TradeRowFact {
  /** Rendered beneath the date so the column cannot conflate its two feeds. */
  readonly basisLabel: string;
}

const DATE_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** `YYYY-MM-DD`, exactly — the shape /journal writes. */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function basisWord(basis: TradeDateBasis): string {
  return basis === "OPENED" ? "opened" : "closed";
}

export function tradeDateFact(
  raw: unknown,
  basis: TradeDateBasis,
  symbol: string,
): TradeDateFact {
  const word = basisWord(basis);
  const basisLabel = word;

  if (raw == null || (typeof raw === "string" && raw.trim() === "")) {
    return {
      text: "No date",
      state: "NOT_RECORDED",
      basisLabel,
      reason: `This ${symbol} trade was saved without a date, so WM cannot say when it was ${word}. WM will not substitute today's date or infer one from the row's position in the list — the list is not ordered by time.`,
    };
  }

  if (typeof raw === "string") {
    const m = DATE_ONLY.exec(raw.trim());
    if (m) {
      // A CALENDAR DATE, NOT AN INSTANT. Formatted from its own digits.
      // Routing it through `new Date(…)` would parse it as UTC midnight and
      // render the PREVIOUS day everywhere west of Greenwich.
      const year = Number(m[1]);
      const month = Number(m[2]);
      const day = Number(m[3]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return {
          text: `${DATE_MONTHS[month - 1]} ${day} '${m[1].slice(2)}`,
          state: "MEASURED",
          basisLabel,
          reason: `The date the trader recorded for this ${symbol} trade, the day it was ${word}. It is a calendar date with no time and no timezone, so WM prints its digits as written rather than converting it to an instant — the previous rendering did convert it, and showed the day BEFORE the logged day in every timezone west of Greenwich. The year is shown because a trade from a prior year is not a recent one.`,
        };
      }
    }
  }

  const parsed =
    typeof raw === "string" || typeof raw === "number" ? new Date(raw) : new Date(Number.NaN);
  if (!Number.isFinite(parsed.getTime())) {
    return {
      text: "Unreadable",
      state: "NOT_NUMERIC",
      basisLabel,
      reason: `The date stored on this ${symbol} trade is present but WM cannot read it as a date. It is named as unreadable rather than formatted — the previous rendering only tested that the value was truthy, so a corrupt entry reached the formatter and printed the literal text "Invalid Date" in the same mono as a real date.`,
    };
  }

  return {
    text: `${DATE_MONTHS[parsed.getMonth()]} ${parsed.getDate()} '${String(parsed.getFullYear()).slice(2)}`,
    state: "MEASURED",
    basisLabel,
    reason: `The timestamp recorded when this ${symbol} trade was ${word}, shown in this device's local timezone. This value carries a time of day, so unlike a calendar date it genuinely is an instant and WM converts it — but WM does not claim the exchange agreed it was that date.`,
  };
}

export function tradeSymbolFact(symbol: unknown): TradeRowFact {
  if (typeof symbol === "string" && symbol.trim().length > 0) {
    return {
      text: symbol,
      state: "MEASURED",
      reason: `Symbol as the trader recorded it on this trade. WM is repeating the stored value, not resolving it against any instrument registry.`,
    };
  }
  return {
    text: "No symbol",
    state: "NOT_RECORDED",
    reason: `This trade was saved without a symbol, so WM cannot say which instrument it was. The row is still shown rather than dropped — a trade the trader took is not erased because one field is missing — but WM will not guess the ticker.`,
  };
}
