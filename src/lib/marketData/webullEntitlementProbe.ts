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
 *     good, and the market-data entitlement is the isolated gap. THE GAP BELONGS
 *     TO THE APP KEY, NOT THE ACCOUNT — see below. NO shape of this ladder
 *     licenses telling the operator to buy a data package.
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
 * receipt CARRIES the profile it was signed with, and
 * APP_KEY_ENTITLEMENT_ISOLATED is unreachable until the denials hold across all
 * of them.
 *
 * ── WHO THE GAP BELONGS TO. MEASURED 2026-09-21, AFTER ALL OF THE ABOVE ─────
 *
 * The ladder did its job: it got the shape down to "market data is the isolated
 * gap". Then it stopped, because a ladder can only ever isolate BY ELIMINATION,
 * and the last step — "therefore it is the operator's subscription" — was an
 * inference, not a reading. It was also wrong, and it is the inference that cost
 * three months.
 *
 * The measurement that settled it: `/market-data/stocks/ticks/list` — the exact
 * rung 4 this ladder is denied on — returned live tick-by-tick trades, with
 * aggressor side, for the SAME three accounts, at the same time, through a
 * Webull client the Founder had authorized by GRANT rather than by app key.
 *
 * So all three of these are simultaneously true:
 *   - the account holds real-time market data (proven, not assumed);
 *   - our request is byte-for-byte the SDK's (path, v3, GET, all four params);
 *   - our request is refused.
 *
 * The only variable left is WHICH CLIENT IS ASKING. Market data attaches to the
 * calling identity, and WM Pro's OpenAPI app key is a different identity from
 * the account. That is a developer-portal fact about OUR app registration, and
 * it is fixable by us or by the Founder in one place — not at a checkout.
 */
import type { WebullAuthModeReader } from "@/lib/marketData/webullAuthMode";
import { randomUUID } from "crypto";
import { buildWebullSignedHeaders } from "./adapters/webullMarketData";
import { WEBULL_SIGNING_PROFILES, type WebullSigningProfile } from "./webullSigningCanary";
import { WEBULL_SDK_CONTRACT, type WebullEndpointContract } from "./webullSdkContract";
import {
  TOKEN_DISPOSITIONS,
  ensureWebullAccessToken,
  type WebullTokenStore,
  sessionAwaitsHuman,
} from "./webullAccessToken";

const DEFAULT_HOST = "api.webull.com";

/**
 * Rung names carry no signing profile. The profile is a FIELD on the receipt,
 * not a suffix on the name, because a name is a label and a field is evidence:
 * `SNAPSHOT` climbed twice yields two receipts that differ in exactly the
 * variable under test, and the reader cannot mistake one for the other.
 */
/**
 * SUBSCRIPTIONS is a name, not a ladder rung: `webullRungSpecs` never returns
 * it, so it cannot reach `readWebullLadder` and cannot move a verdict. It exists
 * only so the out-of-band subscription read can reuse the signed-request path
 * without a second, drifting copy of it.
 */
