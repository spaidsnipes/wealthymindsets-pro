/**
 * ISOLATES "our request is wrong" FROM "the data package is missing".
 *
 * A single endpoint returning MARKET_DATA_NOT_SUBSCRIBED cannot tell those two
 * apart, and guessing between them has already cost this project real time: the
 * Founder was told to buy a subscription when the actual defect was our own
 * malformed tick path. This probe exists so that never happens again.
 *
 * It walks a LADDER of three Webull endpoints that share one host, one
 * credential pair, and one signing contract, and differ only in what they are
 * gated on:
 *
 *   1. ACCOUNTS   /trading/accounts/list                    (no market data)
 *   2. PROFILES   /trading/instruments/stocks/profiles/list (instrument metadata)
 *   3. SNAPSHOT   /market-data/stocks/snapshots/list        (market data)
 *   4. TICKS      /market-data/stocks/ticks/list            (market data)
 *
 * The READING is the whole point, and it is mechanical:
 *
 *   - rungs 1-2 OK, rungs 3-4 denied  -> auth/signing/host/contract are proven
 *     good, and the market-data entitlement is the isolated gap. ONLY in this
 *     shape may anyone say the account needs a data package.
 *   - every rung denied               -> the credential or signing contract is
 *     the suspect. Do NOT blame the operator's subscription.
 *   - rungs 1-2 denied, 3-4 OK        -> incoherent; report it rather than
 *     smoothing it into a story.
 *
 * It computes the shape, never the purchase advice. And it deliberately cannot
 * report a payload: only HTTP status and the provider's own short code, so
 * credentials, signatures and upstream prose cannot leak into a browser scene.
 *
 * ── THE CONFOUND THIS FILE SHIPPED WITH, AND WHY IT IS FIXED HERE ───────────
 *
 * Every rung above was signed `legacy-sha1`, hard-coded, and the verdict then
 * announced that "signing, host, path and credentials are therefore proven
 * good". Read the ladder again with the paths in view:
 *
 *   ACCOUNTS  /trading/*      OK       sha1 proven here
 *   PROFILES  /trading/*      OK       sha1 proven here
 *   SNAPSHOT  /market-data/*  403      sha1 NEVER proven here
 *   TICKS     /market-data/*  403      sha1 NEVER proven here
 *
 * The two rungs that pass and the two that fail are split by path prefix, and
 * the signing profile was constant across the split. So "signing is good" was
 * generalised from the only rungs where it could not be tested against the only
 * rungs that matter. Webull's own SDK signs HMAC-SHA256 unconditionally
 * (`default_signature_composer.py:62` force-overwrites the signer), which makes
 * "market-data rejects sha1" a live, untested hypothesis — not a stretch.
 *
 * This matters more than a wording nit because of who pays for it. The output
 * of this probe is the input to "tell the Founder to buy a data package", and
 * that sentence has already cost three months once. A verdict may not name his
 * subscription while a variable we control is still uncontrolled.
 *
 * So each market-data rung is now climbed under EVERY signing profile, each
 * receipt CARRIES the profile it was signed with, and ENTITLEMENT_ISOLATED is
 * unreachable until the denials hold across all of them.
 */
import { randomUUID } from "crypto";
import { buildWebullSignedHeaders } from "./adapters/webullMarketData";
import { WEBULL_SIGNING_PROFILES, type WebullSigningProfile } from "./webullSigningCanary";
import { WEBULL_SDK_CONTRACT, type WebullEndpointContract } from "./webullSdkContract";
import {
  TOKEN_DISPOSITIONS,
  ensureWebullAccessToken,
  type WebullTokenStore,
} from "./webullAccessToken";

const DEFAULT_HOST = "api.webull.com";

/**
 * Rung names carry no signing profile. The profile is a FIELD on the receipt,
 * not a suffix on the name, because a name is a label and a field is evidence:
 * `SNAPSHOT` climbed twice yields two receipts that differ in exactly the
 * variable under test, and the reader cannot mistake one for the other.
 */
