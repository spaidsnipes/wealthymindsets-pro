import type { OptionContract } from "@/lib/optionContractResponse";

type UnknownRecord = Record<string, unknown>;

export interface AlpacaOptionChainReceipt {
  readonly source: "alpaca";
  readonly fidelity: "INDICATIVE";
  readonly coverage: "COMPLETE" | "PARTIAL";
  readonly newestProviderTimestamp: string | null;
  readonly chain: OptionContract[];
}

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function finite(value: unknown, allowNegative = false): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (!allowNegative && value < 0) return undefined;
  return value;
}

function providerTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

function parseOsiIdentity(symbol: string, expectedUnderlying: string) {
  const match = /^([A-Z0-9.]{1,10})(\d{6})([CP])(\d{8})$/.exec(symbol);
  if (!match || match[1] !== expectedUnderlying) return null;
  const [, , date, side, strikeDigits] = match;
  const expirationDate = `20${date.slice(0, 2)}-${date.slice(2, 4)}-${date.slice(4, 6)}`;
  if (!Number.isFinite(Date.parse(`${expirationDate}T00:00:00Z`))) return null;
  const strike = Number(strikeDigits) / 1000;
  if (!Number.isFinite(strike) || strike <= 0) return null;
  return {
    contractType: side === "C" ? "call" as const : "put" as const,
    expirationDate,
    strike,
  };
}

/**
 * Convert Alpaca's documented compact option snapshot fields into WM Pro's
 * provider-neutral contract shape. Missing market fields remain missing;
 * latest trade size is not daily volume and is deliberately not relabeled.
 */
export function normalizeAlpacaOptionChain(
  data: unknown,
  expectedUnderlying: string,
): AlpacaOptionChainReceipt {
  const envelope = record(data);
  const snapshots = record(envelope?.snapshots);
  if (!envelope || !snapshots) throw new Error("Malformed Alpaca option chain response");

  const upperUnderlying = expectedUnderlying.trim().toUpperCase();
  const chain: OptionContract[] = [];
  let newestProviderTimestamp: string | null = null;

  for (const [symbol, rawSnapshot] of Object.entries(snapshots)) {
    const identity = parseOsiIdentity(symbol, upperUnderlying);
    const snapshot = record(rawSnapshot);
    if (!identity || !snapshot) continue;

    const quote = record(snapshot.latestQuote);
    const trade = record(snapshot.latestTrade);
    const greeks = record(snapshot.greeks);
    const bid = finite(quote?.bp);
    const ask = finite(quote?.ap);
    const last = finite(trade?.p);
    const quoteTimestamp = providerTimestamp(quote?.t);
    const tradeTimestamp = providerTimestamp(trade?.t);
    const hasQuoteObservation = quoteTimestamp !== null && (bid !== undefined || ask !== undefined);
    const hasTradeObservation = tradeTimestamp !== null && last !== undefined;
    if (!hasQuoteObservation && !hasTradeObservation) continue;

    const contract: OptionContract = { symbol, ...identity };
    const impliedVolatility = finite(snapshot.impliedVolatility);
    const delta = finite(greeks?.delta, true);
    const gamma = finite(greeks?.gamma);
    const theta = finite(greeks?.theta, true);
    const vega = finite(greeks?.vega);
    if (bid !== undefined) contract.bid = bid;
    if (ask !== undefined) contract.ask = ask;
    if (last !== undefined) contract.last = last;
    if (impliedVolatility !== undefined) contract.impliedVolatility = impliedVolatility;
    if (delta !== undefined) contract.delta = delta;
    if (gamma !== undefined) contract.gamma = gamma;
    if (theta !== undefined) contract.theta = theta;
    if (vega !== undefined) contract.vega = vega;

    for (const timestamp of [hasQuoteObservation ? quoteTimestamp : null, hasTradeObservation ? tradeTimestamp : null]) {
      if (timestamp && (!newestProviderTimestamp || Date.parse(timestamp) > Date.parse(newestProviderTimestamp))) {
        newestProviderTimestamp = timestamp;
      }
    }
    chain.push(contract);
  }

  chain.sort((a, b) => a.expirationDate.localeCompare(b.expirationDate)
    || a.strike - b.strike
    || a.contractType.localeCompare(b.contractType));

  return {
    source: "alpaca",
    fidelity: "INDICATIVE",
    coverage: typeof envelope.next_page_token === "string" && envelope.next_page_token
      ? "PARTIAL"
      : "COMPLETE",
    newestProviderTimestamp,
    chain,
  };
}
