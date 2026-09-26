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

/**
 * Is this string an Alpaca order id — and therefore safe to place in a path?
 *
 * Found 2026-09-26 (Lane S audit): `DELETE /api/alpaca-trading?id=…` put the
 * query value straight into `${base}/v2/orders/${id}`. URL parsing resolves dot
 * segments, so `id=../positions` became `DELETE /v2/positions` — Alpaca's
 * close-ALL-positions call. Measured on node 22.22.2: `../positions`,
 * `%2e%2e/positions`, `..\positions` and `x/../../positions` all land on
 * `/v2/positions`. A cancel must never be able to name anything but one order.
 *
 * Alpaca order ids are UUIDs (e.g. `61e69015-8549-4bfd-b9c3-01e75843f47d`).
 * Only that exact shape passes: hex and hyphens, whole string, nothing around it.
 */
const ALPACA_ORDER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAlpacaOrderId(id: unknown): id is string {
  return typeof id === "string" && ALPACA_ORDER_ID.test(id);
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
