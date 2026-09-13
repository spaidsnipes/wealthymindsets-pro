/**
 * The Founder's Build Order §5 Step 4 — "SHORTLIST, NOT PROPHECY."
 *
 *   "Default contracts: FAST, BALANCED, MORE TIME. Each has a job
 *    explanation using real fields: expiration, strike, moneyness, delta,
 *    gamma, theta, vega or IV, spread, liquidity, horizon, event context,
 *    risk fit, quote fit, time fit.
 *    Never label BEST CONTRACT.
 *    Never hide that direction can be right and contract wrong."
 *
 * This module holds ONE pure function that answers "given a chain and a spot,
 * which three contracts do the three JOBS?" Rendering, fetch discipline, and
 * decision-birth machinery live elsewhere. Never call the winner best.
 *
 * The three jobs are DELIBERATE and non-fungible:
 *
 *   FAST        — nearest expiry, closest to the money. Highest gamma per
 *                 dollar of premium. If the thesis pays in hours, this is the
 *                 vehicle. Also decays fastest — the honest counterpart.
 *
 *   BALANCED    — a middle expiry with a call/put that has room to breathe.
 *                 Same direction, less gamma, less decay, more time to be
 *                 wrong on entry timing.
 *
 *   MORE TIME   — the furthest-out expiry the chain carries, still on the
 *                 same side and near ATM. If the thesis is regime-shaped
 *                 (days-to-weeks), this is where premium buys patience.
 *
 * When a contract for one job simply cannot be produced (chain empty on that
 * expiry, no matching side, no strike near spot), the slot returns `null` with
 * a `reason` — the JPEG-said-so failure is what makes the Founder call this
 * "prophecy" in the first place.
 */

import type { OptionContract } from "./optionContractResponse";
import type { MarketStateDimension } from "./marketData/canonicalMarketState";
import type { DecisionIdentity } from "./traderMemory/decisionIdentity";

export type ShortlistJob = "FAST" | "BALANCED" | "MORE_TIME";

/** One slot in the shortlist — either a chosen contract, or an absence sentence. */
export interface ShortlistSlot {
  readonly job: ShortlistJob;
  readonly contract: OptionContract | null;
  /** When contract is null, why. Rendered verbatim beside the empty slot. */
  readonly reason: string;
}

export interface ExpressionShortlistInput {
  /** The full chain to select from. Empty array is a valid input. */
  readonly chain: readonly OptionContract[];
  /** The underlying spot from canonical market state, or null when UNKNOWN. */
  readonly spot: number | null;
  /**
   * Direction of the underlying thesis:
   *   "long"  → shortlist calls
   *   "short" → shortlist puts
   *   null    → UNKNOWN: emit an empty shortlist and say why. A default of
   *             "long" would silently commit the trader to a direction the
   *             market state does not support.
   */
  readonly direction: "long" | "short" | null;
}

/**
 * Translate a resolved canonical direction into the two sides the option
 * expression selector understands. This deliberately accepts only named,
 * reviewed directional vocabulary. PARTIAL/UNKNOWN and unfamiliar values
 * remain null, because choosing CALL or PUT is a market judgement and not a
 * presentation fallback.
 */
export function expressionDirectionFromCanonical(
  direction: MarketStateDimension | null | undefined,
): "long" | "short" | null {
  if (direction?.resolution !== "RESOLVED" || !direction.value) return null;
  const value = direction.value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (["LONG", "UP", "BULL", "BULLISH", "BULL_TREND"].includes(value)) return "long";
  if (["SHORT", "DOWN", "BEAR", "BEARISH", "BEAR_TREND"].includes(value)) return "short";
  return null;
}

export interface ExpressionScope {
  readonly underlying: string;
  readonly owner: string;
  readonly direction: "long" | "short";
}

/**
 * A selected contract is current only in the exact market, account, and
 * thesis side where it was selected. This synchronous check prevents stale
 * intent from painting during the render before cleanup effects run.
 */
export function expressionScopeIsCurrent(
  candidate: ExpressionScope | null,
  current: { underlying: string; owner: string; direction: "long" | "short" | null },
): boolean {
  return candidate !== null
    && current.direction !== null
    && candidate.underlying === current.underlying
    && candidate.owner === current.owner
    && candidate.direction === current.direction;
}

export interface ScopedDecisionIdentity {
  readonly underlying: string;
  readonly owner: string;
  readonly identity: DecisionIdentity;
}

/**
 * Adopt a newly witnessed identity without splitting an already-born decision
 * on the same owner/instrument scene. A later permission crossing is another
 * witness to the existing decision, not authority to replace an explicit
 * intent that has already been recorded against it.
 */
export function adoptSceneDecision(
  current: ScopedDecisionIdentity | null,
  candidate: ScopedDecisionIdentity,
): ScopedDecisionIdentity {
  return current
    && current.underlying === candidate.underlying
    && current.owner === candidate.owner
      ? current
      : candidate;
}

