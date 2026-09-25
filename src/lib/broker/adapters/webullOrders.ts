/**
 * WEBULL ORDERS — preview, place-once, exact lookup, reconcile. GP12 Mission B.
 *
 * Every path, version and body shape below is read from the official SDK
 * (`webull-openapi-python-sdk` 3.0.2, the `order_v3` family) through
 * `WEBULL_SDK_CONTRACT`; see the ORDER_* rows there for citations.
 *
 * ── THE LAW THIS FILE EXISTS TO ENFORCE (GP12 §33, P0 capital protection) ────
 *
 * An order whose request left and whose answer never came back is not a
 * failed order. It is an UNKNOWN order. Webull may have it. Sending it again
 * can buy twice.
 *
 *     WRONG: timeout → place again.
 *     RIGHT: timeout → SUBMISSION_UNKNOWN → read the exact order by its
 *            client_order_id → only a PROVEN absence permits another place,
 *            and it goes with the SAME client_order_id.
 *
 * `submitWebullOrderOnce` owns that sequence against a ledger the caller
 * supplies, and writes SUBMITTING to the ledger BEFORE the request leaves —
 * so a process that dies mid-flight leaves a record that forces
 * reconciliation on the next attempt instead of a blank that invites a retry.
 *
 * ── THE GATE ─────────────────────────────────────────────────────────────────
 *
 * Nothing here sends a real order unless the caller passes
 * `liveOrdersEnabled: true`. That flag is not a UI toggle; it is the Founder's
 * explicit "RUN THE LIVE TEST NOW" (GP12 §40, §88), and until it is given every
 * place attempt is REFUSED_GATE and never touches the network. Preview is
 * non-money (Webull validates and prices the order without placing it) and is
 * not gated.
 *
 * Scope: US equities/ETFs, regular session (`support_trading_session: CORE`,
 * as the SDK's own v3 sample sends). Anything else is refused by name rather
 * than approximated.
 */

import { randomUUID } from "crypto";
import { buildWebullSignedHeaders } from "@/lib/marketData/adapters/webullMarketData";
import { WEBULL_SDK_CONTRACT, type WebullEndpointContract } from "@/lib/marketData/webullSdkContract";
import type { UniversalOrderIntent } from "@/lib/broker/BrokerAdapter";

const DEFAULT_HOST = "api.webull.com";

/** The canonical intent plus the decision it serves (GP12 §31). */
export interface WebullOrderIntent extends UniversalOrderIntent {
  /** The Decision_ID this order expresses. Required: no orphan orders. */
  readonly decisionId: string;
}

/** One stock order in Webull's own field names (samples/trade/trade_client_v3.py). */
export interface WebullStockOrder {
  readonly client_order_id: string;
  readonly combo_type: "NORMAL";
  readonly symbol: string;
  readonly instrument_type: "EQUITY";
  readonly market: "US";
  readonly order_type: "MARKET" | "LIMIT" | "STOP_LOSS" | "STOP_LOSS_LIMIT";
  readonly limit_price?: string;
  readonly stop_price?: string;
  readonly quantity: string;
  readonly support_trading_session: "CORE";
  readonly side: "BUY" | "SELL";
  readonly time_in_force: "DAY" | "GTC" | "IOC";
  readonly entrust_type: "QTY";
}

export type MapResult =
  | { readonly ok: true; readonly order: WebullStockOrder }
  | { readonly ok: false; readonly reason: string };

/** Webull's sample mints `uuid4().hex`; accept that family and nothing looser. */
const CLIENT_ORDER_ID = /^[A-Za-z0-9_-]{8,40}$/;
const SYMBOL = /^[A-Z][A-Z0-9.]{0,9}$/;

function price(value: number | undefined): string | null {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return null;
  // Webull takes prices as strings. Trim float noise without inventing digits.
  return String(Number(value.toPrecision(12)));
}

