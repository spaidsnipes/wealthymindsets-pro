/**
 * webullPositions — the read behind the BROKER COST LINE.
 *
 * ── THE INVENTION THIS SERVES (HOUSE PLAN bolt-on, BUILD ORDER #6) ──────────
 * "Name the invention before coding": BROKER COST LINE — the trader's REAL
 * Webull position, painted at a REAL price level on the chart. The Webull
 * DATA lane still answers 403 MARKET_DATA_NOT_SUBSCRIBED (a subscription
 * question, not a secret question), but the BROKER lane is CONNECTED against
 * the same credentials — and a position's cost basis is a true price that
 * lane carries TODAY. This module is the server half of that invention.
 *
 * ── WHAT WAS MEASURED BEFORE THIS WAS WRITTEN (2026-09-22) ──────────────────
 * Through the verified Webull read path, the founder's accounts answered:
 *   - positions rows carry `symbol`, `instrument_type` ("OPTION"/...),
 *     `cost_price` ("0.02" — a STRING), `quantity` ("1" — a STRING),
 *     and for options a `legs` array with `option_exercise_price` ("422.5"),
 *     `option_type` ("CALL"), `option_expire_date` ("2026-09-23"),
 *     `option_contract_multiplier` ("100").
 *   - an empty account answers `[]`, not an envelope.
 * The fixtures in webullPositions.test.ts are transcriptions of that real
 * answer, not invented shapes.
 *
 * ── THE HONEST-PRICE RULE ───────────────────────────────────────────────────
 * A STOCK position's paintable level is its cost price. An OPTION position's
 * cost price is a PREMIUM — painting 0.02 on a TSLA chart trading at ~420 is
 * a lie with an axis. The option's honest level on the UNDERLYING's chart is
 * its STRIKE, with the premium confessed in the label. That normalization
 * happens HERE, once, so no chart can make the premium-as-price mistake.
 *
 * ── PRIVACY ─────────────────────────────────────────────────────────────────
 * Account ids, position ids and leg ids never leave the server. The receipt
 * carries symbols, quantities and price levels only.
 *
 * Request paths come from WEBULL_SDK_CONTRACT (one owner, cited) — see
 * webullSdkContract.ts for why that is a law and what it cost to learn.
 */

import { randomUUID } from "crypto";
import { buildWebullSignedHeaders, readWebullErrorCode } from "@/lib/marketData/adapters/webullMarketData";
import { settleWebullRefusal } from "@/lib/marketData/webullSessionRejection";
import { WEBULL_SDK_CONTRACT } from "@/lib/marketData/webullSdkContract";
import {
  TOKEN_DISPOSITIONS,
  ensureWebullAccessToken,
  inMemoryTokenStore,
  type WebullTokenStore,
  sessionAwaitsHuman,
} from "@/lib/marketData/webullAccessToken";
import type { WebullBrokerConfig } from "./webullBrokerConnection";

const DEFAULT_HOST = "api.webull.com";
const ACCOUNT_LIST_PATH = WEBULL_SDK_CONTRACT.ACCOUNT_LIST.path;
const ACCOUNT_POSITIONS_PATH = WEBULL_SDK_CONTRACT.ACCOUNT_POSITIONS.path;

export type WebullPositionsState =
  | "OBSERVED"
  | "NO_POSITIONS"
  | "UNCONFIGURED"
  | "AWAITING_2FA"
  | "BLOCKED_AUTH"
  | "ACCESS_UNPROVEN"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "TIMEOUT"
  | "UNAVAILABLE";

/** One broker position, normalized to what a chart may honestly paint. */
export interface WebullPaintablePosition {
  /** Underlying symbol — the chart this position belongs on. */
  readonly symbol: string;
  readonly instrumentType: "STOCK" | "OPTION" | "OTHER";
  /** Signed-as-reported quantity, parsed from Webull's string. */
  readonly quantity: number;
  /**
   * The price LEVEL a chart of the underlying may paint:
   * STOCK → cost price. OPTION → strike. Never an option premium.
   */
  readonly paintLevel: number;
  /** The raw cost price as Webull reported it (premium for options). */
  readonly costPrice: number;
  /** Present only for options; drives the honest label. */
  readonly option?: {
    readonly type: "CALL" | "PUT";
    readonly strike: number;
    readonly expireDate: string;
    readonly multiplier: number;
  };
}

export interface WebullPositionsReceipt {
  readonly provider: "webull";
  readonly state: WebullPositionsState;
  readonly positions: readonly WebullPaintablePosition[];
  readonly accountsQueried: number;
  readonly checkedAt: string;
  readonly note: string;
}