export type WebullRungName =
  | "ACCOUNTS"
  | "PROFILES"
  | "SNAPSHOT"
  | "TICKS"
  | "SUBSCRIPTIONS"
  /** The no-subscription control rung. Out-of-band — see `WebullEntitlementReport.crypto`. */
  | "CRYPTO_SNAPSHOT"
  /** The streaming lane. Out-of-band like SUBSCRIPTIONS — see `WebullStreamingProbe`. */
  | "STREAMING_SUBSCRIBE"
  | "STREAMING_UNSUBSCRIBE";

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
  /**
   * THE SUBJECT IS IN THE NAME ON PURPOSE.
   *
   * This verdict used to be called `ENTITLEMENT_ISOLATED`, which is true and
   * useless: it names a gap without naming WHOSE. Every human who read it —
   * for three months — supplied the missing noun themselves, and every one of
   * them supplied "the Founder's account". He was then sent to buy data he
   * already owned.
   *
   * MEASURED 2026-09-21, and this is what forced the rename. The SAME endpoint
   * this ladder is denied on (`/market-data/stocks/ticks/list`) returned live
   * tick-by-tick trades — with aggressor side — for the SAME three accounts,
   * through a Webull client the Founder had authorized by grant rather than by
   * app key. The account carries real-time L1 data. The ladder's own request
   * matches the SDK byte-for-byte, and the denial survives every signing
   * profile, so neither the contract nor the signature is the gap.
   *
   * What is left is the CALLING IDENTITY: the OpenAPI app key WM Pro signs
   * with is a different subject from the account, and market data attaches to
   * the subject. So this verdict means "the app key we sign with is the
   * isolated gap" — a developer-portal fact — and it may never again be
   * rendered as a sentence about the operator's purchases.
   */
  | "APP_KEY_ENTITLEMENT_ISOLATED"
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
  /**
   * Webull's own answer to "what is this app subscribed to". Absent when no
   * session was available to ask with. It NEVER participates in `verdict` —
   * see `WebullSubscriptionInventory`.
   */
  readonly subscriptions?: WebullSubscriptionInventory;
  /**
   * Webull's answer on its REAL-TIME product, as opposed to the REST pull
   * product every rung measures. Like `subscriptions`, it NEVER participates in
   * `verdict` — see `WebullStreamingProbe` for why that restraint is deliberate.
   */
  readonly streaming?: WebullStreamingProbe;
  /**
   * BTCUSD snapshot, once per signing profile. Webull documents crypto as
   * needing no market-data subscription, so this is the control that splits
   * "this key reads no market data" from "this key lacks the stock package".
   * Out-of-band: it NEVER participates in `verdict`.
   */
  readonly crypto?: readonly WebullRungReceipt[];
}

interface RungSpec {
  readonly rung: WebullRungName;
  readonly gate: WebullRungGate;
  readonly signingProfile: WebullSigningProfile;
  readonly path: string;
  readonly apiVersion: string;
  readonly query: Readonly<Record<string, string>>;
  readonly method: "GET" | "POST";
  /**
   * The EXACT bytes sent, when there are any.
   *
   * One string, not an object, because Webull signs the body: the signature
   * covers a digest of this text, so the thing hashed and the thing sent must be
   * the same serialization. Keeping an object here and stringifying twice is how
   * a key-order or whitespace difference becomes a 403 that reads like a billing
   * problem — the exact misreading this file exists to abolish.
   */
  readonly body?: string;
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
  body?: unknown,
): RungSpec {
  return {
    rung,
    gate: contract.needsMarketData ? "MARKET_DATA" : "NON_MARKET_DATA",
    signingProfile,
    path: contract.path,
    apiVersion: contract.apiVersion,
    query,
    method: contract.method ?? "GET",
    // Serialized ONCE, here, so the signed digest and the sent bytes are the
    // same characters. `JSON.stringify` with no spacing matches the SDK's
    // `common.json_dumps_compact`.
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
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
      verdict: "APP_KEY_ENTITLEMENT_ISOLATED",
      note: `Non-market-data rungs returned data over the same host and credentials, while every market-data rung was denied under every signing profile tried (${WEBULL_SIGNING_PROFILES.join(", ")}). Signing is therefore controlled for rather than assumed, and the request matches the SDK. The isolated gap is market data on the OpenAPI APP KEY WM Pro signs with — not the account. MEASURED 2026-09-21: the same endpoint returned live ticks for the same accounts through a grant-authorized Webull client, so the account's own market data is not in question. DOCUMENTED by Webull (Market Data API overview and the API Keys page, read 2026-09-26): market-data subscriptions bought in the Webull app or desktop are independent of OpenAPI; OpenAPI stock data is its own Non-Display subscription (Nasdaq Basic L1 or TotalView L2), options, futures and order flow each have their own, and crypto and event contracts need none. Adding one is the operator's decision, and Non-Display licensing also decides whether that data may be drawn on a chart at all — this reading does not make that decision for anyone.`,
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

/**
 * The receipt, plus the parsed body.
 *
 * The body stays INSIDE this module. `WebullRungReceipt` is what ships to the
 * client, and a provider payload that rides along in a field nobody reads is
 * how payloads end up rendered. Only the subscription reader touches it, and
 * only after `summarizeWebullSubscriptionBody` has reduced it to scalars.
 */
async function climbRungWithBody(
  fetchImpl: typeof fetch,
  spec: RungSpec,
  creds: { appKey: string; appSecret: string; accessToken?: string; host: string },
  timestamp: string,
  nonce: string,
  timeoutMs: number,
): Promise<{ readonly receipt: WebullRungReceipt; readonly body: unknown }> {
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
    body: spec.body,
  });
  if (creds.accessToken) headers["x-access-token"] = creds.accessToken;
  // Only when there IS one. Declaring a JSON content type on a GET changes the
  // request shape for every rung that currently answers, and this probe's whole
  // value is that the rungs differ in one variable at a time.
  if (spec.body !== undefined) headers["Content-Type"] = "application/json";

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
        fetchImpl(url, {
          method: spec.method,
          redirect: "manual",
          cache: "no-store",
          headers,
          signal: controller.signal,
          ...(spec.body === undefined ? {} : { body: spec.body }),
        }),
        deadline,
      ]);
    } catch {
      return {
        receipt: {
          ...base,
          outcome: controller.signal.aborted ? "TIMEOUT" : "UNAVAILABLE",
          httpStatus: null,
          providerCode: null,
        },
        body: null,
      };
    }

    let body: unknown = null;
    let providerCode: string | null = null;
    try {
      body = await Promise.race([response.json(), deadline]);
      providerCode = extractProviderCode(body);
    } catch {
      body = null;
      providerCode = null;
    }
    return {
      receipt: { ...base, outcome: classifyRung(response.status, providerCode), httpStatus: response.status, providerCode },
      body,
    };
  } finally {
    clearTimeout(timeout!);
  }
}