export type WebullRungName = "ACCOUNTS" | "PROFILES" | "SNAPSHOT" | "TICKS";

/** Whether a rung is gated on a market-data entitlement. Drives the verdict. */
export type WebullRungGate = "NON_MARKET_DATA" | "MARKET_DATA";

export type WebullRungOutcome =
  | "OK"
  | "DENIED_AUTH"
  | "DENIED_ENTITLEMENT"
  | "DENIED_OTHER"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "TIMEOUT"
  | "UNAVAILABLE";

export interface WebullRungReceipt {
  readonly rung: WebullRungName;
  readonly gate: WebullRungGate;
  /**
   * How THIS request was signed. Not optional: an unlabelled receipt is exactly
   * how the sha1/market-data confound hid in plain sight for four rungs.
   */
  readonly signingProfile: WebullSigningProfile;
  readonly outcome: WebullRungOutcome;
  readonly httpStatus: number | null;
  /** The provider's own short code, uppercased. Never prose, never a payload. */
  readonly providerCode: string | null;
}

export type WebullEntitlementVerdict =
  /**
   * A session was minted and is waiting on the Founder's 2FA tap in the Webull
   * app. Deliberately NOT folded into UNCONFIGURED: that word says something
   * is missing from the deployment, and nothing is. The distinction is the
   * whole difference between "tap approve" and "go buy a data package".
   */
  | "AWAITING_2FA"
  | "ENTITLEMENT_ISOLATED"
  | "CREDENTIAL_OR_CONTRACT_SUSPECT"
  | "FULLY_OPEN"
  | "INCOHERENT"
  | "INCONCLUSIVE"
  | "UNCONFIGURED";

export interface WebullEntitlementReport {
  readonly provider: "webull";
  readonly verdict: WebullEntitlementVerdict;
  readonly rungs: readonly WebullRungReceipt[];
  readonly checkedAt: string;
  readonly note: string;
}

interface RungSpec {
  readonly rung: WebullRungName;
  readonly gate: WebullRungGate;
  readonly signingProfile: WebullSigningProfile;
  readonly path: string;
  readonly apiVersion: string;
  readonly query: Readonly<Record<string, string>>;
}

/**
 * The rungs, built from the SINGLE path owner. The gate is derived from
 * `needsMarketData` rather than restated here on purpose: if the ladder's own
 * idea of which rungs are gated could drift from the contract, every verdict it
 * produces would be arguable, and an arguable verdict is what this file exists
 * to abolish.
 */
function rungSpec(
  rung: WebullRungName,
  contract: WebullEndpointContract,
  query: Readonly<Record<string, string>>,
  signingProfile: WebullSigningProfile,
): RungSpec {
  return {
    rung,
    gate: contract.needsMarketData ? "MARKET_DATA" : "NON_MARKET_DATA",
    signingProfile,
    path: contract.path,
    apiVersion: contract.apiVersion,
    query,
  };
}

/**
 * The non-market-data rungs keep `legacy-sha1` DELIBERATELY. That was a
 * separate, measured decision — v2 ACCOUNT_LIST answers under sha1 and is the
 * rung currently proving the broker lane is alive. Re-signing it here to tidy
 * the table would risk the one thing on this ladder that already works.
 *
 * The market-data rungs are climbed once per profile, so the split that hid the
 * confound (passing rungs on one profile, failing rungs on the same profile,
 * never compared) can no longer form.
 */
export function webullRungSpecs(symbol: string): readonly RungSpec[] {
  const symbols = symbol.toUpperCase();
  const instrument = { category: "US_STOCK", symbols };
  const ticks = { category: "US_STOCK", count: "5", symbol: symbols };
  return [
    rungSpec("ACCOUNTS", WEBULL_SDK_CONTRACT.ACCOUNT_LIST, {}, "legacy-sha1"),
    rungSpec("PROFILES", WEBULL_SDK_CONTRACT.STOCK_PROFILES, instrument, "legacy-sha1"),
    ...WEBULL_SIGNING_PROFILES.flatMap((profile) => [
      rungSpec("SNAPSHOT", WEBULL_SDK_CONTRACT.STOCK_SNAPSHOTS, instrument, profile),
      rungSpec("TICKS", WEBULL_SDK_CONTRACT.STOCK_TICKS, ticks, profile),
    ]),
  ];
}