function cleanHost(host: string | undefined): string {
  return (host || DEFAULT_HOST).replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function isoSeconds(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function rowsOf(payload: unknown): readonly Record<string, unknown>[] | null {
  const validate = (rows: readonly unknown[]) =>
    rows.every((row) => row !== null && typeof row === "object")
      ? (rows as readonly Record<string, unknown>[])
      : null;
  if (Array.isArray(payload)) return validate(payload);
  if (!payload || typeof payload !== "object") return null;
  const envelope = payload as { data?: unknown; result?: unknown };
  const rows = Array.isArray(envelope.data) ? envelope.data : Array.isArray(envelope.result) ? envelope.result : null;
  return rows ? validate(rows) : null;
}

/**
 * One measured row → one paintable position, or null when the row cannot be
 * normalized HONESTLY (an option without a parsable strike has no truthful
 * level on the underlying's chart — omitting it is the honest move; inventing
 * a level is not).
 */
export function normalizeWebullPositionRow(row: Record<string, unknown>): WebullPaintablePosition | null {
  const symbol = typeof row.symbol === "string" ? row.symbol.trim().toUpperCase() : "";
  if (!symbol) return null;
  const quantity = asFiniteNumber(row.quantity);
  const costPrice = asFiniteNumber(row.cost_price ?? row.costPrice);
  if (quantity === null || costPrice === null) return null;

  const rawType = typeof row.instrument_type === "string" ? row.instrument_type.trim().toUpperCase() : "";
  if (rawType === "OPTION") {
    const legs = Array.isArray(row.legs) ? (row.legs as readonly unknown[]) : [];
    const leg = legs.find((candidate): candidate is Record<string, unknown> =>
      Boolean(candidate) && typeof candidate === "object");
    const strike = leg ? asFiniteNumber(leg.option_exercise_price) : null;
    const optionType = leg && typeof leg.option_type === "string" ? leg.option_type.trim().toUpperCase() : "";
    const expireDate = leg && typeof leg.option_expire_date === "string" ? leg.option_expire_date : "";
    if (strike === null || (optionType !== "CALL" && optionType !== "PUT") || !expireDate) return null;
    return {
      symbol,
      instrumentType: "OPTION",
      quantity,
      paintLevel: strike,
      costPrice,
      option: {
        type: optionType,
        strike,
        expireDate,
        multiplier: (leg ? asFiniteNumber(leg.option_contract_multiplier) : null) ?? 100,
      },
    };
  }

  return {
    symbol,
    instrumentType: rawType === "STOCK" || rawType === "EQUITY" ? "STOCK" : rawType ? "OTHER" : "STOCK",
    quantity,
    paintLevel: costPrice,
    costPrice,
  };
}

const defaultTokenStore = inMemoryTokenStore();

/**
 * Signed read of every account's positions, aggregated. Read-only: this
 * module can prove what is HELD; it can never place, modify or close anything.
 */
export async function probeWebullPositions(
  fetchImpl: typeof fetch,
  config: WebullBrokerConfig = {},
): Promise<WebullPositionsReceipt> {
  const appKey = config.appKey?.trim();
  const appSecret = config.appSecret?.trim();
  const checkedAt = isoSeconds((config.now || (() => new Date()))());
  const receipt = (
    state: WebullPositionsState,
    note: string,
    positions: readonly WebullPaintablePosition[] = [],
    accountsQueried = 0,
  ): WebullPositionsReceipt => ({ provider: "webull", state, positions, accountsQueried, checkedAt, note });

  if (!appKey || !appSecret) {
    return receipt("UNCONFIGURED", "The Webull Trading API credential pair is not configured together in this runtime.");
  }

  const host = cleanHost(config.apiHost);
  let sessionToken = config.accessToken?.trim();
  let sessionNote = "";
  if (config.mintSession !== false) {
    const session = await ensureWebullAccessToken(
      fetchImpl,
      { appKey, appSecret, apiHost: host, timeoutMs: config.timeoutMs, now: config.now, nonce: config.nonce, authModeReader: config.authModeReader },
      config.tokenStore ?? defaultTokenStore,
    );
    sessionNote = session.note;
    if (sessionAwaitsHuman(session.disposition)) {
      return receipt("AWAITING_2FA", session.note);
    }
    if (session.token?.token) sessionToken = session.token.token;
  }

  const timeoutMs = Math.max(250, Math.min(30_000, config.timeoutMs ?? 8_000));
  const nonceOf = config.nonce || (() => randomUUID().replace(/-/g, ""));

  const signedGet = async (
    path: string,
    apiVersion: string,
    query: Readonly<Record<string, string>>,
  ): Promise<{ readonly response: Response } | { readonly failure: WebullPositionsReceipt }> => {
    const headers = buildWebullSignedHeaders({
      path,
      query,
      appKey,
      appSecret,
      host,
      timestamp: checkedAt,
      nonce: nonceOf(),
      apiVersion,
      profile: "legacy-sha1",
    });
    if (sessionToken) headers["x-access-token"] = sessionToken;
    const search = Object.keys(query).length
      ? `?${new URLSearchParams(query).toString()}`
      : "";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(`https://${host}${path}${search}`, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        headers,
        signal: controller.signal,
      });
    } catch {
      return {
        failure: controller.signal.aborted
          ? receipt("TIMEOUT", `Webull Trading API did not respond within ${timeoutMs} ms.`)
          : receipt("UNAVAILABLE", "Webull Trading API could not be reached."),
      };
    } finally {
      clearTimeout(timer);
    }
    if (response.status === 401) {
      // If Webull NAMED the session (INVALID_TOKEN), retire it so the next
      // read mints instead of re-sending it — see webullSessionRejection.ts.
      let retirement = "";
      if (config.mintSession !== false && sessionToken) {
        const providerCode = await readWebullErrorCode(response).catch(() => null);
        const verdict = await settleWebullRefusal(config.tokenStore ?? defaultTokenStore, {
          httpStatus: 401,
          providerCode,
          sessionToken,
          nowMs: (config.now || (() => new Date()))().getTime(),
        });
        if (verdict.kind !== "NOT_SESSION") retirement = ` ${verdict.note}`;
      }
      return {
        failure: receipt(
          "BLOCKED_AUTH",
          (sessionNote
            ? `Webull rejected the signed request with HTTP 401. ${sessionNote}`
            : "Webull rejected the signed request with HTTP 401, and WM Pro minted no session for it to reject.") + retirement,
        ),
      };
    }
    if (response.status === 403 || response.status === 417) {
      return { failure: receipt("ACCESS_UNPROVEN", `Webull rejected the signed request with HTTP ${response.status}; the failed permission edge was not proven.`) };
    }
    if (response.status === 429) {
      return { failure: receipt("RATE_LIMITED", "Webull rate-limited the bounded positions read.") };
    }
    if (!response.ok) {
      return { failure: receipt(response.status >= 500 ? "PROVIDER_ERROR" : "UNAVAILABLE", `Webull Trading API returned HTTP ${response.status}.`) };
    }
    return { response };
  };

  const accountsResult = await signedGet(ACCOUNT_LIST_PATH, WEBULL_SDK_CONTRACT.ACCOUNT_LIST.apiVersion, {});
  if ("failure" in accountsResult) return accountsResult.failure;
  let accountRows: readonly Record<string, unknown>[] | null;
  try {
    accountRows = rowsOf(await accountsResult.response.json());
  } catch {
    accountRows = null;
  }
  if (!accountRows) return receipt("PROVIDER_ERROR", "Webull returned an unrecognized account-list envelope.");
  const accountIds = accountRows
    .map((row) => row.account_id ?? row.accountId)
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0);
  if (accountIds.length === 0) {
    return receipt("NO_POSITIONS", "Webull accepted the signed request but returned no accounts available to OpenAPI.");
  }

  const positions: WebullPaintablePosition[] = [];
  for (const accountId of accountIds) {
    const positionsResult = await signedGet(
      ACCOUNT_POSITIONS_PATH,
      WEBULL_SDK_CONTRACT.ACCOUNT_POSITIONS.apiVersion,
      { account_id: accountId, page_size: "100" },
    );
    if ("failure" in positionsResult) return positionsResult.failure;
    let rows: readonly Record<string, unknown>[] | null;
    try {
      rows = rowsOf(await positionsResult.response.json());
    } catch {
      rows = null;
    }
    if (!rows) return receipt("PROVIDER_ERROR", "Webull returned an unrecognized positions envelope.");
    for (const row of rows) {
      const normalized = normalizeWebullPositionRow(row);
      if (normalized) positions.push(normalized);
    }
  }

  if (positions.length === 0) {
    return receipt(
      "NO_POSITIONS",
      "Signed read succeeded across all accounts; no paintable positions are held.",
      [],
      accountIds.length,
    );
  }
  return receipt(
    "OBSERVED",
    `Signed read proved ${positions.length} paintable position${positions.length === 1 ? "" : "s"} across ${accountIds.length} account${accountIds.length === 1 ? "" : "s"}.`,
    positions,
    accountIds.length,
  );
}