async function climbRung(
  fetchImpl: typeof fetch,
  spec: RungSpec,
  creds: { appKey: string; appSecret: string; accessToken?: string; host: string },
  timestamp: string,
  nonce: string,
  timeoutMs: number,
): Promise<WebullRungReceipt> {
  return (await climbRungWithBody(fetchImpl, spec, creds, timestamp, nonce, timeoutMs)).receipt;
}

/**
 * ── ASK, DON'T INFER ────────────────────────────────────────────────────────
 *
 * The ladder isolates an entitlement gap BY ELIMINATION. Even when every
 * variable we control has been eliminated, "therefore it is his subscription"
 * remains an inference — and that inference is precisely what cost three months
 * the first time. `/app/subscriptions/list` asks Webull the question instead.
 *
 * It is deliberately NOT a ladder rung. A rung participates in the verdict, so
 * an unknown response shape or an unrelated 404 on this endpoint would rewrite
 * a market-data reading that has nothing to do with it. This is a receipt that
 * travels ALONGSIDE the verdict and can never change it.
 */
export interface WebullSubscriptionInventory {
  readonly outcome: WebullRungOutcome;
  readonly httpStatus: number | null;
  readonly providerCode: string | null;
  /** Scalar-only, key-filtered rows. Never the raw payload. */
  readonly rows: readonly Readonly<Record<string, string>>[];
}

/**
 * Keys we refuse to carry out of a provider payload, whatever the shape.
 *
 * Two families, and the second one is the easy one to forget. Credentials are
 * obvious. IDENTITY is not: an account number or an email in a subscription row
 * is not a secret exactly, but it is also not an entitlement, and this report
 * gets read, pasted and screenshotted while someone debugs. A field that cannot
 * answer "is market data attached to this app" has no business travelling.
 */
const SECRETISH_KEY = /(token|secret|password|credential|signature|app_?key|account|user|email|phone|uuid)/i;

/**
 * Pulls subscription rows out of a body whose shape we have NOT seen.
 *
 * Written defensively on purpose: we are reading this endpoint for the first
 * time against a live account, and the failure mode to avoid is a summariser
 * that throws — or worse, that dumps an unknown payload into a report the
 * Founder reads. Scalars only, key-filtered, bounded.
 */