/** Return a decision identity only while it still belongs to this room. */
export function currentDecisionIdentity(
  candidate: ScopedDecisionIdentity | null,
  current: { underlying: string; owner: string },
): DecisionIdentity | null {
  if (!candidate) return null;
  return candidate.underlying === current.underlying && candidate.owner === current.owner
    ? candidate.identity
    : null;
}

/**
 * The distinct expiration dates present in the chain, sorted ascending as
 * ISO YYYY-MM-DD strings. Dedupes even when contracts arrive interleaved
 * across strikes.
 */
function distinctExpiries(chain: readonly OptionContract[]): string[] {
  return [...new Set(chain.map((c) => c.expirationDate))].sort();
}

/**
 * The contract of a given side and expiry whose strike is closest to spot.
 * Ties break to the higher strike (matches call convention — ITM > OTM by
 * one tick when equidistant). Returns null when no contract on that side
 * exists for that expiry.
 */
function nearestToSpot(
  chain: readonly OptionContract[],
  expiry: string,
  side: "call" | "put",
  spot: number,
): OptionContract | null {
  let best: OptionContract | null = null;
  let bestDist = Infinity;
  for (const c of chain) {
    if (c.contractType !== side) continue;
    if (c.expirationDate !== expiry) continue;
    const dist = Math.abs(c.strike - spot);
    if (dist < bestDist || (dist === bestDist && best !== null && c.strike > best.strike)) {
      best = c;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Compile the three-job shortlist. Deterministic; no clock; no I/O. Every
 * refusal is named — the caller can render "no BALANCED slot: chain carries
 * one expiry" without inventing a substitute.
 *
 * Behaviour by chain shape (measured against the real Alpaca INDICATIVE
 * shape /api/market-data/alpaca/options returns):
 *
 *   0 expiries         → all three empty, one reason ("no chain observed")
 *   1 expiry           → FAST filled, BALANCED and MORE_TIME empty with
 *                        reason "chain carries one expiry"
 *   2 expiries         → FAST = nearest, MORE_TIME = furthest, BALANCED
 *                        empty with reason "chain carries two expiries"
 *   3+ expiries        → FAST = nearest, MORE_TIME = furthest, BALANCED
 *                        = the middle-index expiry
 */
export function selectExpressionShortlist(
  input: ExpressionShortlistInput,
): readonly ShortlistSlot[] {
  const jobs: ShortlistJob[] = ["FAST", "BALANCED", "MORE_TIME"];

  if (input.spot === null || !Number.isFinite(input.spot) || input.spot <= 0) {
    return jobs.map((job) => ({ job, contract: null, reason: "underlying spot UNKNOWN" }));
  }
  if (input.direction === null) {
    return jobs.map((job) => ({ job, contract: null, reason: "thesis direction UNKNOWN — shortlist would guess" }));
  }
  if (input.chain.length === 0) {
    return jobs.map((job) => ({ job, contract: null, reason: "no chain observed" }));
  }

  const expiries = distinctExpiries(input.chain);
  const side = input.direction === "long" ? "call" : "put";

  const fastExpiry = expiries[0];
  const moreTimeExpiry = expiries[expiries.length - 1];
  // Middle-index expiry — for 3+ expiries this is a genuinely different
  // horizon than FAST or MORE_TIME. For 1 or 2 expiries there is no honest
  // middle, and the slot returns absence with a NAMED reason.
  const balancedExpiry = expiries.length >= 3
    ? expiries[Math.floor(expiries.length / 2)]
    : null;

  const pick = (expiry: string | null): OptionContract | null =>
    expiry === null ? null : nearestToSpot(input.chain, expiry, side, input.spot as number);

  const fast = pick(fastExpiry);
  const balanced = pick(balancedExpiry);
  const moreTime = expiries.length >= 2 ? pick(moreTimeExpiry) : null;

  return [
    { job: "FAST", contract: fast, reason: fast ? "" : `no ${side} strike near spot for ${fastExpiry}` },
    {
      job: "BALANCED",
      contract: balanced,
      reason: balanced
        ? ""
        : expiries.length === 1
          ? "chain carries one expiry"
          : expiries.length === 2
            ? "chain carries two expiries — no honest middle horizon"
            : `no ${side} strike near spot for ${balancedExpiry}`,
    },
    {
      job: "MORE_TIME",
      contract: moreTime,
      reason: moreTime
        ? ""
        : expiries.length < 2
          ? "chain carries one expiry"
          : `no ${side} strike near spot for ${moreTimeExpiry}`,
    },
  ];
}

/**
 * The job's human name. Kept next to the enum so a rename cannot silently
 * split "FAST" from what the button says.
 */
export function shortlistJobLabel(job: ShortlistJob): string {
  switch (job) {
    case "FAST":      return "FAST";
    case "BALANCED":  return "BALANCED";
    case "MORE_TIME": return "MORE TIME";
  }
}
