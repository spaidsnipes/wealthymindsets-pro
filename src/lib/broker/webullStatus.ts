import type { WebullKeeperView } from "@/lib/broker/webullSessionGuidance";
import type { WebullBrokerConnectionState } from "@/lib/broker/adapters/webullBrokerConnection";
import type { WireboardLiveMeasurement } from "@/lib/broker/selectReadinessWireboard";
import { readJsonReceipt } from "@/lib/marketData/readJsonReceipt";
import { WIRE_PROOF_SYMBOL } from "@/lib/marketData/wireProofScope";

export interface WebullStatus {
  readonly provider: "webull";
  readonly authMode: "SIGNED_OPENAPI";
  readonly implemented: boolean;
  readonly configured: boolean;
  readonly connected: boolean;
  readonly state: WebullBrokerConnectionState;
  readonly accountCount: number;
  readonly accountTypes: readonly string[];
  readonly note: string;
  readonly checkedAt: string;
  readonly missing: readonly string[];
  readonly credentialPresence: {
    readonly appKey: boolean;
    readonly appSecret: boolean;
    readonly accessToken: boolean;
  };
  /**
   * Presence-only readiness for Webull's separate multi-user Connect API.
   * This does not imply that a redirect, callback, token vault, or trading
   * capability exists; those are separate implementation and provider gates.
   */
  readonly connectOAuth: WebullConnectOAuthReadiness;
  /** GP12 §15 — OWNER when the caller is the named owner; NOT_CONFIGURED while no owner is named. */
  readonly ownerGate: "OWNER" | "NOT_CONFIGURED";
  /**
   * The last scheduled keeper run: whether the Webull session was kept alive
   * with nobody on the site. Null when no run is recorded (not yet deployed,
   * or no durable store) — never a guess.
   */
  readonly sessionKeeper: WebullKeeperView | null;
}

export interface WebullConnectOAuthReadiness {
  readonly state: "NOT_CONFIGURED" | "CONFIGURED_NOT_IMPLEMENTED";
  readonly missing: readonly string[];
  readonly note: string;
}

/** Presence-only receipt. Credential values never leave the server. */
export function webullCredentialPresence(
  env: Readonly<Record<string, string | undefined>>,
): WebullStatus["credentialPresence"] {
  return {
    appKey: Boolean((env.WEBULL_APP_KEY || env.WEBULL_API_KEY)?.trim()),
    appSecret: Boolean((env.WEBULL_APP_SECRET || env.WEBULL_API_SECRET)?.trim()),
    accessToken: Boolean(env.WEBULL_ACCESS_TOKEN?.trim()),
  };
}

/**
 * Webull's signed OpenAPI account check and its Connect OAuth product are
 * different lanes. Keep this receipt presence-only so the UI can explain why
 * a Webull website login cannot return to WM Pro yet without leaking a client
 * identifier or secret, and without promoting configuration to connectivity.
 */
export function webullConnectOAuthReadiness(
  env: Readonly<Record<string, string | undefined>>,
): WebullConnectOAuthReadiness {
  const missing: string[] = [];
  if (!env.WEBULL_CONNECT_CLIENT_ID?.trim()) missing.push("WEBULL_CONNECT_CLIENT_ID");
  if (!env.WEBULL_CONNECT_CLIENT_SECRET?.trim()) missing.push("WEBULL_CONNECT_CLIENT_SECRET");
  if (missing.length > 0) {
    return {
      state: "NOT_CONFIGURED",
      missing,
      note: "Webull Connect OAuth is not configured. A website login cannot return an account to WM Pro until the provider-approved client registration and callback implementation exist.",
    };
  }
  return {
    state: "CONFIGURED_NOT_IMPLEMENTED",
    missing: [],
    note: "Webull Connect client credentials are present, but WM Pro has no OAuth callback, token vault, refresh, disconnect, or per-user execution flow. No redirect is initiated.",
  };
}

/** Name missing configuration edges without exposing credential values. */
export function missingSecretsForState(
  state: WebullBrokerConnectionState,
  env: Readonly<Record<string, string | undefined>>,
): readonly string[] {
  if (state !== "UNCONFIGURED") return [];

  const missing: string[] = [];
  if (!(env.WEBULL_APP_KEY || env.WEBULL_API_KEY)?.trim()) {
    missing.push("WEBULL_APP_KEY (or WEBULL_API_KEY)");
  }
  if (!(env.WEBULL_APP_SECRET || env.WEBULL_API_SECRET)?.trim()) {
    missing.push("WEBULL_APP_SECRET (or WEBULL_API_SECRET)");
  }
  return missing;
}