export function summarizeWebullSubscriptionBody(body: unknown): readonly Readonly<Record<string, string>>[] {
  const candidates: unknown[] = [];
  const visit = (value: unknown, depth: number): void => {
    if (depth > 3 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      candidates.push(...value);
      return;
    }
    for (const nested of Object.values(value as Record<string, unknown>)) visit(nested, depth + 1);
  };
  visit(body, 0);

  /**
   * Flattened with dotted keys rather than scalars-at-the-top-level-only.
   *
   * MEASURED, not guessed: the first live read of this endpoint returned three
   * rows carrying nothing but `subscription_id`, because everything that says
   * WHAT each subscription is lives one level down. A summariser that keeps only
   * top-level scalars turns the one endpoint that could answer the question into
   * three opaque numbers — which is how a read like this quietly becomes useless
   * while still looking like it worked.
   */
  const flatten = (value: unknown, prefix: string, depth: number, into: Record<string, string>): void => {
    if (depth > 2 || Object.keys(into).length > 40) return;
    if (!value || typeof value !== "object") return;
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SECRETISH_KEY.test(key)) continue;
      const name = (prefix ? `${prefix}.${key}` : key).slice(0, 64);
      if (typeof nested === "string" || typeof nested === "number" || typeof nested === "boolean") {
        into[name] = String(nested).slice(0, 96);
      } else if (Array.isArray(nested)) {
        nested.slice(0, 8).forEach((item, index) => {
          if (item && typeof item === "object") flatten(item, `${name}.${index}`, depth + 1, into);
          else if (item !== null && item !== undefined) into[`${name}.${index}`] = String(item).slice(0, 96);
        });
      } else {
        flatten(nested, name, depth + 1, into);
      }
    }
  };

  return candidates
    .slice(0, 25)
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const row: Record<string, string> = {};
      flatten(entry, "", 0, row);
      return Object.keys(row).length > 0 ? row : null;
    })
    .filter((row): row is Record<string, string> => row !== null);
}

/**
 * ── ASK THE REAL-TIME DOOR, NOT THE PULL DOOR ───────────────────────────────
 *
 * The ladder measures `/market-data/stocks/*` — Webull's REST PULL product. Its
 * real-time product is a different thing entirely: `data_streaming_client.py`
 * opens an MQTT socket to `data-api.webull.com` and receives QUOTE / SNAPSHOT /
 * TICK pushes there. WM Pro has never sent a single request to that lane.
 *
 * So for three months the evidence said "the market-data door is locked" when
 * what it actually measured was ONE market-data door, and not the one that
 * carries real time. The Founder's own research says his account has real-time
 * data. Both can be true at once, and this receipt is how we find out.
 *
 * `/market-data/streaming/subscribe` is the HTTP half of that lane, which makes
 * it the cheapest possible test: one signed POST, no socket, no MQTT client in a
 * Worker. If it answers, real time is entitled and our pull-lane denial was
 * never the question. If it is denied under every signing profile too, then the
 * denial finally spans both products and means something it never meant before.
 *
 * ── WHY IT IS OUT-OF-BAND, LIKE SUBSCRIPTIONS ───────────────────────────────
 *
 * It is NOT a ladder rung. The ladder's verdict vocabulary describes one product
 * and would mangle this: a streaming OK next to pull denials would compile to
 * `INCOHERENT` — "the gap is our signing contract, send the profile that
 * answered" — which is a confidently wrong sentence about a different endpoint.
 * A receipt that travels alongside the verdict can report the split honestly
 * without the verdict pretending to have understood it. If this measures OK in
 * production, the verdict vocabulary gets redesigned WITH the evidence in hand.
 */
export interface WebullStreamingAttempt {
  readonly signingProfile: WebullSigningProfile;
  readonly outcome: WebullRungOutcome;
  readonly httpStatus: number | null;
  readonly providerCode: string | null;
}

