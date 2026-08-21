/**
 * TradeLine — the order authorization layer.
 *
 * The BrokerAdapter contract states: "Never call submitOrder from React
 * components; always through the TradeLine authorization layer." That layer did
 * not exist in code yet. This module is its foundation: the pure structural
 * validation every order intent must pass BEFORE it can reach an adapter.
 *
 * Founder directive: "Do not enable unsafe live-write behavior without explicit
 * authorization and risk controls." validateOrderIntent is the first control —
 * a malformed or nonsensical intent is rejected here, never sent to a broker.
 *
 * PURE — no I/O, no adapter calls. Higher layers (account-aware capability
 * checks, buying-power checks, live-write authorization) compose on top; this
 * is the structural floor.
 */

import type { UniversalOrderIntent } from "./BrokerAdapter";

export interface OrderIntentValidation {
  readonly ok: boolean;
  /** Hard failures — the order MUST NOT be submitted. */
  readonly errors: readonly string[];
  /** Non-blocking notes (e.g. a price field that will be ignored). */
  readonly warnings: readonly string[];
}

const VALID_SIDES = new Set(["buy", "sell"]);
const VALID_TYPES = new Set(["market", "limit", "stop", "stop-limit"]);
const VALID_TIFS = new Set(["day", "gtc", "ioc", "fok"]);

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function posFinite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

/**
 * Structural validation of a UniversalOrderIntent. Returns all errors (not just
 * the first) so the order ticket can surface every problem at once.
 */
export function validateOrderIntent(intent: UniversalOrderIntent): OrderIntentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!nonEmpty(intent.clientOrderId)) errors.push("clientOrderId is required (idempotency key).");
  if (!nonEmpty(intent.accountId)) errors.push("accountId is required.");
  if (!nonEmpty(intent.symbol)) errors.push("symbol is required.");

  if (!VALID_SIDES.has(intent.side)) errors.push(`side must be buy or sell (got "${intent.side}").`);
  if (!VALID_TYPES.has(intent.type)) errors.push(`type must be market, limit, stop, or stop-limit (got "${intent.type}").`);

  if (!posFinite(intent.qty)) errors.push("qty must be a positive, finite number.");

  // Price requirements per order type.
  switch (intent.type) {
    case "market":
      if (intent.limitPx != null) warnings.push("limitPx is ignored for a market order.");
      if (intent.stopPx != null) warnings.push("stopPx is ignored for a market order.");
      break;
    case "limit":
      if (!posFinite(intent.limitPx)) errors.push("limitPx is required and must be positive for a limit order.");
      if (intent.stopPx != null) warnings.push("stopPx is ignored for a limit order.");
      break;
    case "stop":
      if (!posFinite(intent.stopPx)) errors.push("stopPx is required and must be positive for a stop order.");
      if (intent.limitPx != null) warnings.push("limitPx is ignored for a stop order.");
      break;
    case "stop-limit":
      if (!posFinite(intent.stopPx)) errors.push("stopPx is required and must be positive for a stop-limit order.");
      if (!posFinite(intent.limitPx)) errors.push("limitPx is required and must be positive for a stop-limit order.");
      break;
    default:
      break; // invalid type already reported above
  }

  if (intent.tif != null && !VALID_TIFS.has(intent.tif)) {
    errors.push(`tif must be day, gtc, ioc, or fok when provided (got "${intent.tif}").`);
  }

  return { ok: errors.length === 0, errors, warnings };
}
