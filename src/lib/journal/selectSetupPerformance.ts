import { selectRecordedTotal, type RecordedTotal } from "./selectRecordedTotal";

/**
 * SETUP PERFORMANCE — the same three laws, in the one row nobody guarded.
 *
 * ── How it was found ────────────────────────────────────────────────────────
 *
 * By taking the lesson recorded against the /paper Sentinels — that a guard
 * naming a FILE defends the location and loses the law — and running a
 * repo-wide census of the H1 shape instead. The census found the Setup
 * Performance row on /journal, which computed its own numbers inline:
 *
 *     setupMap[e.setup].pnl += e.pnl;
 *     wr: data.wins + data.losses > 0 ? data.wins / (data.wins + data.losses) * 100 : 0,
 *     ...
 *     <div className={s.pnl >= 0 ? "text-wm-green" : "text-wm-red"}>
 *     <div>{s.wr.toFixed(0)}% WR</div>
 *
 * Three defects, all of them ALREADY NAMED IN THIS REPO — two of them already
 * named in files sitting a few hundred lines away from the code that broke.
 *
 *   1. AN UNGUARDED SUM OVER VALUES WM MAY NOT BE ABLE TO READ.
 *      `pnl += e.pnl` is the exact arithmetic `selectRecordedTotal` was
 *      written to stop, and its header documents the three lies it produces:
 *      `null` counted as a fabricated $0.00, `undefined` poisoning the sum to
 *      NaN and repainting the row RED, and a STRING concatenating so that a
 *      $100 and a $250 trade total $100,250.00. /journal already calls that
 *      selector for the BOOK total, sixty lines above. The per-setup
 *      breakdown never got it. A selector adopted on one call site and not
 *      the other is the same defect as a Sentinel that names one file.
 *
 *   2. AN INVENTED ZERO PERCENT WIN RATE. `result` defaults to `"be"`, so a
 *      setup whose entries are all breakeven has wins + losses === 0. The old
 *      expression hardcoded `: 0` in that case and the row printed "0% WR" —
 *      a ratio with no denominator, rendered as measured failure. The /paper
 *      WIN% column has carried the whole diagnosis in a comment for a long
 *      time: an unknown win rate gets the MUTED treatment, because colouring
 *      "nothing has been decided yet" as failure is the same overclaim as
 *      printing 0%. Same law, different page, never carried.
 *
 *   3. A WIN TINT EARNED BY `0 >= 0`. A setup that nets exactly flat took the
 *      green reserved for money actually made. A row can only exist if it has
 *      entries, so "was anything traded" is not the discriminator here — the
 *      discriminator is that ZERO IS NOT A GAIN. Strict sign, and flat is its
 *      own neutral state.
 *
 * ── What is withheld, and what is not ───────────────────────────────────────
 *
 * The CLAIM, never the FIGURE. A setup that nets flat still prints `+$0` —
 * that is a measured fact and deleting it would be the over-correction. What
 * it does not get is the green. Figure and tint never share one ternary.
 *
 * Likewise a setup with nothing decided still shows its entry count and its
 * dollar result. Only the RATIO refuses, because only the ratio is undefined.
 *
 * PURE — no clock, no I/O, no localStorage, no React.
 */

/** Only the three fields this computation actually reads. */
export interface SetupSourceEntry {
  readonly setup: string;
  /** "win" | "loss" | "be" — but typed loose, because storage is not trusted. */
  readonly result?: unknown;
  /** May be null, a string, or missing. See selectRecordedTotal. */
  readonly pnl?: unknown;
}

/**
 * The tint is a claim and is kept separate from every figure in the row.
 * ALERT means "we hold records whose dollar result we cannot read".
 */
export type SetupTone = "WIN" | "LOSS" | "NEUTRAL" | "ALERT";

