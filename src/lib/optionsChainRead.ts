import {
  OPTION_CHAIN_FIDELITY,
  OPTION_CHAIN_SOURCE,
  parseOptionContractResponse,
  type OptionChainFidelity,
  type OptionChainSource,
  type OptionContract,
} from "./optionContractResponse";

export type OptionsFailureEdge =
  | "NOT CONFIGURED" | "AUTH BLOCKED" | "REQUEST DENIED" | "RATE LIMITED"
  | "TIMEOUT" | "NETWORK ERROR" | "PROVIDER ERROR" | "INVALID RESPONSE" | "REDIRECT BLOCKED"
  | "NO EVENTS" | "UNKNOWN";

export interface OptionsReadFailure {
  edge: OptionsFailureEdge;
  message: string;
  recovery: string;
}

type InvalidResponseStage = "TRANSPORT" | "DECODE" | "NORMALIZE";

// Only static, reviewed copy crosses into the trader surface. Provider errors,
// URLs, credentials and arbitrary `missing`/`error` fields are never reflected.
const failures: Record<OptionsFailureEdge, Omit<OptionsReadFailure, "edge">> = {
  "NOT CONFIGURED": { message: "The options-data service is not configured on this host.", recovery: "The host operator must configure the options-data service, then refresh. Connecting a trading account alone does not configure this feed." },
  "AUTH BLOCKED": { message: "The options request was rejected as unauthenticated.", recovery: "The host operator must check the options-data authentication, then refresh. Entitlement has not been established." },
  "REQUEST DENIED": { message: "The options request was denied. The failed permission or subscription is not established.", recovery: "Check the provider's access response before changing permissions or subscriptions, then refresh." },
  "RATE LIMITED": { message: "The options-data request was rate limited.", recovery: "Wait before refreshing again. Existing contracts have been cleared." },
  "TIMEOUT": { message: "Options check timed out. Contract availability is unverified.", recovery: "Refresh to make a new check. A late response cannot replace the current selection." },
  "NETWORK ERROR": { message: "The options-data request could not be completed.", recovery: "Check your connection and refresh. Provider authentication and entitlement remain unverified." },
  "PROVIDER ERROR": { message: "The options-data service returned an error. No contracts were accepted.", recovery: "Refresh to check recovery. This error does not prove an entitlement restriction." },
  "INVALID RESPONSE": { message: "The options response could not be validated.", recovery: "Refresh to request a new response. Unverified contracts will not be displayed." },
  "REDIRECT BLOCKED": { message: "The options endpoint attempted to redirect the server request.", recovery: "Credential forwarding was refused. The host operator must verify the configured endpoint before retrying." },
  "NO EVENTS": { message: "The provider returned no contracts for this selection.", recovery: "Check the selected symbol and refresh. An empty response does not prove an entitlement restriction." },
  "UNKNOWN": { message: "The options request failed for an unconfirmed reason.", recovery: "Refresh to make a new check. Availability and entitlement remain unverified." },
};

export function optionsReadFailure(edge: OptionsFailureEdge): OptionsReadFailure {
  return { edge, ...failures[edge] };
}

function stagedInvalidResponse(stage: InvalidResponseStage): OptionsReadFailure {
  if (stage === "TRANSPORT") return {
    edge: "INVALID RESPONSE",
    message: "The WM options gateway could not complete the provider request.",
    recovery: "Refresh to retry the request. Provider availability and entitlement remain unverified.",
  };
  if (stage === "DECODE") return {
    edge: "INVALID RESPONSE",
    message: "The WM options gateway received a response it could not decode.",
    recovery: "Refresh to request a new response. No contracts from the unreadable response were accepted.",
  };
  return {
    edge: "INVALID RESPONSE",
    message: "The WM options gateway could not validate the provider contract schema.",
    recovery: "Refresh to request a new response. Contracts that fail schema validation remain hidden.",
  };
}

