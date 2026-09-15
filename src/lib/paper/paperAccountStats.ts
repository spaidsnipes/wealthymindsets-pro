/**
 * paperAccountStats — the /paper account strip: Equity, Cash, Day P&L, Realized.
 *
 * ── THIS IS THE H1 MIRROR, AND IT IS AN OVER-CORRECTION ───────────────
 * This surface has been fixed once already, and correctly. The strip read
 *
 *     EQUITY $100,000 · CASH $100,000 · DAY P&L +$0.00 · REALIZED +$0.00
 *
 * with both P&L figures in the WIN tint on a book holding zero trades and zero
 * positions. `0 >= 0` is true, so the green was arithmetically earned and
 * factually a lie. That was a genuine OVERCLAIM and removing it was right.
 *
 * The remedy chosen was a dash:
 *
 *     v: bookRecoveryRequired ? "UNKNOWN" : bookNeverTraded ? "—" : `${…}`
 *
 * AND THE DASH IS THE OPPOSITE LIE. Day P&L and Realized are SUMS. The sum of
 * no trades is exactly $0.00 — that is DEFINED, it is a fact we hold, and a
 * dash in a money column says we do not hold it. The fix traded an overclaim
 * for an UNDERCLAIM and the page stopped saying a true thing.
 *
 * ── THE MISTAKE WAS PUTTING THE FIGURE AND THE TINT IN ONE DECISION ───
 * Only ONE of the two was ever wrong. The number `+$0.00` was correct the
 * whole time; the GREEN was the lie. Because both hung off the same ternary,
 * killing the tint killed the number with it.
 *
 * They are separate claims and this file separates them:
 *
 *   value  WHAT the book contains.  $0.00 — measured, always sayable.
 *   tone   WHAT IT MEANS.           NEUTRAL, because zero-from-never-trading
 *                                   and zero-from-trading-flat are DIFFERENT
 *                                   FACTS and only the second earns a tint.
 *   reason WHY it reads that way.   Carried on BOTH title and aria-label.
 *
 * A real trading day CAN close at exactly zero, and that flat result DOES keep
 * its tint. The question was never "is the number zero" — it is "was anything
 * ever traded".
 *
 * ── AND A SUM IS NOT A RATIO ──────────────────────────────────────────
 * Win Rate on the same page is a RATIO over closed trades. With nothing closed
 * it has no denominator and is genuinely UNDEFINED — not zero percent. It must
 * refuse. Day P&L must NOT refuse. One glyph was serving both.
 *
 * PURE — no clock, no I/O, no localStorage, no React.
 */

export type PaperStatKind =
  /** A real computed number, including zero. */
  | "MEASURED"
  /** The operation has no value on this book. Not zero. */
  | "UNDEFINED"
  /** We hold bytes we cannot interpret. Not absent — unreadable. */
  | "UNKNOWN";

/**
 * The TINT is a claim, separate from the figure.
 *
 * This is the whole lesson of the original defect: `+$0.00` was true and the
 * green beside it was false. Whoever renders must be able to keep one and drop
 * the other.
 */
export type PaperStatTone = "NEUTRAL" | "WIN" | "LOSS" | "ALERT";

export interface PaperStat {
  label: string;
  /** What the tile shows. Never a bare glyph. */
  value: string;
  kind: PaperStatKind;
  tone: PaperStatTone;
  /** WHY it reads the way it does. Carried on BOTH title and aria-label. */
  reason: string;
}

export interface PaperBookFacts {
  /** Stored bytes could not be interpreted; automatic writes are blocked. */
  readonly bookRecoveryRequired: boolean;
  /** Some option positions have no current mark, so totals are partial. */
  readonly hasUnmarkedOptions: boolean;
  readonly unmarkedOptionCount: number;
  /** No trades AND no positions — the book has never been put to work. */
  readonly neverTraded: boolean;
  readonly totalEquity: number;
  readonly cash: number;
  readonly dayPnl: number;
  readonly realizedPnl: number;
  /** Null when nothing has CLOSED. Null is not zero. */
  readonly winRatePct: number | null;
  readonly closedCount: number;
}

