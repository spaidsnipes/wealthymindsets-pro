/**
 * Capital-safety boundary for Alpaca access.
 *
 * Live brokerage access stays disabled until the canonical Risk Kernel,
 * Execution Firewall, account ownership, entitlements, idempotency, and order
 * reconciliation gates are certified. A caller-controlled flag can never
 * promote a paper request to live.
 */
export const ALPACA_EXECUTION_MODE = "PAPER_ONLY" as const;
export const ALPACA_PAPER_BASE = "https://paper-api.alpaca.markets" as const;

export function rejectsLiveAlpacaRequest(input: {
  paper?: unknown;
  confirm_live?: unknown;
  environment?: unknown;
}): boolean {
  return input.paper === false
    || input.confirm_live === true
    || String(input.environment ?? "").toLowerCase() === "live";
}

export function liveAlpacaDisabledResponse() {
  return {
    error: "Live brokerage access is disabled until the WM Execution Firewall is certified.",
    code: "LIVE_EXECUTION_DISABLED",
    environment: ALPACA_EXECUTION_MODE,
  } as const;
}

export function isAuthorizedAlpacaOwner(userId: string, configuredOwnerId: string | undefined): boolean {
  return Boolean(configuredOwnerId) && userId === configuredOwnerId;
}

export function alpacaAccountUnauthorizedResponse() {
  return {
    error: "This brokerage account is not authorized for the current user.",
    code: "BROKER_ACCOUNT_NOT_AUTHORIZED",
  } as const;
}