export function mapToWebullStockOrder(intent: WebullOrderIntent): MapResult {
  if (!intent.decisionId?.trim()) return { ok: false, reason: "No Decision_ID: an order must express a decision." };
  if (!CLIENT_ORDER_ID.test(intent.clientOrderId)) {
    return { ok: false, reason: "The client order id is missing or malformed; it is the only thing that makes this order reconcilable." };
  }
  if (intent.assetClass !== "equity") {
    return { ok: false, reason: `Only US equities are wired for Webull orders; ${intent.assetClass ?? "an unstated asset class"} is refused rather than approximated.` };
  }
  const symbol = intent.symbol.trim().toUpperCase();
  if (!SYMBOL.test(symbol)) return { ok: false, reason: `"${intent.symbol}" is not a US equity symbol WM Pro will send.` };
  if (!Number.isInteger(intent.qty) || intent.qty <= 0) {
    return { ok: false, reason: "Quantity must be a whole number of shares above zero." };
  }

  const tif = intent.tif ?? "day";
  if (tif === "fok") return { ok: false, reason: "Webull's order TIF set is DAY / GTC / IOC; fill-or-kill is not offered." };
  const timeInForce = tif === "gtc" ? "GTC" : tif === "ioc" ? "IOC" : "DAY";

  const limit = price(intent.limitPx);
  const stop = price(intent.stopPx);
  let orderType: WebullStockOrder["order_type"];
  switch (intent.type) {
    case "market":
      if (limit || stop) return { ok: false, reason: "A market order carries no limit or stop price." };
      orderType = "MARKET";
      break;
    case "limit":
      if (!limit) return { ok: false, reason: "A limit order needs a limit price above zero." };
      orderType = "LIMIT";
      break;
    case "stop":
      if (!stop) return { ok: false, reason: "A stop order needs a stop price above zero." };
      orderType = "STOP_LOSS";
      break;
    case "stop-limit":
      if (!limit || !stop) return { ok: false, reason: "A stop-limit order needs both a stop and a limit price." };
      orderType = "STOP_LOSS_LIMIT";
      break;
    default:
      return { ok: false, reason: "Unknown order type." };
  }

  return {
    ok: true,
    order: {
      client_order_id: intent.clientOrderId,
      combo_type: "NORMAL",
      symbol,
      instrument_type: "EQUITY",
      market: "US",
      order_type: orderType,
      ...(limit ? { limit_price: limit } : {}),
      ...(stop ? { stop_price: stop } : {}),
      quantity: String(intent.qty),
      support_trading_session: "CORE",
      side: intent.side === "sell" ? "SELL" : "BUY",
      time_in_force: timeInForce,
      entrust_type: "QTY",
    },
  };
}

/** A fresh client order id in the SDK sample's own format (uuid4 hex). */
export function mintClientOrderId(): string {
  return randomUUID().replace(/-/g, "");
}

// ── transport ────────────────────────────────────────────────────────────────

export interface WebullOrderConfig {
  readonly appKey: string;
  readonly appSecret: string;
  readonly apiHost?: string;
  /** The minted session (`x-access-token`). Resolved by the caller. */
  readonly accessToken?: string;
  readonly timeoutMs?: number;
  readonly now?: () => Date;
  readonly nonce?: () => string;
}

type Transport =
  | { readonly kind: "ANSWERED"; readonly status: number; readonly payload: unknown }
  /** The request may or may not have reached Webull. */
  | { readonly kind: "NO_ANSWER"; readonly reason: string };