function usd0(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function signedUsd2(n: number): string {
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Exported so every cell on the page says the same thing about the same state. */
export const UNREADABLE_BOOK_REASON =
  "The stored paper book could not be interpreted. The original bytes are preserved and automatic writes are blocked, so this figure is UNKNOWN rather than absent — we hold data we cannot read, which is not the same as holding none.";

/**
 * A RESULT cell — Day P&L or Realized.
 *
 * Shared because the two differ only in which sum they report and in the
 * sentence that describes it. The over-correction is undone in exactly one
 * place: when the book has never traded the figure is still printed, and it is
 * the TONE that goes neutral.
 */
function resultStat(
  label: string,
  amount: number,
  facts: PaperBookFacts,
  neverTradedReason: string,
  tradedReason: string,
): PaperStat {
  if (facts.bookRecoveryRequired) {
    return { label, value: "UNKNOWN", kind: "UNKNOWN", tone: "ALERT", reason: UNREADABLE_BOOK_REASON };
  }

  // THE CORRECTION. The figure survives; only the tint is withheld.
  if (facts.neverTraded) {
    return {
      label,
      value: signedUsd2(0),
      kind: "MEASURED",
      tone: "NEUTRAL",
      reason: neverTradedReason,
    };
  }

  return {
    label,
    value: signedUsd2(amount),
    kind: "MEASURED",
    tone: amount > 0 ? "WIN" : amount < 0 ? "LOSS" : "NEUTRAL",
    reason: tradedReason,
  };
}

export function paperAccountStats(facts: PaperBookFacts): PaperStat[] {
  const equity: PaperStat = facts.bookRecoveryRequired
    ? { label: "Equity", value: "UNKNOWN", kind: "UNKNOWN", tone: "ALERT", reason: UNREADABLE_BOOK_REASON }
    : facts.hasUnmarkedOptions
      ? {
          label: "Equity",
          value: "UNKNOWN",
          kind: "UNKNOWN",
          tone: "ALERT",
          reason: `${facts.unmarkedOptionCount} option position${facts.unmarkedOptionCount === 1 ? " has" : "s have"} no current mark, so total portfolio value cannot be stated. This is a partial cost basis, not a valuation.`,
        }
      : {
          label: "Equity",
          value: usd0(facts.totalEquity),
          kind: "MEASURED",
          tone: "NEUTRAL",
          // EQUITY AND CASH WERE NEVER PART OF THE DEFECT. $100,000 of
          // simulated cash really is held — an observed fact about the book,
          // true before the first trade and after it.
          reason: `Simulated cash plus the marked value of every open position. This is what the book holds right now, and it is a fact whether or not anything has been traded.`,
        };

  const cash: PaperStat = facts.bookRecoveryRequired
    ? { label: "Cash", value: "UNKNOWN", kind: "UNKNOWN", tone: "ALERT", reason: UNREADABLE_BOOK_REASON }
    : {
        label: "Cash",
        value: usd0(facts.cash),
        kind: "MEASURED",
        tone: "NEUTRAL",
        reason:
          "Uncommitted simulated cash in the paper book. No real money and no broker is involved.",
      };

  const dayPnl = resultStat(
    facts.hasUnmarkedOptions ? "Known P&L" : "Day P&L",
    facts.dayPnl,
    facts,
    "No trades have been placed and no positions are open, so the total is exactly zero. A sum over nothing is zero — this is a measured fact, not a missing number. It carries no win tint, because zero from never trading is not the same fact as a day that traded and finished flat.",
    facts.hasUnmarkedOptions
      ? `Realised plus unrealised P&L, EXCLUDING ${facts.unmarkedOptionCount} option position${facts.unmarkedOptionCount === 1 ? "" : "s"} with no current mark. Known P&L only.`
      : "Realised P&L on closed trades plus unrealised P&L on open positions, marked at current prices.",
  );

  const realized = resultStat(
    "Realized",
    facts.realizedPnl,
    facts,
    "No trades have been closed, so realised P&L is exactly zero. A sum over nothing is zero — this is measured, not missing. It carries no win tint, because nothing was won.",
    "Sum of P&L across closed trades only. Open positions are not counted here.",
  );

  return [equity, cash, dayPnl, realized];
}

/**
 * Win Rate — the RATIO on the same page, which genuinely must refuse.
 *
 * `selectPaperWinRate` returns `pct: null` when nothing has closed, and its own
 * doc told callers to render that as "—". A bare glyph says nothing on a phone,
 * and it looked identical to the Day P&L dash beside it even though one was a
 * real refusal and the other was an erased zero.
 */
export function paperWinRateStat(facts: PaperBookFacts): PaperStat {
  if (facts.bookRecoveryRequired) {
    return { label: "Win Rate", value: "UNKNOWN", kind: "UNKNOWN", tone: "ALERT", reason: UNREADABLE_BOOK_REASON };
  }

  if (facts.winRatePct == null) {
    return {
      label: "Win Rate",
      value: "No basis",
      kind: "UNDEFINED",
      tone: "NEUTRAL",
      reason:
        "A win rate is wins divided by CLOSED trades. Nothing has closed, so there is no denominator and this is undefined. It is NOT zero percent — zero percent would assert every trade taken was lost.",
    };
  }

  return {
    label: "Win Rate",
    value: `${facts.winRatePct}%`,
    kind: "MEASURED",
    tone: "NEUTRAL",
    reason: `Share of ${facts.closedCount} closed ${facts.closedCount === 1 ? "trade" : "trades"} that finished positive. Opening fills realise nothing and are not counted.`,
  };
}
