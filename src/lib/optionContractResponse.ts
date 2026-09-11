/**
 * The option chain's PROVENANCE VOCABULARY — one owner, one spelling.
 *
 * ROOT CAUSE THIS FIXES: the literal pair `source: "alpaca"` /
 * `fidelity: "INDICATIVE"` was hand-copied into five separate files — the
 * producer, the client read path, OptionsChain, OptionExpressionIntent and
 * ChartsDashboard. Every copy was individually well-typed, so `tsc` was happy
 * while five subsystems each held a private opinion about how the chain
 * identifies itself. Two of those copies are equality GATES that reject the
 * chain on mismatch, and one is rendered to the trader. A single re-spelling
 * anywhere would fail the gate silently, show the option surface as INVALID
 * RESPONSE, and leave nothing pointing at the typo.
 *
 * This module already sits underneath all five, so making it the owner adds no
 * import edge and no bundle weight.
 *
 * INDICATIVE is a claim about FIDELITY — observed from a provider snapshot
 * page. It is NOT a claim that the price is executable, and not a claim about
 * freshness. Age remains the age gate's job.
 */
export const OPTION_CHAIN_SOURCE = "alpaca" as const;
export const OPTION_CHAIN_FIDELITY = "INDICATIVE" as const;
export type OptionChainSource = typeof OPTION_CHAIN_SOURCE;
export type OptionChainFidelity = typeof OPTION_CHAIN_FIDELITY;

/** Validate the existing FMP chain shape before it reaches calendar/strike math.
 * This validates structure only, not provider rights, freshness or execution.
 */
export interface OptionContract {
  symbol: string;
  contractType: "call" | "put";
  expirationDate: string;
  strike: number;
  /** Provider observation times for this exact contract. Page-level receipt
   * times must never be substituted for these fields. */
  quoteTimestamp?: string;
  tradeTimestamp?: string;
  bid?: number; ask?: number; last?: number;
  impliedVolatility?: number; delta?: number; gamma?: number;
  theta?: number; vega?: number; openInterest?: number; volume?: number;
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
    && Number.isFinite(Date.parse(value));
}

export function parseOptionContractResponse(data: unknown): OptionContract[] {
  const envelope = data && typeof data === "object" ? data as Record<string, unknown> : null;
  const rows = Array.isArray(data) ? data : envelope?.chain ?? envelope?.optionChain;
  if (!Array.isArray(rows)) throw new Error("Malformed options response: expected a contract list");
  const seen = new Set<string>();
  return rows.map(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Malformed options response: invalid contract");
    }
    const row = value as Record<string, unknown>;
    const type = row.contractType ?? row.type;
    const kind = typeof type === "string" ? type.toLowerCase() : "";
    if (typeof row.symbol !== "string" || !row.symbol.trim() ||
        (kind !== "call" && kind !== "put") || !validDate(row.expirationDate) ||
        typeof row.strike !== "number" || !Number.isFinite(row.strike) || row.strike <= 0) {
      throw new Error("Malformed options response: contract identity is unverified");
    }
    const identity = `${row.expirationDate}:${kind}:${row.strike}`;
    if (seen.has(identity)) throw new Error("Ambiguous options response: duplicate expiry/type/strike");
    seen.add(identity);
    const contract: OptionContract = {symbol:row.symbol.trim(),contractType:kind,
      expirationDate:row.expirationDate,strike:row.strike};
    for (const key of ["quoteTimestamp", "tradeTimestamp"] as const) {
      const timestamp = row[key];
      if (timestamp === undefined || timestamp === null) continue;
      if (!validTimestamp(timestamp)) {
        throw new Error("Malformed options response: invalid provider timestamp");
      }
      contract[key] = timestamp;
    }
    for (const key of ["bid","ask","last","impliedVolatility","delta","gamma","theta","vega","openInterest","volume"] as const) {
      const number = row[key];
      if (number === undefined || number === null) continue;
      if (typeof number !== "number" || !Number.isFinite(number) ||
          (!["delta","theta"].includes(key) && number < 0)) {
        throw new Error("Malformed options response: invalid quoted value");
      }
      contract[key] = number;
    }
    return contract;
  });
}