async function signedCall(
  fetchImpl: typeof fetch,
  config: WebullOrderConfig,
  contract: WebullEndpointContract,
  input: { readonly query?: Readonly<Record<string, string>>; readonly body?: unknown; readonly extraHeaders?: Readonly<Record<string, string>> },
): Promise<Transport> {
  const host = (config.apiHost || DEFAULT_HOST).replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const method = contract.method ?? "GET";
  const query = input.query ?? {};
  // Signed and sent as the SAME string; re-serializing would break the digest.
  const body = method === "POST" ? JSON.stringify(input.body ?? {}) : undefined;
  const headers: Record<string, string> = {
    ...buildWebullSignedHeaders({
      path: contract.path,
      query,
      appKey: config.appKey,
      appSecret: config.appSecret,
      host,
      timestamp: (config.now || (() => new Date()))().toISOString().replace(/\.\d{3}Z$/, "Z"),
      nonce: (config.nonce || mintClientOrderId)(),
      apiVersion: contract.apiVersion,
      ...(body !== undefined ? { body } : {}),
      // POST bodies go with the SDK's own SHA-256 profile, the one Webull
      // accepted on the streaming subscribe POST; GETs keep the profile the
      // proven account and positions reads use.
      profile: method === "POST" ? "sdk-sha256" : "legacy-sha1",
    }),
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(input.extraHeaders ?? {}),
  };
  if (config.accessToken?.trim()) headers["x-access-token"] = config.accessToken.trim();

  const search = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : "";
  const timeoutMs = Math.max(250, Math.min(30_000, config.timeoutMs ?? 10_000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`https://${host}${contract.path}${search}`, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
    });
    const text = await response.text();
    let payload: unknown = text;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      // Non-JSON is reported as text, never swallowed.
    }
    return { kind: "ANSWERED", status: response.status, payload };
  } catch (error) {
    return {
      kind: "NO_ANSWER",
      reason: controller.signal.aborted
        ? `No answer within ${timeoutMs} ms`
        : `Transport failed (${error instanceof Error ? error.message : String(error)})`,
    };
  } finally {
    clearTimeout(timer);
  }
}

function providerWords(payload: unknown): string {
  if (!payload || typeof payload !== "object") return typeof payload === "string" ? payload.slice(0, 200) : "";
  const p = payload as Record<string, unknown>;
  const code = typeof p.code === "string" ? p.code : typeof p.error_code === "string" ? p.error_code : "";
  const message = typeof p.message === "string" ? p.message : typeof p.msg === "string" ? p.msg : "";
  return [code, message].filter(Boolean).join(" · ").slice(0, 200);
}

function firstString(...values: unknown[]): string | null {
  for (const v of values) if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

// ── preview (non-money) ──────────────────────────────────────────────────────

export type WebullPreviewResult =
  | { readonly state: "PREVIEWED"; readonly payload: unknown }
  | { readonly state: "REFUSED_LOCAL"; readonly reason: string }
  | { readonly state: "REJECTED"; readonly status: number; readonly reason: string }
  | { readonly state: "NO_ANSWER"; readonly reason: string };

export async function previewWebullOrder(
  fetchImpl: typeof fetch,
  config: WebullOrderConfig,
  intent: WebullOrderIntent,
): Promise<WebullPreviewResult> {
  const mapped = mapToWebullStockOrder(intent);
  if (!mapped.ok) return { state: "REFUSED_LOCAL", reason: mapped.reason };
  const t = await signedCall(fetchImpl, config, WEBULL_SDK_CONTRACT.ORDER_PREVIEW, {
    body: { account_id: intent.accountId, new_orders: [mapped.order] },
  });
  if (t.kind === "NO_ANSWER") return { state: "NO_ANSWER", reason: t.reason };
  if (t.status >= 200 && t.status < 300) return { state: "PREVIEWED", payload: t.payload };
  return { state: "REJECTED", status: t.status, reason: providerWords(t.payload) || `HTTP ${t.status}` };
}

// ── exact order lookup (primary reconciliation) ──────────────────────────────

export type WebullBrokerStatus =
  | "SUBMITTED" | "PARTIAL_FILLED" | "FILLED" | "CANCELLED" | "FAILED" | "OTHER";

function normalizeStatus(raw: string | null): WebullBrokerStatus {
  const s = (raw ?? "").toUpperCase().replace(/\s+/g, "_");
  if (s === "SUBMITTED" || s === "FILLED" || s === "CANCELLED" || s === "FAILED") return s;
  if (s === "PARTIAL_FILLED" || s === "PARTIALLY_FILLED") return "PARTIAL_FILLED";
  return "OTHER";
}

export type WebullOrderLookup =
  | { readonly state: "FOUND"; readonly status: WebullBrokerStatus; readonly rawStatus: string | null; readonly brokerOrderId: string | null }
  /** Webull answered and has no order under this client id. */
  | { readonly state: "NOT_FOUND" }
  /** Could not establish either. Never read as absence. */
  | { readonly state: "UNKNOWN"; readonly reason: string };

/**
 * Find the order under `client_order_id` inside whatever envelope Webull
 * answered with. Matching is by the client id itself — a record that does not
 * carry OUR id is not evidence about our order.
 */
function findOrder(payload: unknown, clientOrderId: string): Record<string, unknown> | null {
  const seen = new Set<unknown>();
  const walk = (node: unknown): Record<string, unknown> | null => {
    if (!node || typeof node !== "object" || seen.has(node)) return null;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) {
        const hit = walk(item);
        if (hit) return hit;
      }
      return null;
    }
    const rec = node as Record<string, unknown>;
    if (rec.client_order_id === clientOrderId || rec.clientOrderId === clientOrderId) return rec;
    for (const value of Object.values(rec)) {
      const hit = walk(value);
      if (hit) return hit;
    }
    return null;
  };
  return walk(payload);
}