/** Pulls only a short uppercase code out of a provider body. Never prose. */
export function extractProviderCode(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  for (const key of ["code", "error_code", "errorCode", "msg_code"]) {
    const value = record[key];
    if (typeof value === "string" && /^[A-Z][A-Z0-9_]{2,63}$/.test(value.trim().toUpperCase())) {
      return value.trim().toUpperCase();
    }
  }
  return null;
}

/**
 * Maps one HTTP status + provider code to a rung outcome. Entitlement is only
 * claimed when the provider itself names a subscription/entitlement code — a
 * bare 403 is DENIED_OTHER, because a 403 alone does not distinguish "you did
 * not buy this" from "you asked wrong".
 */
export function classifyRung(status: number, providerCode: string | null): WebullRungOutcome {
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_ERROR";
  if (status === 401) return "DENIED_AUTH";
  if (status === 403 || status === 417) {
    return providerCode && /(SUBSCRIB|ENTITLE|PERMISSION_DENIED|NOT_PURCHASE)/.test(providerCode)
      ? "DENIED_ENTITLEMENT"
      : "DENIED_OTHER";
  }
  if (status >= 200 && status < 300) return "OK";
  return "UNAVAILABLE";
}

const DENIED: ReadonlySet<WebullRungOutcome> = new Set<WebullRungOutcome>([
  "DENIED_AUTH",
  "DENIED_ENTITLEMENT",
  "DENIED_OTHER",
]);

/**
 * The ladder reading. Pure, so the verdict is testable without a network and
 * cannot drift from the rungs it claims to summarise.
 */