/* ══════════════════════════════════════════════════════════════════════════
 * THE TWO WEBULL LANES — ONE OWNER, EVERY SURFACE READS IT. (2026-09-25)
 *
 * MEASURED on serving, desktop, 2026-09-25 14:51 CDT. Webull is TWO lanes with
 * two different measured truths, and two surfaces each told only one of them:
 *
 *   BROKER lane  /api/broker/webull/status → signed /trading/accounts/list
 *                → CONNECTED at 2026-09-25T19:51:45Z
 *   DATA lane    /api/market-data/webull/ticks → signed market-data read
 *                → 403 MARKET_DATA_NOT_SUBSCRIBED
 *
 *   Settings › Connect brokers  "WEBULL · Entitlement blocked" — one red chip,
 *                               read by the Founder as "Webull is not
 *                               connected", which is false for the broker lane.
 *   /readiness                  "Webull market data · SETUP PRESENT · NOT
 *                               MEASURED. No live probe exists…" — while the
 *                               probe existed and had answered 403.
 *
 * Neither surface lied about the lane it read. Each withheld the other lane,
 * and each reached for a different receipt to do it. So the lane verdict lives
 * HERE, once, and both surfaces render it:
 *
 *   selectWebullLanes           pure: two receipts in → two lane verdicts out
 *   webullWireboardMeasurements pure: lane verdicts → /readiness corrections
 *   readWebullLanes             the one client reader of both existing routes
 *
 * No probe is invented here. Both receipts come from routes that already
 * shipped; this module only refuses to let either lane be shown without the
 * other.
 * ══════════════════════════════════════════════════════════════════════════ */

export type WebullBrokerLaneState =
  | "CONNECTED"
  | "AWAITING_2FA"
  | "AUTH_BLOCKED"
  | "NOT_CONFIGURED"
  | "NOT_CONNECTED"
  | "NOT_MEASURED";

/**
 * `RECEIVING`, not `LIVE`, deliberately: the data-lane receipt is ONE bounded
 * tick snapshot for one symbol (webullTicksWireStatus.ts — "streaming
 * continuity not certified"). Naming it LIVE would outrun its own evidence.
 */
export type WebullDataLaneState =
  | "RECEIVING"
  | "ENTITLEMENT_BLOCKED"
  | "AWAITING_2FA"
  | "AUTH_BLOCKED"
  | "NOT_CONFIGURED"
  | "NOT_RECEIVING"
  | "NOT_MEASURED";

/** The value-free subset of the /api/broker/webull/status body this owner reads. */
export interface WebullBrokerLaneReceipt {
  readonly connected?: boolean;
  readonly state?: string;
  readonly note?: string;
  readonly checkedAt?: string;
  readonly accountCount?: number;
}

/**
 * The subset of the /api/market-data/webull/ticks body this owner reads. The
 * `ticks` array is deliberately NOT part of it: a lane verdict is a status, and
 * a surface that only wants the verdict must never be handed the prints.
 */
export interface WebullDataLaneReceipt {
  /** The adapter's own state token, e.g. "BLOCKED_ENTITLEMENT". */
  readonly state?: string;
  /** The route's classified label (webullTicksWireStatus), e.g. "ENTITLEMENT BLOCKED". */
  readonly label?: string;
  readonly detail?: string;
  readonly note?: string;
  /** When the route asked Webull — the data lane's measurement time. */
  readonly requestedAt?: string;
  readonly httpStatus?: number;
  readonly providerCode?: string | null;
  readonly awaiting2fa?: boolean;
  readonly receiving?: boolean;
  readonly eventCount?: number;
}

export interface WebullBrokerLane {
  readonly lane: "BROKER";
  readonly state: WebullBrokerLaneState;
  /** The provider route's own state token, verbatim. Null when unmeasured. */
  readonly providerState: string | null;
  /** The short display word: "CONNECTED", "AWAITING 2FA", … */
  readonly word: string;
  readonly measuredAt: string | null;
  readonly accountCount: number | null;
  readonly founderAction: string | null;
  readonly note: string;
}

