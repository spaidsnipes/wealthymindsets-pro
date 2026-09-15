/**
 * pnlStatsFacts — the P&L Stats strip under the chart.
 *
 * Same chain as tradeRowFacts / scannerMetricFacts. This strip is the most
 * dangerous of the three, because every one of its six numbers is initialised
 * to `0` and `0` is ALSO a legitimate reading. The panel could not tell the
 * trader apart from a trader who had lost nothing, won nothing and logged
 * nothing — and it painted the difference in green.
 *
 * ── DEFECT ONE: ZERO IS THE EMPTY STATE *AND* A MEASUREMENT ──────────────
 *
 *     const [netPnl, setNetPnl] = useState(0);
 *     const isPos = netPnl >= 0;
 *
 * With no journal entries the strip rendered `+$0.00` beside a green up-arrow,
 * `Win Rate 0.0%` in RED, and `Avg Win $0` in green. A trader who has never
 * logged a trade was shown a 0% win rate in the colour of failure. Nothing on
 * screen distinguished "WM measured your trades and they net to zero" from
 * "WM has no trades to measure". Those are not the same fact and one of them
 * is an accusation.
 *
 * `isPos = netPnl >= 0` is a BINARY over a THREE-state quantity. A net of
 * exactly zero is a scratch, not a win; it does not earn the up-arrow.
 *
 * ── DEFECT TWO: A GLYPH CONCATENATED INTO A UNIT — `"—R"` ────────────────
 *
 *     const rMultiple = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "—";
 *     { label: "R-Multiple", val: `${rMultiple}R`, color: "#F0B429" }
 *
 * When there is no losing trade there is no denominator, so the dash was
 * template-literalled straight into the unit and the cell printed the literal
 * text `—R` in measurement gold. This is `"NaNR"` on /profile wearing a
 * different glyph: a refusal formatted to look exactly like a reading.
 *
 * WM will NOT call that infinite R either. No losing trade yet is a fact about
 * how little has been recorded, not a fact about edge.
 *
 * ── DEFECT THREE: `e.pnl` IS `any` FROM localStorage ─────────────────────
 *
 * The rows are `JSON.parse`d and typed `any`, so nothing checks finiteness.
 *
 *   - `NaN > 0` is false and `NaN < 0` is false, so a corrupt row landed in
 *     NEITHER wins nor losses yet still counted in `allTrades.length` — the
 *     DENOMINATOR of the win rate. Corruption silently deflated the number.
 *   - `s + (e.pnl ?? 0)` does not save it: `NaN ?? 0` is NaN, so ONE corrupt
 *     row rendered Net P&L as `$NaN` in green.
 *
 * ── DEFECT FOUR: `catch {}` RENDERS AS A MEASUREMENT OF ZERO ─────────────
 *
 * The loader swallowed every throw. Unparseable storage left the initial
 * zeros on screen, fully coloured, indefinitely — a read FAILURE displayed as
 * a reading of nothing. The parse now happens here and a throw is a NAMED
 * state, not silence.
 *
 * ── DEFECT FIVE: A SCOPE UNSTATED IS A SCOPE ASSUMED ─────────────────────
 *
 * The strip said "from journal" and nothing else while computing over EVERY
 * entry ever logged. It sits under a live chart, where "Net P&L" reads as the
 * session. (`todayTrades` was even computed in the loader and then discarded
 * unused.) Every reason below names the window out loud.
 *
 * ── WHAT IS DELIBERATELY *NOT* CLAIMED ───────────────────────────────────
 *
 * Nothing here infers a P&L for a row that did not record one, and nothing
 * drops such a row silently. Skipped rows are COUNTED and the count is stated
 * in the reason of every figure they could have changed — a percentage over 9
 * of 10 rows has to say so, or it is a percentage pretending to be a census.
 *
 * PURE — no clock, no storage access, no React.
 */

export type PnlStatState =
  /** WM computed this from finite recorded values. */
  | "MEASURED"
  /** No usable trade rows at all. Not a result of zero — an absence of input. */
  | "NO_TRADES"
  /** Trades exist but none lost, so the denominator does not exist yet. */
  | "NO_LOSSES_YET"
  /** Trades exist but none won, so this figure has no sample. */
  | "NO_WINS_YET"
  /** Stored journal could not be parsed. A read failure, not a reading. */
  | "RECORD_UNREADABLE";

/** Drives colour. REFUSED must never be painted as a measurement. */
export type PnlTone = "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "REFUSED";

export interface PnlStat {
  readonly label: string;
  /** What the cell says. Never a bare glyph, never "—R", never "$NaN". */
  readonly text: string;
  readonly state: PnlStatState;
  readonly tone: PnlTone;
  /** Carried on both `title` and `aria-label`. */
  readonly reason: string;
}

