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

const isolateStore = inMemoryTokenStore();

/** The store every Webull lane should pass to `ensureWebullAccessToken`. */
export function webullSessionStore(): WebullTokenStore {
  return isolateStore;
}

/**
 * How durable the session actually is, in words a surface may print.
 *
 * Exported so no component has to guess, and so the sentence changes in ONE
 * place on the day a durable binding lands. A surface that hard-codes
 * "session persisted" today would be lying tomorrow in the other direction.
 */
export const WEBULL_SESSION_DURABILITY =
  "The Webull session is held in this server instance only. If the instance is recycled, WM Pro mints a new one automatically — which may ask you to approve it once in the Webull app.";