export interface WebullDataLane {
  readonly lane: "DATA";
  readonly state: WebullDataLaneState;
  /** The adapter's own state token, verbatim (AWAITING_2FA when the route flagged a pending approval). */
  readonly providerState: string | null;
  /** The short display word: "NOT ENTITLED", "RECEIVING", … */
  readonly word: string;
  readonly measuredAt: string | null;
  readonly httpStatus: number | null;
  readonly providerCode: string | null;
  /**
   * The status and provider code exactly as the receipt carried them —
   * "403 MARKET_DATA_NOT_SUBSCRIBED". Null when the receipt carried no status.
   * Never reconstructed from the state name: a pixel that says "403" must have
   * a 403 behind it.
   */
  readonly evidence: string | null;
  readonly founderAction: string | null;
  readonly note: string;
}

export interface WebullLanes {
  readonly broker: WebullBrokerLane;
  readonly data: WebullDataLane;
  /** One sentence naming BOTH lanes — for a tooltip or an aria-label. */
  readonly summary: string;
}

/**
 * The one human step the data lane's measured refusal points at.
 *
 * Worded as an ENTITLEMENT and explicitly not a credential, because every
 * credential-shaped instruction on this lane (re-paste a token, rotate a key)
 * has already cost weeks. Deliberately silent on WHOSE entitlement: the ladder
 * behind /api/market-data/webull/entitlement recorded on 2026-09-21 that the
 * gap attaches to the OpenAPI app identity rather than to the account's own
 * data, so "the account is not subscribed" is a sentence this owner may not
 * print.
 */
export const WEBULL_DATA_ENTITLEMENT_FOUNDER_ACTION =
  "Enable the Webull OpenAPI market-data subscription (an entitlement, not a credential).";

/** Shared by both lanes: they use one minted session, so one approval serves both. */
export const WEBULL_2FA_FOUNDER_ACTION = "Approve the pending OpenAPI request in the Webull app.";

const PROVIDER_CODE_SHAPE = /^[A-Z][A-Z0-9_]{2,63}$/;

const nonEmpty = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

function brokerLane(receipt: WebullBrokerLaneReceipt | null | undefined): WebullBrokerLane {
  const providerState = nonEmpty(receipt?.state);
  if (!receipt || !providerState) {
    return {
      lane: "BROKER",
      state: "NOT_MEASURED",
      providerState: null,
      word: "NOT MEASURED",
      measuredAt: null,
      accountCount: null,
      founderAction: null,
      note: "The Webull account-lane status receipt did not return, so the broker lane is unmeasured.",
    };
  }
  const state: WebullBrokerLaneState = receipt.connected === true
    ? "CONNECTED"
    : providerState === "AWAITING_2FA"
      ? "AWAITING_2FA"
      : providerState === "BLOCKED_AUTH"
        ? "AUTH_BLOCKED"
        : providerState === "UNCONFIGURED"
          ? "NOT_CONFIGURED"
          // An unrecognised token is NOT CONNECTED, never CONNECTED: a word we
          // do not understand must not fall through to the reassuring reading.
          : "NOT_CONNECTED";
  return {
    lane: "BROKER",
    state,
    providerState,
    word: state.replace(/_/g, " "),
    measuredAt: nonEmpty(receipt.checkedAt),
    accountCount: typeof receipt.accountCount === "number" && Number.isFinite(receipt.accountCount)
      ? receipt.accountCount
      : null,
    founderAction: state === "AWAITING_2FA" ? WEBULL_2FA_FOUNDER_ACTION : null,
    note: nonEmpty(receipt.note) ?? `Webull reported ${providerState}.`,
  };
}

/**
 * The classified label is read FIRST: `classifyWebullTickSnapshot` owns the
 * tick vocabulary, and this function translates it rather than keeping a second
 * opinion. The raw state token is only a fallback for a body with no label.
 */