export function readWebullLadder(rungs: readonly WebullRungReceipt[]): {
  readonly verdict: WebullEntitlementVerdict;
  readonly note: string;
} {
  const open = rungs.filter((rung) => rung.outcome === "OK");
  const denied = rungs.filter((rung) => DENIED.has(rung.outcome));
  // Anything neither open nor denied (timeout, 5xx, rate limit) means the
  // ladder did not actually run. Refuse to grade a partial climb.
  if (open.length + denied.length !== rungs.length || rungs.length === 0) {
    return {
      verdict: "INCONCLUSIVE",
      note: "At least one rung neither succeeded nor was denied, so the ladder proves nothing. Re-run before drawing any conclusion.",
    };
  }

  const nonData = rungs.filter((rung) => rung.gate === "NON_MARKET_DATA");
  const data = rungs.filter((rung) => rung.gate === "MARKET_DATA");
  const allNonDataOpen = nonData.length > 0 && nonData.every((rung) => rung.outcome === "OK");
  const allDataOpen = data.length > 0 && data.every((rung) => rung.outcome === "OK");
  const allNonDataDenied = nonData.length > 0 && nonData.every((rung) => DENIED.has(rung.outcome));
  const allDataDenied = data.length > 0 && data.every((rung) => DENIED.has(rung.outcome));

  if (allNonDataOpen && allDataOpen) {
    return { verdict: "FULLY_OPEN", note: "Every rung returned data. Market data is reachable with the configured credentials." };
  }
  /**
   * SIGNING MUST BE CONTROLLED FOR BEFORE ENTITLEMENT MAY BE NAMED.
   *
   * The passing rungs live on `/trading/*` and the failing ones on
   * `/market-data/*`. If both were signed the same way, "signing is proven"
   * never crossed the split it claims to have crossed. This gate makes the
   * claim cost something: every signing profile we know how to send must have
   * been tried and denied on the market-data gate.
   */
  const dataProfiles = new Set(data.map((rung) => rung.signingProfile));
  const signingControlled = WEBULL_SIGNING_PROFILES.every((profile) => dataProfiles.has(profile));

  if (allNonDataOpen && allDataDenied) {
    if (!signingControlled) {
      const tried = [...dataProfiles].sort().join(", ") || "none";
      return {
        verdict: "INCONCLUSIVE",
        note: `Market-data rungs were denied, but only under the signing profile(s): ${tried}. The rungs that succeeded are on a different path prefix, so signing has not been tested where it fails. Re-run across every signing profile before reading this as an entitlement gap — and do not ask anyone to buy a data package on this evidence.`,
      };
    }
    return {
      verdict: "ENTITLEMENT_ISOLATED",
      note: `Non-market-data rungs returned data over the same host and credentials, while every market-data rung was denied under every signing profile tried (${WEBULL_SIGNING_PROFILES.join(", ")}). Signing is therefore controlled for rather than assumed, and the market-data entitlement is the isolated remaining gap.`,
    };
  }

  /**
   * The outcome this whole change exists to be able to SEE: market data opens
   * under one signing profile and is denied under another. That is not an
   * entitlement gap at all, it is our own signature — and under the old
   * hard-coded ladder it was invisible by construction.
   */
  const dataOpenProfiles = new Set(data.filter((rung) => rung.outcome === "OK").map((rung) => rung.signingProfile));
  if (allNonDataOpen && dataOpenProfiles.size > 0 && !allDataOpen) {
    return {
      verdict: "INCOHERENT",
      note: `Market data answered under signing profile(s) ${[...dataOpenProfiles].sort().join(", ")} and was denied under another. The gap is our signing contract, not a subscription: send the profile that answered.`,
    };
  }
  if (allNonDataDenied && allDataDenied) {
    return {
      verdict: "CREDENTIAL_OR_CONTRACT_SUSPECT",
      note: "Every rung was denied, including rungs that need no market data. The credential pair or signing contract is the suspect. This is NOT evidence that a market-data subscription is missing.",
    };
  }
  if (allDataOpen && allNonDataDenied) {
    return {
      verdict: "INCOHERENT",
      note: "Market-data rungs succeeded while non-market-data rungs were denied. That ordering is not explainable by an entitlement gap; report it rather than interpreting it.",
    };
  }
  return {
    verdict: "INCONCLUSIVE",
    note: "Rungs within the same gate disagreed with each other, so no single cause is isolated. Inspect the per-rung codes.",
  };
}

async function climbRung(
  fetchImpl: typeof fetch,
  spec: RungSpec,
  creds: { appKey: string; appSecret: string; accessToken?: string; host: string },
  timestamp: string,
  nonce: string,
  timeoutMs: number,
): Promise<WebullRungReceipt> {
  const base = { rung: spec.rung, gate: spec.gate, signingProfile: spec.signingProfile } as const;
  const headers = buildWebullSignedHeaders({
    path: spec.path,
    query: spec.query,
    appKey: creds.appKey,
    appSecret: creds.appSecret,
    host: creds.host,
    timestamp,
    nonce,
    apiVersion: spec.apiVersion,
    profile: spec.signingProfile,
  });
  if (creds.accessToken) headers["x-access-token"] = creds.accessToken;

  const url = new URL(`https://${creds.host}${spec.path}`);
  Object.entries(spec.query).forEach(([key, value]) => url.searchParams.set(key, value));

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error("rung deadline exceeded"));
    }, timeoutMs);
  });

  try {
    let response: Response;
    try {
      response = await Promise.race([
        fetchImpl(url, { method: "GET", redirect: "manual", cache: "no-store", headers, signal: controller.signal }),
        deadline,
      ]);
    } catch {
      return {
        ...base,
        outcome: controller.signal.aborted ? "TIMEOUT" : "UNAVAILABLE",
        httpStatus: null,
        providerCode: null,
      };
    }

    let providerCode: string | null = null;
    try {
      providerCode = extractProviderCode(await Promise.race([response.json(), deadline]));
    } catch {
      providerCode = null;
    }
    return { ...base, outcome: classifyRung(response.status, providerCode), httpStatus: response.status, providerCode };
  } finally {
    clearTimeout(timeout!);
  }
}