export async function getWebullOrderByClientId(
  fetchImpl: typeof fetch,
  config: WebullOrderConfig,
  accountId: string,
  clientOrderId: string,
): Promise<WebullOrderLookup> {
  const t = await signedCall(fetchImpl, config, WEBULL_SDK_CONTRACT.ORDER_DETAIL, {
    query: { account_id: accountId, client_order_id: clientOrderId },
  });
  if (t.kind === "NO_ANSWER") return { state: "UNKNOWN", reason: t.reason };
  if (t.status === 404) return { state: "NOT_FOUND" };
  if (t.status < 200 || t.status >= 300) {
    // 4xx that NAMES absence is still only a claim we could not verify here;
    // anything we cannot read as FOUND/NOT_FOUND stays UNKNOWN.
    const words = providerWords(t.payload);
    if (/NOT[_ ]?FOUND|NOT[_ ]?EXIST/i.test(words)) return { state: "NOT_FOUND" };
    return { state: "UNKNOWN", reason: words || `HTTP ${t.status}` };
  }
  const order = findOrder(t.payload, clientOrderId);
  if (!order) {
    // 200 with no record carrying our id. An empty answer is absence; a
    // non-empty one we cannot match is not something we may call absence.
    const empty = t.payload == null
      || (Array.isArray(t.payload) && t.payload.length === 0)
      || (typeof t.payload === "object" && !Array.isArray(t.payload) && Object.keys(t.payload as object).length === 0);
    return empty ? { state: "NOT_FOUND" } : { state: "UNKNOWN", reason: "Webull answered, but no record carried this client order id." };
  }
  const rawStatus = firstString(order.status, order.order_status, order.orderStatus);
  return {
    state: "FOUND",
    status: normalizeStatus(rawStatus),
    rawStatus,
    brokerOrderId: firstString(order.order_id, order.orderId),
  };
}

// ── the ledger and place-once ────────────────────────────────────────────────

export type LedgerState =
  /** Written BEFORE the request leaves. Seen on read = the answer was lost. */
  | "SUBMITTING"
  | "ACKNOWLEDGED"
  | "REJECTED"
  | "SUBMISSION_UNKNOWN";

export interface LedgerRecord {
  readonly clientOrderId: string;
  readonly decisionId: string;
  readonly accountId: string;
  readonly state: LedgerState;
  readonly brokerOrderId: string | null;
  readonly brokerStatus: WebullBrokerStatus | null;
  readonly note: string;
  readonly updatedAtMs: number;
}

export interface WebullOrderLedger {
  get(clientOrderId: string): Promise<LedgerRecord | null>;
  put(record: LedgerRecord): Promise<void>;
}

export type SubmitOutcome =
  | "REFUSED_GATE" | "REFUSED_LOCAL" | "ACKNOWLEDGED" | "REJECTED"
  | "SUBMISSION_UNKNOWN" | "ALREADY_PLACED";

export interface SubmitResult {
  readonly outcome: SubmitOutcome;
  readonly clientOrderId: string;
  readonly brokerOrderId: string | null;
  readonly note: string;
  /** True only when a place request actually left this process. */
  readonly sent: boolean;
}