function responseFailure(status: number, body: unknown): OptionsReadFailure {
  const envelope = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown> : null;
  // Accept only an exact WM-owned route's structured config receipt. HTTP 503
  // alone (or a provider's arbitrary prose) is not evidence of missing config.
  if (status === 503 && (envelope?.source === "fmp" || envelope?.source === OPTION_CHAIN_SOURCE) && envelope.edge === "NOT CONFIGURED") {
    return optionsReadFailure("NOT CONFIGURED");
  }
  // The WM-owned Alpaca route uses this exact 502 receipt when transport,
  // JSON parsing, or normalization fails. Preserve that distinction instead
  // of incorrectly projecting every 502 as an upstream provider failure.
  if (status === 502 && envelope?.source === OPTION_CHAIN_SOURCE && envelope.edge === "INVALID RESPONSE") {
    const stage = envelope.stage;
    return stage === "TRANSPORT" || stage === "DECODE" || stage === "NORMALIZE"
      ? stagedInvalidResponse(stage)
      : optionsReadFailure("INVALID RESPONSE");
  }
  if (status === 502 && envelope?.source === OPTION_CHAIN_SOURCE && envelope.edge === "REDIRECT BLOCKED") {
    return optionsReadFailure("REDIRECT BLOCKED");
  }
  if (status === 401) return optionsReadFailure("AUTH BLOCKED");
  if (status === 403) return optionsReadFailure("REQUEST DENIED");
  if (status === 429) return optionsReadFailure("RATE LIMITED");
  if (status === 408 || status === 504) return optionsReadFailure("TIMEOUT");
  if (status >= 500 && status <= 599) return optionsReadFailure("PROVIDER ERROR");
  return optionsReadFailure("UNKNOWN");
}

export interface OptionsSourceReceipt {
  source: OptionChainSource | "unknown";
  fidelity: OptionChainFidelity | "UNKNOWN";
  coverage: "COMPLETE" | "PARTIAL" | "UNKNOWN";
  newestProviderTimestamp: string | null;
}

export interface OptionsReceiptAge {
  label: string;
  timing: "RECENT" | "STALE" | "UNVERIFIED";
}

export interface OptionContractObservationTiming {
  readonly quote: OptionsReceiptAge;
  readonly trade: OptionsReceiptAge;
  /** At least one exact contract observation has a verifiable chronology. */
  readonly reviewable: boolean;
}

const RECORDED_REFERENCE_AGE_MS = 30 * 60_000;

/** Format only observed provider age. This does not infer market-session state,
 * freshness entitlement, or whether a quote is executable.
 */
export function optionsReceiptAge(timestamp: string | null, nowMs = Date.now()): OptionsReceiptAge {
  const observedMs = timestamp ? Date.parse(timestamp) : Number.NaN;
  if (!Number.isFinite(observedMs)) return { label: "timestamp unavailable", timing: "UNVERIFIED" };
  if (!Number.isFinite(nowMs)) return { label: "time comparison unavailable", timing: "UNVERIFIED" };
  const ageMs = nowMs - observedMs;
  if (ageMs < 0) return { label: "provider timestamp ahead", timing: "UNVERIFIED" };
  const minutes = Math.max(0, Math.floor(ageMs / 60_000));
  if (minutes < 1) return { label: "less than 1m old", timing: "RECENT" };
  if (minutes < 60) return { label: `${minutes}m old`, timing: ageMs > RECORDED_REFERENCE_AGE_MS ? "STALE" : "RECENT" };
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return { label: `${hours}h ${remainder}m old`, timing: "STALE" };
}

/** Classify the two observations that belong to one exact contract. Page-level
 * receipt time must never substitute for either field. A contract remains
 * researchable when one edge has verifiable chronology; both unverified edges
 * fail closed before selection or shared-intent recording.
 */
export function optionContractObservationTiming(
  contract: Pick<OptionContract, "quoteTimestamp" | "tradeTimestamp">,
  nowMs: number,
): OptionContractObservationTiming {
  const quote = optionsReceiptAge(contract.quoteTimestamp ?? null, nowMs);
  const trade = optionsReceiptAge(contract.tradeTimestamp ?? null, nowMs);
  return {
    quote,
    trade,
    reviewable: quote.timing !== "UNVERIFIED" || trade.timing !== "UNVERIFIED",
  };
}

type OptionsReadResult = { ok: true; contracts: OptionContract[]; receipt: OptionsSourceReceipt }
  | { ok: false; failure: OptionsReadFailure };