function dataLaneStateFor(receipt: WebullDataLaneReceipt): WebullDataLaneState {
  const label = nonEmpty(receipt.label)?.toUpperCase() ?? null;
  const state = nonEmpty(receipt.state)?.toUpperCase() ?? null;
  if (receipt.awaiting2fa === true || label === "AWAITING 2FA") return "AWAITING_2FA";
  if (label === "ENTITLEMENT BLOCKED" || (!label && state === "BLOCKED_ENTITLEMENT")) return "ENTITLEMENT_BLOCKED";
  if (label === "AUTH BLOCKED" || (!label && state === "BLOCKED_AUTH")) return "AUTH_BLOCKED";
  if (label === "NOT CONFIGURED" || (!label && state === "UNCONFIGURED")) return "NOT_CONFIGURED";
  // RECEIVING only with a real print behind it — the same rule the classifier
  // and the strip enforce. A RECEIVING label beside a zero is not receiving.
  const printed = receipt.receiving === true && (receipt.eventCount ?? 0) > 0;
  if (label === "RECEIVING" || (!label && state === "OBSERVED")) return printed ? "RECEIVING" : "NOT_RECEIVING";
  return "NOT_RECEIVING";
}

const DATA_WORD: Readonly<Record<Exclude<WebullDataLaneState, "NOT_RECEIVING">, string>> = {
  RECEIVING: "RECEIVING",
  ENTITLEMENT_BLOCKED: "NOT ENTITLED",
  AWAITING_2FA: "AWAITING 2FA",
  AUTH_BLOCKED: "AUTH BLOCKED",
  NOT_CONFIGURED: "NOT CONFIGURED",
  NOT_MEASURED: "NOT MEASURED",
};

function dataLane(receipt: WebullDataLaneReceipt | null | undefined): WebullDataLane {
  if (!receipt || (!nonEmpty(receipt.label) && !nonEmpty(receipt.state))) {
    return {
      lane: "DATA",
      state: "NOT_MEASURED",
      providerState: null,
      word: DATA_WORD.NOT_MEASURED,
      measuredAt: null,
      httpStatus: null,
      providerCode: null,
      evidence: null,
      founderAction: null,
      note: "The Webull market-data receipt did not return, so the data lane is unmeasured.",
    };
  }
  const state = dataLaneStateFor(receipt);
  const httpStatus = typeof receipt.httpStatus === "number" && Number.isInteger(receipt.httpStatus)
    ? receipt.httpStatus
    : null;
  const code = nonEmpty(receipt.providerCode)?.toUpperCase() ?? null;
  const providerCode = code && PROVIDER_CODE_SHAPE.test(code) ? code : null;
  const evidence = httpStatus !== null
    ? providerCode ? `${httpStatus} ${providerCode}` : `HTTP ${httpStatus}`
    : null;
  return {
    lane: "DATA",
    state,
    providerState: state === "AWAITING_2FA" ? "AWAITING_2FA" : nonEmpty(receipt.state),
    // A measured refusal with no dedicated word keeps the route's own label
    // ("RATE LIMITED", "STALE") rather than being flattened into a generic one.
    word: state === "NOT_RECEIVING"
      ? nonEmpty(receipt.label)?.toUpperCase() ?? "NOT RECEIVING"
      : DATA_WORD[state],
    measuredAt: nonEmpty(receipt.requestedAt),
    httpStatus,
    providerCode,
    evidence,
    founderAction: state === "ENTITLEMENT_BLOCKED"
      ? WEBULL_DATA_ENTITLEMENT_FOUNDER_ACTION
      : state === "AWAITING_2FA"
        ? WEBULL_2FA_FOUNDER_ACTION
        : null,
    note: nonEmpty(receipt.note) ?? nonEmpty(receipt.detail) ?? `Webull reported ${nonEmpty(receipt.state) ?? "no state"}.`,
  };
}

/**
 * THE OWNER. Two receipts in, two lane verdicts out. Pure: no clock, no I/O.
 *
 * `null` for either receipt means that lane was not measured — and its verdict
 * says NOT MEASURED out loud rather than borrowing the other lane's answer.
 * Neither lane can re-grade the other: a 403 on market data says nothing about
 * the account list, and a connected account list says nothing about a data
 * entitlement.
 */
export function selectWebullLanes(input: {
  readonly broker: WebullBrokerLaneReceipt | null | undefined;
  readonly data: WebullDataLaneReceipt | null | undefined;
}): WebullLanes {
  const broker = brokerLane(input.broker);
  const data = dataLane(input.data);
  const brokerPart = `Webull broker lane ${broker.word}${broker.measuredAt ? ` (measured ${broker.measuredAt})` : ""}`;
  const dataPart = `data lane ${data.word}${data.evidence ? ` · ${data.evidence}` : ""}${data.measuredAt ? ` (measured ${data.measuredAt})` : ""}`;
  const actions = [...new Set([broker.founderAction, data.founderAction].filter((a): a is string => Boolean(a)))];
  return {
    broker,
    data,
    summary: `${brokerPart}; ${dataPart}.${actions.length > 0 ? ` Founder action: ${actions.join(" ")}` : ""}`,
  };
}

