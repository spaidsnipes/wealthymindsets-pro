/**
 * THE WEBULL SESSION KEEPER — what keeps the session alive when nobody is here.
 *
 * Garden Pass 12 §14, the Founder-phone kill test: the Founder must be able to
 * turn his phone off and go to sleep without making WM Pro wait for him before
 * another user can get lawful market data.
 *
 * The auth mode is measured, not assumed: an approved Webull OpenAPI app (App
 * Key + App Secret, HMAC-signed requests) plus a minted session token that
 * Webull holds PENDING until one 2FA approval in the Webull app, and that
 * `REFRESH_TOKEN` extends without a new approval (`webullAccessToken.ts`,
 * `webullSdkContract.ts`). So the ONLY step that needs the Founder is the first
 * approval of a session. Every step after that is machine work.
 *
 * Before this module the machine work happened only inside a user's request —
 * `ensureWebullAccessToken` renews when something asks. A quiet night longer
 * than the token's life therefore let it expire, and the next visitor's
 * request minted a fresh one: a 2FA prompt on a sleeping Founder's phone and a
 * market-data lane that waits for him. That is the wrong architecture by the
 * kill test's own words.
 *
 * This runs from the worker's scheduled trigger instead, and it obeys one rule
 * that the request path does not need:
 *
 *   IT NEVER MINTS A NEW SESSION.
 *
 * Every CREATE sends an approval prompt to a human. A cron that minted on an
 * expired session would page the Founder every fifteen minutes all night and
 * never be approved — the exact storm `ensureWebullAccessToken` refuses to
 * cause on the request path. So the keeper only ever does the three things
 * that need no human: leave a fresh session alone, EXTEND a living one, and
 * ASK whether a pending approval has landed (so a tap made at 3 a.m. is
 * observed at 3:15, not whenever the next visitor happens by). A session that
 * is gone is reported as REAUTH_REQUIRED — a named state with one human step —
 * and left for a person.
 *
 * Pure apart from the injected fetch and store. Reads no secret itself.
 */

import {
  TOKEN_DISPOSITIONS,
  WEBULL_TOKEN_STATUSES,
  checkWebullAccessToken,
  mintWebullAccessToken,
  tokenDisposition,
  type WebullAccessToken,
  type WebullTokenConfig,
  type WebullTokenStore,
} from "./webullAccessToken";
import { WEBULL_AUTH_MODES, readWebullAuthMode, type WebullAuthMode } from "./webullAuthMode";

/** How often the worker's cron fires. Mirrors `wrangler.jsonc` `triggers.crons`. */
export const KEEPER_INTERVAL_MS = 15 * 60_000;

/**
 * Renew when less than this is left. Three cron intervals, so two consecutive
 * failed runs (a Webull blip, a cold start) still leave one more chance before
 * the session dies.
 */
export const KEEPER_REFRESH_MARGIN_MS = 3 * KEEPER_INTERVAL_MS;

export const KEEPER_OUTCOMES = {
  /** Nothing to do: the session outlives the next three runs. */
  STILL_FRESH: "STILL_FRESH",
  /** Extended with REFRESH_TOKEN. No human was asked. */
  REFRESHED: "REFRESHED",
  /** A pending session was approved in the Webull app; it is now usable. */
  APPROVAL_OBSERVED: "APPROVAL_OBSERVED",
  /** Still waiting on the one 2FA approval. Not a fault. */
  AWAITING_2FA: "AWAITING_2FA",
  /** No living session. Needs one approval, which the keeper will not request. */
  REAUTH_REQUIRED: "REAUTH_REQUIRED",
  /** Webull did not extend a living session this run. It is retried next run. */
  REFRESH_FAILED: "REFRESH_FAILED",
  /** App Key / App Secret are not configured on this deployment. */
  NOT_CONFIGURED: "NOT_CONFIGURED",
  /**
   * Webull says 2FA is OFF for this App Key (`token_check_enabled: false`):
   * requests are signed with the key pair alone, so there is no session to
   * keep and nothing that can ever wait on a phone. The healthy end state.
   */
  TOKEN_NOT_REQUIRED: "TOKEN_NOT_REQUIRED",
} as const;

export type KeeperOutcome = (typeof KEEPER_OUTCOMES)[keyof typeof KEEPER_OUTCOMES];

