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

function responseFailure(status: number, body: unknown): OptionsReadFailure {
  const envelope = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown> : null;
  // Accept only the exact WM FMP route's structured config receipt. HTTP 503
  // alone (or a provider's arbitrary prose) is not evidence of missing config.
  if (status === 503 && envelope?.source === "fmp" && envelope.edge === "NOT CONFIGURED") {
    return optionsReadFailure("NOT CONFIGURED");
  }
  if (status === 401) return optionsReadFailure("AUTH BLOCKED");
  if (status === 403) return optionsReadFailure("REQUEST DENIED");
  if (status === 429) return optionsReadFailure("RATE LIMITED");
  if (status === 408 || status === 504) return optionsReadFailure("TIMEOUT");
  if (status >= 500 && status <= 599) return optionsReadFailure("PROVIDER ERROR");
  return optionsReadFailure("UNKNOWN");
}

type OptionsReadResult = { ok: true; contracts: OptionContract[] }
  | { ok: false; failure: OptionsReadFailure };

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
      ? { ok: true, contracts }
      : { ok: false, failure: optionsReadFailure("NO EVENTS") };
  } catch {
    return { ok: false, failure: optionsReadFailure("INVALID RESPONSE") };
  }
}
