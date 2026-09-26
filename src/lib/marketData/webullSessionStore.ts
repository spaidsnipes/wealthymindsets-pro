/**
 * ONE Webull session per runtime, shared by every lane that signs a request.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * If the broker lane and the data lane each kept their own store, they would
 * each mint their own session, and each mint that lands PENDING costs the
 * Founder a separate 2FA tap in the Webull app. Two lanes, two prompts, for
 * one account. Sharing the store means the first lane to mint pays the cost
 * and the second lane reuses the result.
 *
 * ── What this is NOT ────────────────────────────────────────────────────────
 *
 * It is NOT durable. The session lives in the module scope of one Worker
 * isolate. Cloudflare evicts isolates, and a fresh isolate starts with nothing
 * held, so it mints again — which means another 2FA tap if Webull answers
 * PENDING. That is a real cost and it is named here rather than discovered.
 *
 * The fix is a KV namespace or a Durable Object bound in `wrangler.jsonc`, and
 * `WebullTokenStore` is an interface precisely so that swap is a one-line
 * change at this seam. It is deliberately NOT done silently in the same commit
 * that changes how sessions are obtained: provisioning a namespace is a
 * Founder-visible infrastructure change, and burying it under a code fix is
 * how infrastructure stops being reviewable.
 *
 * What this DOES already fix is the thing that cost three months: a session is
 * now minted from the App Key and Secret, which never expire, instead of read
 * from a value someone had to keep re-entering by hand.
 */
import { inMemoryTokenStore, type WebullTokenStore } from "./webullAccessToken";
import { kvTokenStore, type WebullKvNamespace } from "./webullKvTokenStore";

const isolateStore = inMemoryTokenStore();

/**
 * Where the KV binding is looked for. Mirrors `wrangler.jsonc`'s binding name;
 * a Sentinel keeps the two honest.
 */
export const WEBULL_SESSION_KV_BINDING = "WEBULL_SESSION";

function bindingFrom(env: unknown): WebullKvNamespace | null {
  if (!env || typeof env !== "object") return null;
  const candidate = (env as Record<string, unknown>)[WEBULL_SESSION_KV_BINDING];
  if (!candidate || typeof candidate !== "object") return null;
  const kv = candidate as Partial<WebullKvNamespace>;
  // Duck-typed on the two methods actually used. A binding of the wrong TYPE
  // (an R2 bucket, a stray var) must read as absent rather than blow up on
  // first use inside a request.
  return typeof kv.get === "function" && typeof kv.put === "function"
    ? (candidate as WebullKvNamespace)
    : null;
}

/**
 * The store every Webull lane should pass to `ensureWebullAccessToken`.
 *
 * Durable when the KV namespace is bound, isolate-local when it is not. The
 * fallback is deliberate and must stay: an unprovisioned namespace should cost
 * durability, not availability — the Webull lanes still answer honestly, they
 * just cannot remember across an isolate. See webullKvTokenStore.ts for the
 * measured loop that makes the durable path necessary.
 */
export function webullSessionStore(env?: unknown): WebullTokenStore {
  const kv = bindingFrom(env);
  return kv ? kvTokenStore(kv) : isolateStore;
}

/** True when this runtime can remember a session past isolate eviction. */
export function webullSessionIsDurable(env?: unknown): boolean {
  return bindingFrom(env) !== null;
}

/**
 * The Worker env, or undefined when there isn't one.
 *
 * `getCloudflareContext` throws outside the Workers runtime — under vitest, and
 * under `next dev` without the Cloudflare proxy. Letting that throw would mean
 * a route that works in production 500s on a laptop, so absence is caught and
 * returned as "no binding", which the store already handles by falling back to
 * the isolate-local path.
 *
 * Imported lazily for the same reason: a top-level import of a Workers-only
 * module pulls runtime assumptions into every test that touches these routes.
 */
export async function webullWorkerEnv(): Promise<unknown> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    return getCloudflareContext().env;
  } catch {
    return undefined;
  }
}

/**
 * THE SESSION SEAM EVERY WEBULL LANE MUST GO THROUGH.
 *
 * ── The defect this closes ──────────────────────────────────────────────────
 *
 * The entitlement probe learned to mint a session. The DATA lane did not. It
 * read `WEBULL_ACCESS_TOKEN` straight out of the environment and signed with
 * it, which is the exact category error that cost this project three months:
 * that variable holds a SESSION, not a secret, and a session pasted into a
 * deployment platform is dead by the time it matters.
 *
 * The consequence was nastier than a plain outage. The probe would report the
 * honest verdict on one lane while the chart's own tick read 401'd on another,
 * so the two lanes could disagree about the same account — and a 401 on the
 * data lane reads to every human as "market data is not subscribed". We would
 * have shipped the entitlement fix and still shown an empty chart, and then
 * gone looking at the Founder's subscription AGAIN.
 *
 * So the resolution lives here, once, and a lane that wants to sign a Webull
 * request asks this function instead of reading the environment.
 *
 * ── Why it returns AWAITING_2FA instead of throwing ─────────────────────────
 *
 * A session that needs the Founder's tap in the Webull app is not a failure;
 * it is a named, actionable state with exactly one human step. Collapsing it
 * into a generic auth error is how a one-tap fix becomes another week of
 * guessing. Callers must render it as itself.
 */
export interface WebullResolvedSession {
  /** The minted session value. Absent means no request should be signed. */
  readonly accessToken?: string;
  /** True when Webull is waiting on the Founder's approval in the app. */
  readonly awaiting2fa: boolean;
  /** Human-readable state, safe to show. Never contains the token value. */
  readonly note: string;
}

export async function resolveWebullSessionToken(
  fetchImpl: typeof fetch,
  config: {
    readonly appKey?: string;
    readonly appSecret?: string;
    readonly apiHost?: string;
    readonly timeoutMs?: number;
  },
  store: WebullTokenStore,
): Promise<WebullResolvedSession> {
  const appKey = config.appKey?.trim();
  const appSecret = config.appSecret?.trim();
  if (!appKey || !appSecret) {
    return { awaiting2fa: false, note: "Webull App Key and App Secret are not both configured, so no session can be minted." };
  }

  const { ensureWebullAccessToken, sessionAwaitsHuman } = await import("./webullAccessToken");
  const session = await ensureWebullAccessToken(
    fetchImpl,
    { appKey, appSecret, apiHost: config.apiHost, timeoutMs: config.timeoutMs },
    store,
  );

  // AWAITING_2FA and REAUTH_HELD alike: the next step is a human's, so no
  // lane may sign a request that can only be refused. The note names the step.
  if (sessionAwaitsHuman(session.disposition)) {
    return { awaiting2fa: true, note: session.note };
  }
  return session.token?.token
    ? { accessToken: session.token.token, awaiting2fa: false, note: session.note }
    : { awaiting2fa: false, note: session.note };
}

/**
 * How durable the session actually is, in words a surface may print.
 *
 * This was a CONSTANT. A constant could only ever describe one of the two
 * worlds, so the day the namespace is bound it would start telling the Founder
 * he may be asked to tap again when he no longer can be — the same untruth as
 * before, just pointing the other way. It now READS the binding, so the
 * sentence cannot drift from the deployment that prints it.
 */
export function webullSessionDurability(env?: unknown): string {
  return webullSessionIsDurable(env)
    ? "The Webull session is stored durably, so it survives this server instance being recycled. Approving once in the Webull app is enough."
    : "The Webull session is held in this server instance only. If the instance is recycled, WM Pro mints a new one automatically — which may ask you to approve it once in the Webull app.";
}