export interface SetupPerformance {
  readonly name: string;
  /** Every entry filed under this setup, readable or not. */
  readonly entries: number;
  readonly wins: number;
  readonly losses: number;
  /** NULL when nothing under this setup has been decided. Never 0. */
  readonly winRatePct: number | null;
  /** "—" when undefined. The row never prints a ratio it does not have. */
  readonly winRateLabel: string;
  /** The honest sum, with its own coverage report. */
  readonly pnl: RecordedTotal;
  /** "UNKNOWN" when no dollar result could be read at all. Never "$0". */
  readonly pnlLabel: string;
  readonly tone: SetupTone;
  /** WHY the row reads the way it does. Belongs on title AND aria-label. */
  readonly reason: string;
}

function signedUsd0(n: number): string {
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Group journal entries by setup and report each one honestly.
 *
 * Ordering: readable results descending by dollars, then every setup whose
 * result could not be read at all. An UNKNOWN total has no position on a
 * ranking by money — sorting it as if it were 0 would silently place it
 * among the flat setups, which is the ordering equivalent of printing $0.
 */
export function selectSetupPerformance(
  entries: readonly SetupSourceEntry[],
): SetupPerformance[] {
  const grouped = new Map<string, SetupSourceEntry[]>();
  for (const entry of entries) {
    const list = grouped.get(entry.setup);
    if (list) list.push(entry);
    else grouped.set(entry.setup, [entry]);
  }

  const rows: SetupPerformance[] = [];
  for (const [name, group] of grouped) {
    const wins = group.filter((e) => e.result === "win").length;
    const losses = group.filter((e) => e.result === "loss").length;
    const decided = wins + losses;

    // NO DENOMINATOR IS NOT A DENOMINATOR OF ZERO.
    const winRatePct = decided > 0 ? Math.round((wins / decided) * 100) : null;

    const pnl = selectRecordedTotal(group);
    const pnlLabel = pnl.total === null ? "UNKNOWN" : signedUsd0(pnl.total);

    // Unreadable money outranks every other state: the figure beside the tint
    // would be a fabrication, so there is nothing here to tint at all.
    const tone: SetupTone =
      pnl.status === "UNKNOWN" ? "ALERT"
      : pnl.total! > 0 ? "WIN"
      : pnl.total! < 0 ? "LOSS"
      : /* exactly flat — measured, and not a gain */ "NEUTRAL";

    rows.push({
      name,
      entries: group.length,
      wins,
      losses,
      winRatePct,
      winRateLabel: winRatePct === null ? "—" : `${winRatePct}%`,
      pnl,
      pnlLabel,
      tone,
      reason: buildReason(name, group.length, wins, losses, winRatePct, pnl, tone),
    });
  }

  return rows.sort((a, b) => {
    const aKnown = a.pnl.total !== null;
    const bKnown = b.pnl.total !== null;
    if (aKnown !== bKnown) return aKnown ? -1 : 1;
    if (!aKnown) return a.name.localeCompare(b.name);
    return b.pnl.total! - a.pnl.total!;
  });
}

function buildReason(
  name: string,
  entries: number,
  wins: number,
  losses: number,
  winRatePct: number | null,
  pnl: RecordedTotal,
  tone: SetupTone,
): string {
  const countWord = entries === 1 ? "entry" : "entries";
  const head = `${entries} ${countWord} filed under “${name}”.`;

  const rate =
    winRatePct === null
      ? ` None has been recorded as a win or a loss, so there is no win rate to`
        + ` compute — that is UNDEFINED, not zero percent.`
      : ` ${wins} recorded ${wins === 1 ? "win" : "wins"} and ${losses}`
        + ` ${losses === 1 ? "loss" : "losses"} give a ${winRatePct}% win rate`
        + ` over the ${wins + losses} decided.`;

  const money =
    pnl.note !== null
      ? ` ${pnl.note}`
      : tone === "NEUTRAL"
        ? ` The dollar result across them is exactly flat. The figure is measured,`
          + ` and it carries no win tint, because nothing was won.`
        : ` The dollar result is a complete sum across all ${entries}.`;

  return head + rate + money;
}
