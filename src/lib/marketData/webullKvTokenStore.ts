/**
 * A WEBULL SESSION THAT OUTLIVES ONE WORKER ISOLATE.
 *
 * ── The measured failure this closes ────────────────────────────────────────
 *
 * 2026-09-21, production, timestamps verbatim:
 *
 *   05:02:09  accessToken:true   "Session minted and PENDING your 2FA approval"
 *   05:02:19  accessToken:true   "Checked with Webull: still waiting"
 *   -- Founder approves the request in the Webull app --
 *   05:04:46  accessToken:FALSE  "Session minted and PENDING your 2FA approval"
 *   05:04:47  accessToken:false  "Checked with Webull: still waiting"
 *
 * `accessToken` flipping true -> false across those two minutes is the isolate
 * being evicted. The session he approved was held in the 05:02 isolate, which
 * no longer existed by 05:04. The 05:04 request found an empty store, minted a
 * BRAND NEW session, and sent him a BRAND NEW 2FA prompt.
 *
 * This was previously written down as costing "one extra tap". That was too
 * generous. An isolate can die in well under the time it takes a human to pick
 * up a phone, open an app and approve a request — so with an isolate-local
 * store there is no reliable sequence of events in which an approval is ever
 * observed. It is not a cost, it is a LOOP, and it is the same shape as the
 * three-month one: the Founder does the right thing and the system cannot see
 * it, so it asks him again.
 *
 * ── Why KV, and what is actually stored ─────────────────────────────────────
 *
 * The value here is a SESSION — it expires, it is refreshable, and it is
 * revocable from the Webull side. It is not the App Key or the App Secret;
 * those never expire and stay in the platform's encrypted secret store where
 * a human put them. Nothing a human types is written here, and nothing written
 * here is ever rendered on a surface.
 *
 * ── The refusal ─────────────────────────────────────────────────────────────
 *
 * Every read is validated through `parseTokenEnvelope`, the same parser used on
 * Webull's own responses. A malformed or partial record reads as null — meaning
 * "mint a fresh one" — rather than as a half-built token that a caller checking
 * only for truthiness would happily send. And a KV failure NEVER throws into the
 * request path: a storage outage must degrade to "no session held", which is
 * honest and self-correcting, not to a 500 on a page that only wanted to tell
 * the Founder what his wire is doing.
 */
import {
  parseTokenEnvelope,
  type WebullAccessToken,
  type WebullTokenStore,
} from "./webullAccessToken";

/**
 * The slice of Cloudflare's KVNamespace this store uses.
 *
 * Declared structurally rather than imported from a Workers types package so
 * this module stays testable with a plain object and carries no runtime
 * dependency on the Cloudflare ambient environment.
 */
export interface WebullKvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/** One session per deployment. Named, not derived, so it cannot drift. */
export const WEBULL_SESSION_KEY = "webull:session:v1";
/** When WM Pro last texted a code on its own (see AUTO_MINT_COOLDOWN_MS). */
export const WEBULL_AUTO_MINT_KEY = "webull:automint:last:v1";
/** When a HUMAN last asked for a code (see EXPLICIT_CODE_SPACING_MS). */
export const WEBULL_EXPLICIT_CODE_KEY = "webull:explicitcode:last:v1";

/**
 * Let KV expire the record on its own.
 *
 * A session that Webull has already retired is worth nothing, and leaving dead
 * tokens addressable is how a stale value gets served by something that forgot
 * to check `status`. The floor exists because KV rejects very short TTLs; the
 * ceiling keeps a token with an uninterpretable expiry from living forever.
 */
export const MIN_KV_TTL_SECONDS = 60;
export const MAX_KV_TTL_SECONDS = 24 * 3600;

export function kvTtlSeconds(token: WebullAccessToken, nowMs: number): number {
  if (token.expiresAtMs === undefined) return MAX_KV_TTL_SECONDS;
  const remaining = Math.ceil((token.expiresAtMs - nowMs) / 1000);
  // A generous pad past expiry: `tokenDisposition` still decides usability, and
  // holding a just-expired token lets the REFRESH path extend it rather than
  // starting a fresh 2FA cycle. Dropping it early is what forces a new prompt.
  return Math.min(MAX_KV_TTL_SECONDS, Math.max(MIN_KV_TTL_SECONDS, remaining + 3600));
}

/**
 * A durable store backed by a Cloudflare KV namespace.
 *
 * `now` is injected so expiry arithmetic is testable without faking the clock
 * globally, and so this file contains no hidden source of truth about time.
 */
export function kvTokenStore(
  kv: WebullKvNamespace,
  now: () => Date = () => new Date(),
): WebullTokenStore & {
  readLastExplicitCodeAt(): Promise<number | null>;
  writeLastExplicitCodeAt(atMs: number): Promise<void>;
} {
  return {
    async read() {
      let raw: string | null;
      try {
        raw = await kv.get(WEBULL_SESSION_KEY);
      } catch {
        // Storage is unreachable. "No session held" is the honest degraded
        // answer; throwing here would turn a KV blip into a broken page.
        return null;
      }
      if (!raw) return null;
      try {
        // Same parser as Webull's own responses: a record missing token,
        // expires or status is not a token, it is a hazard.
        return parseTokenEnvelope(JSON.parse(raw), now().getTime());
      } catch {
        return null;
      }
    },

    async write(token) {
      const nowMs = now().getTime();
      // Persisted in Webull's OWN envelope shape, not this module's internal
      // one. `expiresAtMs` and `expiryInterpretation` are DERIVED, and writing
      // a derivation back as if it were source is how a guess becomes a fact
      // that later readers stop questioning. Store what Webull said.
      const record = JSON.stringify({
        token: token.token,
        expires: token.expiresAtMs ?? 0,
        status: token.status,
      });
      try {
        await kv.put(WEBULL_SESSION_KEY, record, { expirationTtl: kvTtlSeconds(token, nowMs) });
      } catch {
        // Losing durability is bad; failing the Founder's request because we
        // could not write a cache is worse. The session still works for this
        // isolate, and the next request re-mints at worst.
      }
    },

    async readLastAutoMintAt() {
      try {
        const raw = await kv.get(WEBULL_AUTO_MINT_KEY);
        const at = raw === null ? NaN : Number(raw);
        return Number.isFinite(at) ? at : null;
      } catch {
        // Unreadable ledger: no throttle rather than no session.
        return null;
      }
    },

    async readLastExplicitCodeAt() {
      try {
        const raw = await kv.get(WEBULL_EXPLICIT_CODE_KEY);
        const at = raw === null ? NaN : Number(raw);
        return Number.isFinite(at) ? at : null;
      } catch {
        return null;
      }
    },

    async writeLastExplicitCodeAt(atMs) {
      try {
        await kv.put(WEBULL_EXPLICIT_CODE_KEY, String(Math.round(atMs)), { expirationTtl: 3600 });
      } catch {
        // The code was sent; losing the stamp only loosens the one-minute spacing.
      }
    },

    async writeLastAutoMintAt(atMs) {
      try {
        // Kept a day: long enough to outlive every cooldown, short enough to age out.
        await kv.put(WEBULL_AUTO_MINT_KEY, String(Math.round(atMs)), { expirationTtl: 24 * 3600 });
      } catch {
        // The code was already texted; losing the stamp only loosens the throttle.
      }
    },
  };
}