export async function submitWebullOrderOnce(
  fetchImpl: typeof fetch,
  config: WebullOrderConfig & { readonly liveOrdersEnabled: boolean },
  ledger: WebullOrderLedger,
  intent: WebullOrderIntent,
): Promise<SubmitResult> {
  const id = intent.clientOrderId;
  const nowMs = () => (config.now || (() => new Date()))().getTime();
  const result = (outcome: SubmitOutcome, note: string, sent: boolean, brokerOrderId: string | null = null): SubmitResult =>
    ({ outcome, clientOrderId: id, brokerOrderId, note, sent });
  const record = (state: LedgerState, note: string, brokerOrderId: string | null = null, brokerStatus: WebullBrokerStatus | null = null) =>
    ledger.put({ clientOrderId: id, decisionId: intent.decisionId, accountId: intent.accountId, state, brokerOrderId, brokerStatus, note, updatedAtMs: nowMs() });

  if (!config.liveOrdersEnabled) {
    return result("REFUSED_GATE", "Live Webull orders are not enabled. They open only on the Founder's explicit live-test instruction.", false);
  }
  const mapped = mapToWebullStockOrder(intent);
  if (!mapped.ok) return result("REFUSED_LOCAL", mapped.reason, false);

  // ── Has this client id been seen before? Then Webull may already hold it. ──
  const prior = await ledger.get(id);
  if (prior && (prior.state === "ACKNOWLEDGED" || prior.state === "REJECTED")) {
    return result("ALREADY_PLACED", `This client order id already reached a final submission answer (${prior.state}). Nothing was sent again.`, false, prior.brokerOrderId);
  }
  if (prior && (prior.state === "SUBMITTING" || prior.state === "SUBMISSION_UNKNOWN")) {
    const found = await getWebullOrderByClientId(fetchImpl, config, intent.accountId, id);
    if (found.state === "FOUND") {
      await record("ACKNOWLEDGED", `Reconciled: Webull holds this order (${found.rawStatus ?? "status unstated"}).`, found.brokerOrderId, found.status);
      return result("ALREADY_PLACED", "Reconciled against Webull's exact order record. Nothing was sent again.", false, found.brokerOrderId);
    }
    if (found.state === "UNKNOWN") {
      await record("SUBMISSION_UNKNOWN", `Still unknown after the exact lookup (${found.reason}).`);
      return result("SUBMISSION_UNKNOWN", `The earlier submission is still unknown (${found.reason}). Nothing was sent again.`, false);
    }
    // NOT_FOUND by the exact lookup — the ONLY state that permits another place,
    // and it goes with the SAME client order id.
  }

  // ── Write BEFORE sending, so a lost answer leaves a trace, not a blank. ──
  await record("SUBMITTING", "Place request about to leave.");
  const t = await signedCall(fetchImpl, config, WEBULL_SDK_CONTRACT.ORDER_PLACE, {
    body: { account_id: intent.accountId, new_orders: [mapped.order] },
    // add_custom_headers_from_order: category = <market>_<instrument_type>.
    extraHeaders: { category: `${mapped.order.market}_${mapped.order.instrument_type}` },
  });

  if (t.kind === "NO_ANSWER" || t.status >= 500 || t.status === 408 || t.status === 429) {
    const why = t.kind === "NO_ANSWER" ? t.reason : `HTTP ${t.status}`;
    await record("SUBMISSION_UNKNOWN", `No usable answer to the place request (${why}).`);
    return result("SUBMISSION_UNKNOWN", `The order may or may not be at Webull (${why}). It will be reconciled by its client order id before anything is sent again.`, true);
  }
  if (t.status < 200 || t.status >= 300) {
    const words = providerWords(t.payload) || `HTTP ${t.status}`;
    await record("REJECTED", `Webull refused the order: ${words}.`);
    return result("REJECTED", `Webull refused the order: ${words}.`, true);
  }
  const echoed = findOrder(t.payload, id);
  const brokerOrderId = firstString(echoed?.order_id, echoed?.orderId,
    (t.payload as Record<string, unknown> | null)?.order_id);
  await record("ACKNOWLEDGED", "Webull acknowledged the place request.", brokerOrderId);
  return result("ACKNOWLEDGED", "Webull acknowledged the order. Fills arrive through the order record, not this answer.", true, brokerOrderId);
}

/** An in-memory ledger: correct for tests and one isolate, never for production money. */
export function inMemoryOrderLedger(): WebullOrderLedger {
  const rows = new Map<string, LedgerRecord>();
  return {
    async get(id) { return rows.get(id) ?? null; },
    async put(record) { rows.set(record.clientOrderId, record); },
  };
}