export interface KeeperResult {
  readonly outcome: KeeperOutcome;
  /** Safe to show and to persist. Never contains a token value. */
  readonly note: string;
  /** Milliseconds of life left on the session after this run, when known. */
  readonly expiresInMs?: number;
  /** When this run happened. */
  readonly atMs: number;
  /**
   * What Webull said this run about whether a session is needed at all
   * (`/openapi/config`). Absent only when the keys are not configured.
   */
  readonly authMode?: WebullAuthMode;
  /**
   * The broker lane, read by the scheduled job right after a run that left a
   * usable path (or no path needed). The account COUNT only — never an id,
   * a balance or a token. This is what lets production prove itself without
   * anyone's browser: `wrangler kv key get` on the record.
   */
  readonly broker?: {
    readonly state: string;
    readonly accountCount: number;
    readonly atMs: number;
  };
  /**
   * The capability matrix, measured by the entitlement ladder on the same run:
   * each market-data read as `profile:OUTCOME(CODE)`. Stocks and crypto are
   * separate lines on purpose — Webull documents crypto as needing no
   * subscription, so the pair separates "this key reads no market data" from
   * "this key lacks the stock package". Statuses and codes only.
   */
  readonly capabilities?: {
    readonly verdict: string;
    readonly stocks: string;
    readonly crypto: string;
    readonly atMs: number;
  };
  /**
   * GP12 §38 — the periodic reconciliation: every account's open orders at
   * Webull against WM's durable order ledger (webullOrderLedgerKv). Counts
   * only. NONE_PERSISTED means the book is empty — WM has placed no Webull
   * order — so every open order is EXTERNAL (placed in the Webull app or
   * another tool): a fact, not an alarm.
   */
  readonly reconciliation?: {
    readonly state: "OK" | "PARTIAL" | "FAILED" | "REJECTED" | "NO_ANSWER";
    readonly accounts: number;
    readonly openOrders: number;
    readonly external: number;
    /**
     * WM's own SUBMITTING / SUBMISSION_UNKNOWN rows absent from Webull's open
     * lists — each needs the exact client-order lookup; never concluded here.
     */
    readonly unresolved: number;
    /** What WM compared against: the durable KV book, an empty one, or none readable. */
    readonly ledger: "KV" | "NONE_PERSISTED" | "UNREADABLE";
    readonly atMs: number;
  };
}

function remaining(token: WebullAccessToken | null, nowMs: number): number | undefined {
  return token?.expiresAtMs === undefined ? undefined : token.expiresAtMs - nowMs;
}

export async function keepWebullSessionAlive(
  fetchImpl: typeof fetch,
  config: WebullTokenConfig,
  store: WebullTokenStore,
): Promise<KeeperResult> {
  const nowMs = (config.now || (() => new Date()))().getTime();

  if (!config.appKey?.trim() || !config.appSecret?.trim()) {
    return {
      outcome: KEEPER_OUTCOMES.NOT_CONFIGURED,
      note: "Webull App Key and App Secret are not both configured, so there is no session to keep.",
      atMs: nowMs,
    };
  }

  /**
   * FIRST QUESTION EVERY RUN: DOES THIS KEY NEED A SESSION AT ALL?
   *
   * Asked fresh each run (not from a cache), because this record is where the
   * Founder's unticking of "Enable 2FA Verification" first becomes visible.
   * With 2FA off there is nothing to keep, and REAUTH_REQUIRED on a dead
   * token would be a false alarm about a credential nobody needs.
   */
  const reading = await (config.authModeReader ?? readWebullAuthMode)(fetchImpl, config);
  if (reading.mode === WEBULL_AUTH_MODES.TOKENLESS) {
    return { outcome: KEEPER_OUTCOMES.TOKEN_NOT_REQUIRED, note: reading.note, atMs: nowMs, authMode: reading.mode };
  }
  const kept = await keepHeldSession(fetchImpl, config, store, nowMs);
  return { ...kept, authMode: reading.mode };
}