export interface WebullStreamingProbe {
  readonly attempts: readonly WebullStreamingAttempt[];
  /** True when at least one signing profile got a 2xx from the streaming lane. */
  readonly reachable: boolean;
  /** How many of the subscriptions this probe opened it also released. */
  readonly released: number;
  readonly note: string;
}

/**
 * Reads the attempts. Pure, so the sentence the Founder eventually sees is
 * testable and cannot drift from the receipts it claims to summarise.
 */
export function readWebullStreamingLane(
  attempts: readonly WebullStreamingAttempt[],
  pullDenied: boolean,
): { readonly reachable: boolean; readonly note: string } {
  const opened = attempts.filter((attempt) => attempt.outcome === "OK");
  if (attempts.length === 0) {
    return { reachable: false, note: "The streaming lane was not asked." };
  }
  if (opened.length > 0) {
    const profiles = [...new Set(opened.map((a) => a.signingProfile))].sort().join(", ");
    return {
      reachable: true,
      note: pullDenied
        ? `Webull ACCEPTED a real-time streaming subscription under signing profile(s) ${profiles}, on the same credentials whose REST pull reads were denied. Those are two different products. The real-time entitlement is present and the denial above concerns the pull product only — nobody may be told to buy market data on this evidence.`
        : `Webull accepted a real-time streaming subscription under signing profile(s) ${profiles}.`,
    };
  }
  const denied = attempts.filter((a) => DENIED.has(a.outcome));
  if (denied.length !== attempts.length) {
    return {
      reachable: false,
      note: "At least one streaming attempt neither succeeded nor was denied, so this receipt proves nothing about the real-time lane. Re-run it.",
    };
  }
  const codes = [...new Set(denied.map((a) => a.providerCode).filter(Boolean))].join(", ") || "no code";
  return {
    reachable: false,
    note: `The real-time streaming lane was denied under every signing profile tried (${codes}). This is the FIRST evidence that covers Webull's real-time product rather than only its REST pull product.`,
  };
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
  /** Who says whether a session token is required at all. Tests inject one. */
  readonly authModeReader?: WebullAuthModeReader;
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
      { appKey, appSecret, apiHost: host, timeoutMs: config.timeoutMs, now: config.now, nonce: config.nonce, authModeReader: config.authModeReader },
      config.tokenStore,
    );
    if (sessionAwaitsHuman(session.disposition)) {
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

  /**
   * Asked LAST, and never allowed to fail the climb. This read exists to make
   * the message we eventually send the Founder quotable rather than inferred;
   * if it errors, the ladder above is still a complete measurement on its own.
   */
  let subscriptions: WebullSubscriptionInventory | undefined;
  try {
    const askSubscriptions = (query: Readonly<Record<string, string>>) =>
      climbRungWithBody(
        fetchImpl,
        rungSpec("SUBSCRIPTIONS", WEBULL_SDK_CONTRACT.APP_SUBSCRIPTIONS, query, "legacy-sha1"),
        creds,
        checkedAt,
        makeNonce(),
        timeoutMs,
      );

    /**
     * ── DO NOT RE-ADD THE `subscription_id` EXPANSION ───────────────────────
     *
     * MEASURED in production, twice, 2026-09-21. This endpoint returns rows
     * carrying `subscription_id` AND NOTHING ELSE — no package name, no tier,
     * no status, at any nesting depth. The obvious next move is the SDK's
     * `set_subscription_id` (get_app_subscriptions.py), so it was built and
     * shipped. Asking for a specific id returns THE SAME ID-ONLY LIST; the
     * filter is ignored and no detail exists to fetch.
     *
     * So the count is the only signal here: this app key has N subscriptions.
     * Which packages they are cannot be read from the API, and any claim about
     * what they contain has to come from the developer portal instead. Writing
     * that down because the expansion looks obviously correct on paper and will
     * be reinvented by the next reader otherwise — it cost three extra signed
     * requests per probe and returned duplicates of the same id.
     */
    const { receipt, body } = await askSubscriptions({});
    subscriptions = {
      outcome: receipt.outcome,
      httpStatus: receipt.httpStatus,
      providerCode: receipt.providerCode,
      rows: receipt.outcome === "OK" ? summarizeWebullSubscriptionBody(body) : [],
    };
  } catch {
    subscriptions = undefined;
  }

  const { verdict, note } = readWebullLadder(rungs);

  let crypto: WebullRungReceipt[] | undefined;
  try {
    const receipts: WebullRungReceipt[] = [];
    for (const profile of WEBULL_SIGNING_PROFILES) {
      receipts.push(await climbRung(
        fetchImpl,
        rungSpec("CRYPTO_SNAPSHOT", WEBULL_SDK_CONTRACT.CRYPTO_SNAPSHOTS, { category: "US_CRYPTO", symbols: "BTCUSD" }, profile),
        creds,
        checkedAt,
        makeNonce(),
        timeoutMs,
      ));
    }
    crypto = receipts;
  } catch {
    crypto = undefined;
  }

  /**
   * The real-time door, asked once per signing profile, and never allowed to
   * fail the climb above. Same restraint as the subscription read: this is a
   * receipt, not a rung.
   */
  let streaming: WebullStreamingProbe | undefined;
  try {
    const symbols = [config.symbol?.trim().toUpperCase() || "TSLA"];
    const attempts: WebullStreamingAttempt[] = [];
    let released = 0;
    for (const profile of WEBULL_SIGNING_PROFILES) {
      // A fresh id per attempt. Reusing one would let a subscription opened
      // under the first profile make the second look accepted when it was not.
      const sessionId = makeNonce();
      const { receipt } = await climbRungWithBody(
        fetchImpl,
        rungSpec(
          "STREAMING_SUBSCRIBE",
          WEBULL_SDK_CONTRACT.STREAMING_SUBSCRIBE,
          {},
          profile,
          { session_id: sessionId, symbols, category: "US_STOCK", sub_types: ["QUOTE", "SNAPSHOT", "TICK"] },
        ),
        creds,
        checkedAt,
        makeNonce(),
        timeoutMs,
      );
      attempts.push({
        signingProfile: profile,
        outcome: receipt.outcome,
        httpStatus: receipt.httpStatus,
        providerCode: receipt.providerCode,
      });

      /**
       * PUT BACK WHAT WE TOOK. An accepted subscribe binds symbols to a session
       * id that no MQTT socket will ever attach to, and a diagnostic that leaks
       * one dangling subscription per run will eventually be the reason the
       * real lane hits a limit — at which point the limit gets read as an
       * entitlement problem. That is this file's whole failure mode, rehearsed.
       */
      if (receipt.outcome === "OK") {
        const release = await climbRungWithBody(
          fetchImpl,
          rungSpec(
            "STREAMING_UNSUBSCRIBE",
            WEBULL_SDK_CONTRACT.STREAMING_UNSUBSCRIBE,
            {},
            profile,
            { session_id: sessionId, unsubscribe_all: true },
          ),
          creds,
          checkedAt,
          makeNonce(),
          timeoutMs,
        ).catch(() => null);
        if (release?.receipt.outcome === "OK") released += 1;
      }
    }
    const marketDataDenied = rungs
      .filter((rung) => rung.gate === "MARKET_DATA")
      .every((rung) => DENIED.has(rung.outcome));
    const read = readWebullStreamingLane(attempts, marketDataDenied);
    streaming = { attempts, reachable: read.reachable, released, note: read.note };
  } catch {
    streaming = undefined;
  }

  // A ladder climbed without a session is still worth reporting, but the
  // reason it had none must travel with the verdict — otherwise a failed mint
  // is read back as a fact about the Founder's entitlements.
  return {
    provider: "webull",
    verdict,
    rungs,
    checkedAt,
    note: sessionNote ? `${note} No session accompanied this climb: ${sessionNote}` : note,
    ...(subscriptions ? { subscriptions } : {}),
    ...(streaming ? { streaming } : {}),
    ...(crypto ? { crypto } : {}),
  };
}
