import { parseOptionContractResponse, type OptionContract } from "./optionContractResponse";

export type OptionsFailureEdge =
  | "NOT CONFIGURED" | "AUTH BLOCKED" | "REQUEST DENIED" | "RATE LIMITED"
  | "TIMEOUT" | "NETWORK ERROR" | "PROVIDER ERROR" | "INVALID RESPONSE"
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
  if (status === 503 && (envelope?.source === "fmp" || envelope?.source === "alpaca") && envelope.edge === "NOT CONFIGURED") {
    return optionsReadFailure("NOT CONFIGURED");
  }
  // The WM-owned Alpaca route uses this exact 502 receipt when transport,
  // JSON parsing, or normalization fails. Preserve that distinction instead
  // of incorrectly projecting every 502 as an upstream provider failure.
  if (status === 502 && envelope?.source === "alpaca" && envelope.edge === "INVALID RESPONSE") {
    const stage = envelope.stage;
    return stage === "TRANSPORT" || stage === "DECODE" || stage === "NORMALIZE"
      ? stagedInvalidResponse(stage)
      : optionsReadFailure("INVALID RESPONSE");
  }
  if (status === 401) return optionsReadFailure("AUTH BLOCKED");
  if (status === 403) return optionsReadFailure("REQUEST DENIED");
  if (status === 429) return optionsReadFailure("RATE LIMITED");
  if (status === 408 || status === 504) return optionsReadFailure("TIMEOUT");
  if (status >= 500 && status <= 599) return optionsReadFailure("PROVIDER ERROR");
  return optionsReadFailure("UNKNOWN");
}

export interface OptionsSourceReceipt {
  source: "alpaca" | "unknown";
  fidelity: "INDICATIVE" | "UNKNOWN";
  coverage: "COMPLETE" | "PARTIAL" | "UNKNOWN";
  newestProviderTimestamp: string | null;
}

type OptionsReadResult = { ok: true; contracts: OptionContract[]; receipt: OptionsSourceReceipt }
  | { ok: false; failure: OptionsReadFailure };

function sourceReceipt(data: unknown): OptionsSourceReceipt {
  const envelope = data && typeof data === "object" && !Array.isArray(data)
    ? data as Record<string, unknown>
    : null;
  if (envelope?.source !== "alpaca" || envelope.fidelity !== "INDICATIVE"
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
    source: "alpaca",
    fidelity: "INDICATIVE",
    coverage: envelope.coverage,
    newestProviderTimestamp: timestamp,
  };
}

/** Read the error body before classifying the failed edge. The caller owns
 * cancellation/deadline and must recheck its active request after this await.
 * Success validates contract structure only; it never certifies LIVE or rights.
 */
export async function readOptionsResponse(response: Pick<Response, "ok" | "status" | "json">): Promise<OptionsReadResult> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { ok: false, failure: response.ok ? optionsReadFailure("INVALID RESPONSE") : responseFailure(response.status, null) };
  }
  if (!response.ok) return { ok: false, failure: responseFailure(response.status, data) };
  try {
    const contracts = parseOptionContractResponse(data);
    return contracts.length
      ? { ok: true, contracts, receipt: sourceReceipt(data) }
      : { ok: false, failure: optionsReadFailure("NO EVENTS") };
  } catch {
    return { ok: false, failure: optionsReadFailure("INVALID RESPONSE") };
  }
}