/**
 * The /readiness rows each lane corrects. Also the page's "a probe exists for
 * this row" list, so a lane whose probe did not answer reads NOT MEASURED
 * without the false "no live probe exists" sentence.
 */
export const WEBULL_LANE_PROVIDERS = { broker: "webull-broker", data: "webull-data" } as const;

/**
 * The /readiness corrections, one per MEASURED lane. An unmeasured lane emits
 * nothing, so its row stays on presence-only truth and says NOT MEASURED — the
 * page's honesty rule, which this function exists to keep, not to bend.
 *
 * Each lane corrects only the row it measured: webull-broker from the account
 * list, webull-data from the market-data read. A data-lane measurement also
 * needs its own time; a receipt that cannot say when it asked is not passed off
 * as a live measurement.
 */
export function webullWireboardMeasurements(lanes: WebullLanes): WireboardLiveMeasurement[] {
  const out: WireboardLiveMeasurement[] = [];
  if (lanes.broker.state !== "NOT_MEASURED" && lanes.broker.providerState) {
    out.push({
      provider: WEBULL_LANE_PROVIDERS.broker,
      connected: lanes.broker.state === "CONNECTED",
      state: lanes.broker.providerState,
      note: lanes.broker.note,
      checkedAt: lanes.broker.measuredAt ?? "time not reported",
      evidence: null,
      founderAction: lanes.broker.founderAction,
    });
  }
  if (lanes.data.state !== "NOT_MEASURED" && lanes.data.providerState && lanes.data.measuredAt) {
    out.push({
      provider: WEBULL_LANE_PROVIDERS.data,
      connected: lanes.data.state === "RECEIVING",
      state: lanes.data.providerState,
      note: lanes.data.note,
      checkedAt: lanes.data.measuredAt,
      evidence: lanes.data.evidence,
      founderAction: lanes.data.founderAction,
    });
  }
  return out;
}

/** The account-list probe. Measures the broker lane and nothing about data. */
export const WEBULL_BROKER_LANE_ROUTE = "/api/broker/webull/status";
/** The bounded market-data read, on the same proof symbol the wire strip uses. */
export const WEBULL_DATA_LANE_ROUTE = `/api/market-data/webull/ticks?symbol=${WIRE_PROOF_SYMBOL}`;

function projectBroker(body: WebullBrokerLaneReceipt | null): WebullBrokerLaneReceipt | null {
  if (!body || typeof body !== "object") return null;
  return {
    connected: body.connected,
    state: body.state,
    note: body.note,
    checkedAt: body.checkedAt,
    accountCount: body.accountCount,
  };
}

function projectData(body: WebullDataLaneReceipt | null): WebullDataLaneReceipt | null {
  if (!body || typeof body !== "object") return null;
  return {
    state: body.state,
    label: body.label,
    detail: body.detail,
    note: body.note,
    requestedAt: body.requestedAt,
    httpStatus: body.httpStatus,
    providerCode: body.providerCode,
    awaiting2fa: body.awaiting2fa,
    receiving: body.receiving,
    eventCount: body.eventCount,
  };
}

/**
 * The ONE client reader of both lanes' existing routes. It returns lane
 * verdicts only: the tick route's `ticks` array is projected away at this
 * boundary, so a surface that asks "is the data lane open?" is never handed
 * market prints it did not ask for — a status page is not a market feed.
 *
 * Each read fails independently to `null` → NOT MEASURED for that lane alone.
 * An unreachable probe may downgrade its own lane; it may never erase the other.
 */
export async function readWebullLanes(fetchImpl: typeof fetch, signal: AbortSignal): Promise<WebullLanes> {
  const [broker, data] = await Promise.all([
    readJsonReceipt<WebullBrokerLaneReceipt>(fetchImpl, WEBULL_BROKER_LANE_ROUTE, signal).catch(() => null),
    readJsonReceipt<WebullDataLaneReceipt>(fetchImpl, WEBULL_DATA_LANE_ROUTE, signal).catch(() => null),
  ]);
  return selectWebullLanes({ broker: projectBroker(broker), data: projectData(data) });
}