export interface WebullEntitlementProbeConfig {
  readonly appKey?: string;
  readonly appSecret?: string;
  /** Fallback only. The intended source is a minted session — see below. */
  readonly accessToken?: string;
  readonly apiHost?: string;
  readonly symbol?: string;
  readonly timeoutMs?: number;
  readonly now?: () => Date;
  readonly nonce?: () => string;
  /** Where the minted session lives. Omit and the ladder climbs unminted. */
  readonly tokenStore?: WebullTokenStore;
  /** Set false to climb with exactly the session handed in. */
  readonly mintSession?: boolean;
}

export async function probeWebullEntitlement(
  fetchImpl: typeof fetch,
  config: WebullEntitlementProbeConfig = {},
): Promise<WebullEntitlementReport> {
  const appKey = config.appKey?.trim();
  const appSecret = config.appSecret?.trim();
  const checkedAt = (config.now || (() => new Date()))().toISOString().replace(/\.\d{3}Z$/, "Z");

  if (!appKey || !appSecret) {
    return {
      provider: "webull",
      verdict: "UNCONFIGURED",
      rungs: [],
      checkedAt,
      note: "The Webull credential pair is not configured together in this runtime, so no rung was attempted.",
    };
  }

  const host = (config.apiHost || DEFAULT_HOST).replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const timeoutMs = Math.max(250, Math.min(30_000, config.timeoutMs ?? 8_000));
  const makeNonce = config.nonce || (() => randomUUID().replace(/-/g, ""));

  /**
   * Climb with a LIVING session or the ladder is unreadable.
   *
   * This probe exists to distinguish "your key cannot reach market data" from
   * "your key cannot reach anything". A stale session makes every rung fail
   * including the two that need no data package, which reads as
   * CREDENTIAL_OR_CONTRACT_SUSPECT — and that reading is only admissible once
   * the session we sent was known-live. Otherwise the ladder is measuring our
   * own expired token and reporting it as a fact about the Founder's account.
   */
  let sessionToken = config.accessToken?.trim() || undefined;
  let sessionNote: string | null = null;
  if (config.mintSession !== false && config.tokenStore) {
    const session = await ensureWebullAccessToken(
      fetchImpl,
      { appKey, appSecret, apiHost: host, timeoutMs: config.timeoutMs, now: config.now, nonce: config.nonce },
      config.tokenStore,
    );
    if (session.disposition === TOKEN_DISPOSITIONS.AWAITING_2FA) {
      return {
        provider: "webull",
        verdict: "AWAITING_2FA",
        rungs: [],
        checkedAt,
        // Not a subscription question. Climbing now would produce four 401s
        // and we would read them as a ladder verdict about his entitlements.
        note: session.note,
      };
    }
    if (session.token?.token) sessionToken = session.token.token;
    else sessionNote = session.note;
  }

  const creds = { appKey, appSecret, accessToken: sessionToken, host };

  // Sequential on purpose: a burst of signed requests is the fastest way to
  // earn a rate limit, and a rate-limited rung makes the ladder unreadable.
  const rungs: WebullRungReceipt[] = [];
  for (const spec of webullRungSpecs(config.symbol?.trim() || "TSLA")) {
    rungs.push(await climbRung(fetchImpl, spec, creds, checkedAt, makeNonce(), timeoutMs));
  }

  const { verdict, note } = readWebullLadder(rungs);
  // A ladder climbed without a session is still worth reporting, but the
  // reason it had none must travel with the verdict — otherwise a failed mint
  // is read back as a fact about the Founder's entitlements.
  return {
    provider: "webull",
    verdict,
    rungs,
    checkedAt,
    note: sessionNote ? `${note} No session accompanied this climb: ${sessionNote}` : note,
  };
}
