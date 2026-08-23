/**
 * selectSessionEdge — Personal Edge Lab pure selector.
 *
 * Founder canon: 3·6·9·12 Challenge Engine v0.2 §11 Personal Edge Lab
 * and §21 LAUNCH PROTOCOL Week-One objective. Given a set of trade
 * records (typically today's / this-week's journal entries with
 * realizedR + processQuality captured), compute the metrics the
 * Founder needs to review his live Proof Lane sample without any
 * chance of fabricating an R he didn't earn.
 *
 * Rejection guarantees:
 *  - Entries without realizedR are counted as "unclassified" and
 *    NEVER contribute to expectancy. R math is opt-in per canon §4.
 *  - avg winner R / avg loser R are only computed over the entries
 *    that actually have realizedR; sample size is exposed so a
 *    reader cannot mistake "no losers this week" for statistical
 *    validity at n=2.
 *  - Expectancy uses only R-tagged entries and is undefined when the
 *    sample is empty (never NaN, never 0 by accident).
 *  - rulesAdheredPct is over FOLLOWED_PLAN vs (FOLLOWED_PLAN +
 *    BROKE_RULES). UNRESOLVED entries are excluded from the ratio.
 *  - Max drawdown is computed on the cumulative R equity curve
 *    (peak-to-trough R distance), not on P&L, so 100x option
 *    multiplier doesn't distort it.
 */

export type SessionOutcome = "win" | "loss" | "be";
export type SessionProcess = "FOLLOWED_PLAN" | "BROKE_RULES" | "UNRESOLVED";

export interface EdgeEntry {
  /** Any date string; grouping / horizon is the caller's concern. */
  date: string;
  /** Financial outcome from P&L (canon: separate from R). */
  result: SessionOutcome;
  /** Realized R if pre-entry Planned R was defined; undefined otherwise. */
  realizedR?: number;
  /** Process quality per canon §journalProcess. */
  processQuality: SessionProcess;
}

export interface SessionEdge {
  totalEntries: number;
  rTaggedEntries: number;
  unclassifiedEntries: number;
  winners: number;
  losers: number;
  breakeven: number;
  /** Days on which no trade was recorded but a decision was logged — kept for future §M0 aggregation. */
  noTradeSessions: number;
  avgWinnerR: number | undefined;
  avgLoserR: number | undefined;
  /** Sum of R over R-tagged entries. */
  cumulativeR: number;
  /** Peak-to-trough drawdown in R units on the ordered R equity curve. */
  maxDrawdownR: number;
  /** Expected value in R per R-tagged trade. Undefined when no R-tagged entries. */
  expectancyR: number | undefined;
  rulesAdheredPct: number | undefined;
  followedPlan: number;
  brokeRules: number;
  unresolved: number;
}

/**
 * Compute the Personal Edge Lab summary over a set of entries.
 * Pure. Order-preserving for drawdown computation.
 */
export function selectSessionEdge(entries: readonly EdgeEntry[]): SessionEdge {
  const rTagged = entries.filter(
    (e): e is EdgeEntry & { realizedR: number } =>
      typeof e.realizedR === "number" && Number.isFinite(e.realizedR),
  );
  const winners = entries.filter((e) => e.result === "win").length;
  const losers = entries.filter((e) => e.result === "loss").length;
  const breakeven = entries.filter((e) => e.result === "be").length;

  const rWinners = rTagged.filter((e) => e.realizedR > 0);
  const rLosers = rTagged.filter((e) => e.realizedR < 0);
  const avgWinnerR = rWinners.length
    ? rWinners.reduce((a, e) => a + e.realizedR, 0) / rWinners.length
    : undefined;
  const avgLoserR = rLosers.length
    ? rLosers.reduce((a, e) => a + e.realizedR, 0) / rLosers.length
    : undefined;
  const cumulativeR = rTagged.reduce((a, e) => a + e.realizedR, 0);
  const expectancyR = rTagged.length ? cumulativeR / rTagged.length : undefined;

  // Peak-to-trough drawdown on the ordered R equity curve.
  let peak = 0;
  let maxDrawdownR = 0;
  let running = 0;
  for (const e of rTagged) {
    running += e.realizedR;
    if (running > peak) peak = running;
    const drawdown = peak - running;
    if (drawdown > maxDrawdownR) maxDrawdownR = drawdown;
  }

  const followedPlan = entries.filter((e) => e.processQuality === "FOLLOWED_PLAN").length;
  const brokeRules = entries.filter((e) => e.processQuality === "BROKE_RULES").length;
  const unresolved = entries.filter((e) => e.processQuality === "UNRESOLVED").length;
  const gradedProcess = followedPlan + brokeRules;
  const rulesAdheredPct = gradedProcess ? followedPlan / gradedProcess : undefined;

  return {
    totalEntries: entries.length,
    rTaggedEntries: rTagged.length,
    unclassifiedEntries: entries.length - rTagged.length,
    winners,
    losers,
    breakeven,
    noTradeSessions: 0, // Reserved for a later atom that aggregates M0 days.
    avgWinnerR,
    avgLoserR,
    cumulativeR,
    maxDrawdownR,
    expectancyR,
    rulesAdheredPct,
    followedPlan,
    brokeRules,
    unresolved,
  };
}
