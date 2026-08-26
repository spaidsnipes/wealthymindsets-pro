/**
 * selectParticipationFilter — canon §7 PARTICIPATION FILTER
 * (Top-Down Process amendment 2026-08-25 §7).
 *
 * Canon verbatim:
 *   "Volume/participation is context and trade-quality evidence, not
 *    independent permission. Prefer execution when the underlying
 *    market is meaningfully participating and the specific option
 *    contract is liquid enough to express the thesis. Weak midday
 *    participation often increases the value of WAIT/NO TRADE,
 *    especially for short-DTE options, but time of day never
 *    substitutes for Model/Location/CLC/R.
 *
 *    Separate:
 *    UNDERLYING PARTICIPATION — is the auction actually active enough
 *      to support the move?
 *    CONTRACT LIQUIDITY — is this strike/expiry executable with
 *      acceptable spread/market quality?"
 *
 * Deterministic classifier over the two independent participation
 * signals canon separates. Returns a per-axis grade + a combined
 * verdict:
 *
 *   UNDERLYING: STRONG / MIXED / WEAK
 *   CONTRACT:   LIQUID / MARGINAL / ILLIQUID
 *   COMBINED:
 *     GREEN   — STRONG + LIQUID
 *     AMBER   — STRONG + MARGINAL, or MIXED + LIQUID/MARGINAL
 *     RED     — WEAK on either axis or ILLIQUID
 *     UNKNOWN — insufficient input on either axis
 *
 * Underlying participation is a normalized ratio 0-1 (relative to
 * that instrument's expected activity for the session). Contract
 * liquidity uses spread relative to price + volume ratio.
 */

export interface ParticipationFilterInput {
  /** Underlying participation ratio 0..1 (undefined = unknown). */
  underlyingParticipationRatio?: number;
  /** Contract bid/ask spread in dollars. */
  spreadDollars?: number;
  /** Contract mid price in dollars. */
  midDollars?: number;
  /** Trailing volume ratio (contract volume / typical). Undefined = unknown. */
  contractVolumeRatio?: number;
}

export type UnderlyingGrade = "STRONG" | "MIXED" | "WEAK" | "UNKNOWN";
export type ContractGrade = "LIQUID" | "MARGINAL" | "ILLIQUID" | "UNKNOWN";
export type ParticipationVerdict = "GREEN" | "AMBER" | "RED" | "UNKNOWN";

export interface ParticipationFilterResult {
  underlying: UnderlyingGrade;
  contract: ContractGrade;
  verdict: ParticipationVerdict;
  spread_pct: number | undefined;
  canon: string;
}

function ok(n: number | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function gradeUnderlying(ratio: number | undefined): UnderlyingGrade {
  if (!ok(ratio) || ratio < 0) return "UNKNOWN";
  if (ratio >= 0.75) return "STRONG";
  if (ratio >= 0.4) return "MIXED";
  return "WEAK";
}

function gradeContract(
  spreadPct: number | undefined,
  volumeRatio: number | undefined,
): ContractGrade {
  if (!ok(spreadPct)) return "UNKNOWN";
  // Canon thresholds (not verbatim — pragmatic defaults):
  //   LIQUID:    spread < 3% AND (unknown volume OR volume >= 0.5)
  //   MARGINAL:  spread < 8% OR volume in [0.25, 0.5)
  //   ILLIQUID:  spread >= 8% OR volume < 0.25
  if (spreadPct < 0.03 && (!ok(volumeRatio) || volumeRatio >= 0.5)) return "LIQUID";
  if (spreadPct < 0.08 && (!ok(volumeRatio) || volumeRatio >= 0.25)) return "MARGINAL";
  return "ILLIQUID";
}

function combine(u: UnderlyingGrade, c: ContractGrade): ParticipationVerdict {
  if (u === "UNKNOWN" || c === "UNKNOWN") return "UNKNOWN";
  if (u === "WEAK" || c === "ILLIQUID") return "RED";
  if (u === "STRONG" && c === "LIQUID") return "GREEN";
  return "AMBER";
}

export function selectParticipationFilter(
  input: ParticipationFilterInput,
): ParticipationFilterResult {
  const underlying = gradeUnderlying(input.underlyingParticipationRatio);
  const spread_pct =
    ok(input.spreadDollars) && ok(input.midDollars) && input.midDollars > 0
      ? input.spreadDollars / input.midDollars
      : undefined;
  const contract = gradeContract(spread_pct, input.contractVolumeRatio);
  const verdict = combine(underlying, contract);

  return {
    underlying,
    contract,
    verdict,
    spread_pct,
    canon:
      verdict === "UNKNOWN"
        ? "§7 PARTICIPATION FILTER — insufficient input"
        : verdict === "GREEN"
        ? "§7 PARTICIPATION FILTER — underlying strong + contract liquid"
        : verdict === "AMBER"
        ? "§7 PARTICIPATION FILTER — partial; verify with Model/Location/CLC/R"
        : "§7 PARTICIPATION FILTER — weak participation or illiquid contract — WAIT bias",
  };
}