export interface PnlStatsReport {
  readonly stats: readonly PnlStat[];
  /** The big number in the panel header. Same fact as stats[0], not a re-derivation. */
  readonly headline: PnlStat;
  /** Rows with a finite recorded P&L. */
  readonly counted: number;
  /** Rows present but carrying no usable P&L. Disclosed, never dropped quietly. */
  readonly skipped: number;
}

/** The window every figure is computed over. Stated, never assumed. */
export const PNL_SCOPE = "every trade in the journal, not just today's session";

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function money(n: number): string {
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function skipNote(skipped: number): string {
  if (skipped === 0) return "";
  return ` ${skipped} stored row${skipped === 1 ? "" : "s"} carried no usable P&L and ${
    skipped === 1 ? "was" : "were"
  } left out of this figure entirely rather than counted as zero.`;
}

function unreadable(label: string): PnlStat {
  return {
    label,
    text: "Unreadable",
    state: "RECORD_UNREADABLE",
    tone: "REFUSED",
    reason: `WM could not parse the stored journal, so it has no trades to compute ${label} from. This is a read failure, not a result: the previous version swallowed this error and left a fully coloured $0.00 on screen, which told the trader their record was empty when in fact WM simply could not open it.`,
  };
}

function noTrades(label: string): PnlStat {
  return {
    label,
    text: "No trades",
    state: "NO_TRADES",
    tone: "REFUSED",
    reason: `No trade in the journal carries a usable recorded P&L, so WM has nothing to compute ${label} from. WM will not print a zero here: a zero is a result, and an absent record is not a result. Log a trade with an entry, an exit and a P&L and this figure becomes a measurement.`,
  };
}

/**
 * THE FIX FOR ALL FIVE DEFECTS.
 *
 * The raw JSON is parsed HERE rather than in the component, so a throw becomes
 * a named state instead of a `catch {}` that leaves stale zeros coloured on
 * screen. Pass whatever `localStorage.getItem` returned, including `null`.
 */
export function compilePnlStats(rawJournal: string | null): PnlStatsReport {
  let rows: unknown[] | null = null;
  if (rawJournal != null && rawJournal.trim().length > 0) {
    try {
      const parsed: unknown = JSON.parse(rawJournal);
      rows = Array.isArray(parsed) ? parsed : null;
    } catch {
      rows = null;
    }
  } else {
    rows = [];
  }

  if (rows === null) {
    const stats = [
      "Net P&L",
      "Total Trades",
      "Win Rate",
      "Avg Win",
      "Avg Loss",
      "R-Multiple",
      "Profit Factor",
    ].map(unreadable);
    return { stats, headline: stats[0], counted: 0, skipped: 0 };
  }

  const pnls: number[] = [];
  let skipped = 0;
  for (const row of rows) {
    const v = row && typeof row === "object" ? (row as { pnl?: unknown }).pnl : undefined;
    if (finite(v)) pnls.push(v);
    else skipped += 1;
  }

  const counted = pnls.length;
  const note = skipNote(skipped);

  const total: PnlStat = (() => {
    const label = "Net P&L";
    if (counted === 0) return noTrades(label);
    const sum = pnls.reduce((s, n) => s + n, 0);
    return {
      label,
      text: money(sum),
      state: "MEASURED",
      // A net of exactly zero is a scratch. It does not earn the winning colour.
      tone: sum > 0 ? "POSITIVE" : sum < 0 ? "NEGATIVE" : "NEUTRAL",
      reason: `Sum of the recorded P&L on ${counted} logged trade${
        counted === 1 ? "" : "s"
      } — ${PNL_SCOPE}.${note} WM is adding up what the trader wrote down; it is not marking open positions to market.`,
    };
  })();

  // The count is knowable even when nothing else is: it is the one figure that
  // does not need a usable P&L to be true.
  const tradeCount: PnlStat = {
    label: "Total Trades",
    text: String(counted),
    state: "MEASURED",
    tone: "NEUTRAL",
    reason: `${counted} logged trade${
      counted === 1 ? "" : "s"
    } carry a usable recorded P&L — ${PNL_SCOPE}.${note} This count is the denominator of the win rate beside it, so the two cannot disagree about how many trades there were.`,
  };

  const wins = pnls.filter(n => n > 0);
  const losses = pnls.filter(n => n < 0);

  const winRate: PnlStat = (() => {
    const label = "Win Rate";
    if (counted === 0) return noTrades(label);
    const wr = (wins.length / counted) * 100;
    return {
      label,
      text: `${wr.toFixed(1)}%`,
      state: "MEASURED",
      tone: wr >= 60 ? "POSITIVE" : wr >= 50 ? "NEUTRAL" : "NEGATIVE",
      reason: `${wins.length} of ${counted} logged trades closed above zero — ${PNL_SCOPE}.${note} A scratch of exactly zero counts as neither a win nor a loss, so the win and loss counts need not add to the total.`,
    };
  })();

  const avgWin: PnlStat = (() => {
    const label = "Avg Win";
    if (counted === 0) return noTrades(label);
    if (wins.length === 0) {
      return {
        label,
        text: "No wins yet",
        state: "NO_WINS_YET",
        tone: "REFUSED",
        reason: `None of the ${counted} logged trades closed above zero, so there is no winning trade to average — ${PNL_SCOPE}.${note} WM will not print $0 here: $0 would mean the average winner was a scratch, and there is no winner at all.`,
      };
    }
    const aw = wins.reduce((s, n) => s + n, 0) / wins.length;
    return {
      label,
      text: `$${aw.toFixed(0)}`,
      state: "MEASURED",
      tone: "POSITIVE",
      reason: `Mean recorded P&L across the ${wins.length} logged trade${
        wins.length === 1 ? "" : "s"
      } that closed above zero — ${PNL_SCOPE}.${note}`,
    };
  })();

  const avgLossValue = losses.length > 0
    ? Math.abs(losses.reduce((s, n) => s + n, 0) / losses.length)
    : null;

  const avgLoss: PnlStat = (() => {
    const label = "Avg Loss";
    if (counted === 0) return noTrades(label);
    if (avgLossValue === null) {
      return {
        label,
        text: "No losses yet",
        state: "NO_LOSSES_YET",
        tone: "REFUSED",
        reason: `None of the ${counted} logged trades closed below zero, so there is no losing trade to average — ${PNL_SCOPE}.${note} WM will not print $0 here: $0 claims the average loss was nothing, which is a statement about risk that this record cannot support.`,
      };
    }
    return {
      label,
      text: `$${avgLossValue.toFixed(0)}`,
      state: "MEASURED",
      tone: "NEGATIVE",
      reason: `Mean absolute recorded P&L across the ${losses.length} logged trade${
        losses.length === 1 ? "" : "s"
      } that closed below zero — ${PNL_SCOPE}.${note}`,
    };
  })();

  const rMultiple: PnlStat = (() => {
    const label = "R-Multiple";
    if (counted === 0) return noTrades(label);
    if (avgLossValue === null) {
      return {
        label,
        text: "No losing trade yet",
        state: "NO_LOSSES_YET",
        tone: "REFUSED",
        reason: `This is the average win divided by the average loss, and no logged trade has closed below zero yet — ${PNL_SCOPE}, so the denominator does not exist. The previous rendering put a dash through the unit and printed the literal text "—R" in the same gold as a real reading. WM is also NOT calling this an infinite R: no losing trade yet is a fact about how little has been recorded, not a fact about edge.${note}`,
      };
    }
    if (wins.length === 0) {
      return {
        label,
        text: "No wins yet",
        state: "NO_WINS_YET",
        tone: "REFUSED",
        reason: `This is the average win divided by the average loss, and no logged trade has closed above zero yet — ${PNL_SCOPE}, so the numerator has no sample.${note}`,
      };
    }
    const r = (wins.reduce((s, n) => s + n, 0) / wins.length) / avgLossValue;
    return {
      label,
      text: `${r.toFixed(2)}R`,
      state: "MEASURED",
      tone: "NEUTRAL",
      reason: `The average winning trade is ${r.toFixed(2)} times the size of the average losing trade — ${PNL_SCOPE}. This is a ratio of REALIZED averages; it is not the planned R the trader recorded on any individual trade, and WM is not using it to predict the next one.${note}`,
    };
  })();

  const profitFactor: PnlStat = (() => {
    const label = "Profit Factor";
    if (counted === 0) return noTrades(label);
    const grossLoss = losses.reduce((s, n) => s + Math.abs(n), 0);
    if (grossLoss <= 0) {
      return {
        label,
        text: "No losing trade yet",
        state: "NO_LOSSES_YET",
        tone: "REFUSED",
        reason: `This is gross profit divided by gross loss, and no logged trade has closed below zero yet — ${PNL_SCOPE}, so there is nothing to divide by. WM is not calling that an infinite profit factor.${note}`,
      };
    }
    const pf = wins.reduce((s, n) => s + n, 0) / grossLoss;
    return {
      label,
      text: pf.toFixed(2),
      state: "MEASURED",
      tone: pf >= 1.5 ? "POSITIVE" : pf >= 1 ? "NEUTRAL" : "NEGATIVE",
      reason: `Gross profit of the winning trades divided by the gross loss of the losing ones, across ${counted} logged trade${
        counted === 1 ? "" : "s"
      } — ${PNL_SCOPE}.${note}`,
    };
  })();

  return {
    stats: [total, tradeCount, winRate, avgWin, avgLoss, rMultiple, profitFactor],
    // The header number IS this object, not a second computation of it, so the
    // big figure and the strip beneath it cannot drift onto different answers.
    headline: total,
    counted,
    skipped,
  };
}