function sourceReceipt(data: unknown): OptionsSourceReceipt {
  const envelope = data && typeof data === "object" && !Array.isArray(data)
    ? data as Record<string, unknown>
    : null;
  if (envelope?.source !== OPTION_CHAIN_SOURCE || envelope.fidelity !== OPTION_CHAIN_FIDELITY
      || (envelope.coverage !== "COMPLETE" && envelope.coverage !== "PARTIAL")) {
    return { source: "unknown", fidelity: "UNKNOWN", coverage: "UNKNOWN", newestProviderTimestamp: null };
  }
  const timestamp = typeof envelope.newestProviderTimestamp === "string"
    && Number.isFinite(Date.parse(envelope.newestProviderTimestamp))
    ? envelope.newestProviderTimestamp
    : null;
  if (!timestamp) {
    return { source: "unknown", fidelity: "UNKNOWN", coverage: "UNKNOWN", newestProviderTimestamp: null };
  }
  return {
    source: OPTION_CHAIN_SOURCE,
    fidelity: OPTION_CHAIN_FIDELITY,
    coverage: envelope.coverage,
    newestProviderTimestamp: timestamp,
  };
}

function hasExactAlpacaObservationBindings(
  contracts: readonly OptionContract[],
  receipt: OptionsSourceReceipt,
): boolean {
  if (receipt.source !== OPTION_CHAIN_SOURCE) return true;
  const observedTimes: number[] = [];
  for (const contract of contracts) {
    const hasQuotePrice = contract.bid !== undefined || contract.ask !== undefined;
    const hasTradePrice = contract.last !== undefined;
    const hasQuoteTime = contract.quoteTimestamp !== undefined;
    const hasTradeTime = contract.tradeTimestamp !== undefined;
    if (hasQuotePrice !== hasQuoteTime || hasTradePrice !== hasTradeTime) return false;
    if (!hasQuotePrice && !hasTradePrice) return false;
    if (hasQuoteTime) observedTimes.push(Date.parse(contract.quoteTimestamp!));
    if (hasTradeTime) observedTimes.push(Date.parse(contract.tradeTimestamp!));
  }
  const newest = receipt.newestProviderTimestamp
    ? Date.parse(receipt.newestProviderTimestamp)
    : Number.NaN;
  return observedTimes.length > 0
    && Number.isFinite(newest)
    && newest === Math.max(...observedTimes);
}

function hasExactRequestedContractIdentity(
  contracts: readonly OptionContract[],
  expectedUnderlying: string,
): boolean {
  const underlying = expectedUnderlying.trim().toUpperCase();
  if (!/^[A-Z0-9.]{1,10}$/.test(underlying)) return false;
  return contracts.every(contract => {
    const match = /^([A-Z0-9.]{1,10})(\d{6})([CP])(\d{8})$/.exec(contract.symbol);
    if (!match || match[1] !== underlying) return false;
    const [, , date, side, strikeDigits] = match;
    const expirationDate = `20${date.slice(0, 2)}-${date.slice(2, 4)}-${date.slice(4, 6)}`;
    return contract.contractType === (side === "C" ? "call" : "put")
      && contract.expirationDate === expirationDate
      && contract.strike === Number(strikeDigits) / 1000;
  });
}

/** Read the error body before classifying the failed edge. The caller owns
 * cancellation/deadline and must recheck its active request after this await.
 * Success validates contract structure only; it never certifies LIVE or rights.
 */
export async function readOptionsResponse(
  response: Pick<Response, "ok" | "status" | "json">,
  expectedUnderlying: string,
): Promise<OptionsReadResult> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { ok: false, failure: response.ok ? optionsReadFailure("INVALID RESPONSE") : responseFailure(response.status, null) };
  }
  if (!response.ok) return { ok: false, failure: responseFailure(response.status, data) };
  try {
    const contracts = parseOptionContractResponse(data);
    const receipt = sourceReceipt(data);
    if (!hasExactRequestedContractIdentity(contracts, expectedUnderlying)
        || !hasExactAlpacaObservationBindings(contracts, receipt)) {
      return { ok: false, failure: optionsReadFailure("INVALID RESPONSE") };
    }
    return contracts.length
      ? { ok: true, contracts, receipt }
      : { ok: false, failure: optionsReadFailure("NO EVENTS") };
  } catch {
    return { ok: false, failure: optionsReadFailure("INVALID RESPONSE") };
  }
}
