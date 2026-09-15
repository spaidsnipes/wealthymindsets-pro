/**
 * traderPerformanceStats — the four numbers /profile prints about the trader.
 *
 * ── THE DEFECT, AND IT IS NOT MAINLY THE DASH ─────────────────────────
 * /profile computed Win Rate / Avg R:R / Net P&L / Trades inline and seeded
 * them with `useState({ winRate: "—", avgRR: "—", netPnl: "—", trades: "0" })`.
 * With no closed trades the `if` never ran and three dashes stayed on screen.
 * That is the /creator defect again, and by itself it would be an ordinary
 * atom.
 *
 * IT IS NOT ORDINARY. One line down:
 *
 *   const avgLoss = losses > 0
 *     ? Math.abs(…sum of losses… / losses)
 *     : 1;                                   // ← HERE
 *   const rr = avgLoss > 0 ? (avgWin / avgLoss).toFixed(1) : "—";
 *   avgRR: rr !== "—" ? `${rr}:1` : "—",
 *
 * When the trader has NO LOSING TRADES, `avgLoss` is set to the sentinel `1`.
 * `avgWin / 1` is not a ratio. IT IS avgWin — A RAW DOLLAR AMOUNT — and it was
 * then rendered with `:1` glued to it and labelled "Avg R:R".
 *
 * A trader with three wins averaging $450 and no losses saw:
 *
 *     450.0:1        AVG R:R
 *
 * That is a FABRICATED STATISTIC PRINTED AS FACT on the page that tells a
 * person how good they are. Not an absence rendered badly — an invention.
 * And because `avgLoss` is now always ≥ 1, the guard `avgLoss > 0` can never
 * be false, so the `: "—"` branch behind it was DEAD CODE. The one place the
 * old code tried to refuse could not be reached.
 *
 * ── THE MATH THE PAGE WAS FLATTENING ──────────────────────────────────
 * A SUM and a RATIO do not fail the same way on an empty set, and the four
 * tiles rendered as though they did:
 *
 *   Net P&L   a SUM. The sum of no trades is 0. That is DEFINED and true —
 *             printing "$0" is honest, and the dash UNDERCLAIMED it.
 *   Trades    a COUNT. Zero is a fact.
 *   Win Rate  a RATIO. wins / 0 is UNDEFINED — there is no denominator.
 *   Avg R:R   a RATIO OF TWO MEANS. It needs at least one win AND at least
 *             one loss. With either side empty it is UNDEFINED. Substituting
 *             a sentinel for the missing side does not make it defined; it
 *             makes it WRONG, which is worse than blank.
 *
 * PURE — no clock, no I/O, no localStorage, no React.
 */

export type PerfStatKind =
  /** A real computed number, including zero. */
  | "MEASURED"
  /** The operation has no value on this data. Not zero. */
  | "UNDEFINED";

export interface PerfStat {
  label: string;
  /** What the tile shows. Never a bare glyph. */
  value: string;
  kind: PerfStatKind;
  /** WHY it reads the way it does. Carried on BOTH title and aria-label. */
  reason: string;
}

/** The only field these four numbers are allowed to read. */
export interface ClosedTradeInput {
  readonly pnl?: number;
}

function money(n: number): string {
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

export function traderPerformanceStats(
  closedTrades: readonly ClosedTradeInput[],
): PerfStat[] {
  const n = closedTrades.length;
  const pnl = (t: ClosedTradeInput) => (typeof t.pnl === "number" && Number.isFinite(t.pnl) ? t.pnl : 0);

  const winners = closedTrades.filter((t) => pnl(t) > 0);
  const losers = closedTrades.filter((t) => pnl(t) < 0);
  const netPnl = closedTrades.reduce((s, t) => s + pnl(t), 0);

  // A SUM over an empty set is 0 and that is a real answer.
  const net: PerfStat = {
    label: "Net P&L",
    value: money(netPnl),
    kind: "MEASURED",
    reason:
      n === 0
        ? "No closed trades yet, so the total is exactly zero. A sum over nothing is zero — this is a measured fact, not a missing number."
        : `Sum of realised P&L across ${n} closed ${n === 1 ? "trade" : "trades"}.`,
  };

  const trades: PerfStat = {
    label: "Trades",
    value: String(n),
    kind: "MEASURED",
    reason:
      n === 0
        ? "No trades have been closed yet. Zero is the measured count."
        : `${n} closed ${n === 1 ? "trade" : "trades"} counted from the journal and the paper book.`,
  };

  // A RATIO over an empty set has no denominator. Unlike the sum above, this
  // one genuinely has no value.
  const winRate: PerfStat =
    n === 0
      ? {
          label: "Win Rate",
          value: "No basis",
          kind: "UNDEFINED",
          reason:
            "A win rate is wins divided by trades. With no closed trades there is no denominator, so this is undefined — it is NOT zero percent, and WM will not print a rate it cannot defend.",
        }
      : {
          label: "Win Rate",
          value: `${Math.round((winners.length / n) * 100)}%`,
          kind: "MEASURED",
          reason: `${winners.length} of ${n} closed ${n === 1 ? "trade" : "trades"} finished positive.`,
        };

  // THE FABRICATION THIS FILE EXISTS FOR.
  let avgRR: PerfStat;
  if (winners.length === 0 || losers.length === 0) {
    avgRR = {
      label: "Avg R:R",
      value: "No basis",
      kind: "UNDEFINED",
      reason:
        losers.length === 0 && winners.length === 0
          ? "An average reward-to-risk needs at least one win and at least one loss. There are neither, so this is undefined — not zero and not infinite."
          : losers.length === 0
            ? "An average reward-to-risk is the average win divided by the average loss. There are no losing trades, so there is no average loss to divide by. This is UNDEFINED — substituting a stand-in for the missing side would turn a dollar amount into something that merely looks like a ratio."
            : "An average reward-to-risk is the average win divided by the average loss. There are no winning trades, so there is no average win. This is undefined.",
    };
  } else {
    const avgWin = winners.reduce((s, t) => s + pnl(t), 0) / winners.length;
    const avgLoss = Math.abs(losers.reduce((s, t) => s + pnl(t), 0) / losers.length);
    avgRR = {
      label: "Avg R:R",
      value: `${(avgWin / avgLoss).toFixed(1)}:1`,
      kind: "MEASURED",
      reason: `Average win across ${winners.length} winners divided by average loss across ${losers.length} losers. Both sides are real, so the ratio is real.`,
    };
  }

  return [winRate, avgRR, net, trades];
}