async function keepHeldSession(
  fetchImpl: typeof fetch,
  config: WebullTokenConfig,
  store: WebullTokenStore,
  nowMs: number,
): Promise<KeeperResult> {
  const held = await store.read();

  if (!held) {
    return {
      outcome: KEEPER_OUTCOMES.REAUTH_REQUIRED,
      note: "No Webull session is held. The next market-data request will start one, and it needs one approval in the Webull app. The keeper does not start sessions, because each start pages a human.",
      atMs: nowMs,
    };
  }

  const disposition = tokenDisposition(held, nowMs, KEEPER_REFRESH_MARGIN_MS);

  if (disposition === TOKEN_DISPOSITIONS.USABLE) {
    /**
     * VERIFY, DON'T TRUST THE CLOCK.
     *
     * A session can die long before its stored expiry: Webull documents
     * INVALID for "No API calls made for 15 consecutive days, or Token does
     * not exist" — the second clause covers a session replaced or revoked
     * elsewhere. Measured 2026-09-26: the store said ~14 days left at 18:00Z
     * and Webull had the session INVALID by 02:45Z, and nothing recorded when
     * or why. Asking `/auth/tokens/check` each run records the moment it dies,
     * and is itself an API call, so a quiet fortnight cannot idle it out.
     */
    const checked = await checkWebullAccessToken(fetchImpl, config, held.token);
    if (checked.token && checked.token.status !== WEBULL_TOKEN_STATUSES.NORMAL) {
      await store.write(checked.token);
      return {
        outcome: KEEPER_OUTCOMES.REAUTH_REQUIRED,
        note: `Webull reports the held session ${checked.token.status} although its stored expiry had not passed. A new one needs one SMS code entered in the Webull app, or unticking "Enable 2FA Verification" on the App Key removes the step for good.`,
        atMs: nowMs,
      };
    }
    return {
      outcome: KEEPER_OUTCOMES.STILL_FRESH,
      note: checked.token
        ? "The Webull session is live — Webull confirmed it this run — and outlives the next three keeper runs."
        : `The Webull session is live by its stored expiry and outlives the next three keeper runs. Webull could not confirm it this run (${checked.note}).`,
      expiresInMs: remaining(held, nowMs),
      atMs: nowMs,
    };
  }

  if (disposition === TOKEN_DISPOSITIONS.AWAITING_2FA) {
    const checked = await checkWebullAccessToken(fetchImpl, config, held.token);
    if (!checked.token) {
      return {
        outcome: KEEPER_OUTCOMES.AWAITING_2FA,
        note: `The Webull session is waiting on one approval in the Webull app. The keeper could not ask Webull this run (${checked.note}).`,
        atMs: nowMs,
      };
    }
    await store.write(checked.token);
    if (checked.token.status === WEBULL_TOKEN_STATUSES.NORMAL) {
      return {
        outcome: KEEPER_OUTCOMES.APPROVAL_OBSERVED,
        note: "The approval in the Webull app was observed. The session is now live.",
        expiresInMs: remaining(checked.token, nowMs),
        atMs: nowMs,
      };
    }
    if (checked.token.status === WEBULL_TOKEN_STATUSES.PENDING) {
      return {
        outcome: KEEPER_OUTCOMES.AWAITING_2FA,
        note: "The Webull session is still waiting on one approval in the Webull app.",
        atMs: nowMs,
      };
    }
    return {
      outcome: KEEPER_OUTCOMES.REAUTH_REQUIRED,
      note: "Webull retired the pending session before it was approved. A new one needs one approval; the keeper does not start it.",
      atMs: nowMs,
    };
  }

  // A session Webull itself rejected cannot be extended.
  if (held.status !== WEBULL_TOKEN_STATUSES.NORMAL) {
    return {
      outcome: KEEPER_OUTCOMES.REAUTH_REQUIRED,
      note: "Webull marked the held session invalid or expired. A new one needs one SMS code entered in the Webull app (the keeper does not start it), or unticking \"Enable 2FA Verification\" on the App Key removes the step for good.",
      atMs: nowMs,
    };
  }

  // NEEDS_REFRESH (inside the margin, or an expiry we could not read) and
  // NEEDS_MINT on a NORMAL session whose clock ran out: try to EXTEND. A
  // refresh asks no human, so it is always safe to attempt — and extending a
  // just-lapsed session is what spares the Founder a fresh approval.
  const refreshed = await mintWebullAccessToken(fetchImpl, config, held.token, "REFRESH_TOKEN");
  if (refreshed.token && refreshed.token.status === WEBULL_TOKEN_STATUSES.NORMAL) {
    await store.write(refreshed.token);
    return {
      outcome: KEEPER_OUTCOMES.REFRESHED,
      note: "The Webull session was extended. No approval was needed.",
      expiresInMs: remaining(refreshed.token, nowMs),
      atMs: nowMs,
    };
  }

  const lapsed = held.expiresAtMs !== undefined && nowMs >= held.expiresAtMs;
  return lapsed
    ? {
        outcome: KEEPER_OUTCOMES.REAUTH_REQUIRED,
        note: `The Webull session lapsed and could not be extended (${refreshed.note}). A new one needs one approval in the Webull app.`,
        atMs: nowMs,
      }
    : {
        outcome: KEEPER_OUTCOMES.REFRESH_FAILED,
        note: `Webull did not extend the session this run (${refreshed.note}). It is still live and the next run tries again.`,
        expiresInMs: remaining(held, nowMs),
        atMs: nowMs,
      };
}

/** Where the last keeper run is recorded, beside the session it keeps. */
export const WEBULL_KEEPER_RECORD_KEY = "webull:keeper:last:v1";
