/**
 * The scheduled job that runs the Webull session keeper.
 *
 * Called from `cloudflare-worker-entry.js`'s `scheduled()` handler, which the
 * `triggers.crons` entry in `wrangler.jsonc` fires every fifteen minutes. It
 * holds no logic of its own: it reads the deployment's Webull keys from the
 * worker env, hands the durable session store to `keepWebullSessionAlive`, and
 * records what happened beside the session so a surface can say so.
 *
 * It refuses to run on an isolate-local store. A cron keeping a session alive
 * in a throwaway isolate would report REFRESHED about a session no request
 * will ever read — a green light wired to nothing.
 */

import { webullDataConfigFromEnv } from "./adapters/webullMarketData";
import { webullSessionIsDurable, webullSessionStore, WEBULL_SESSION_KV_BINDING } from "./webullSessionStore";
import type { WebullKvNamespace } from "./webullKvTokenStore";
import {
  KEEPER_OUTCOMES,
  WEBULL_KEEPER_RECORD_KEY,
  keepWebullSessionAlive,
  type KeeperOutcome,
  type KeeperResult,
} from "./webullSessionKeeper";
import { probeWebullBrokerConnection } from "@/lib/broker/adapters/webullBrokerConnection";

/**
 * Outcomes after which a signed request has a path that needs nobody: a live
 * session, or no session required at all. Only these touch the broker lane,
 * and never with minting on — a scheduled job must not start a 2FA cycle.
 */
const LANE_READY: ReadonlySet<KeeperOutcome> = new Set<KeeperOutcome>([
  KEEPER_OUTCOMES.TOKEN_NOT_REQUIRED,
  KEEPER_OUTCOMES.STILL_FRESH,
  KEEPER_OUTCOMES.REFRESHED,
  KEEPER_OUTCOMES.APPROVAL_OBSERVED,
]);

/** A week: long enough to read after a quiet weekend, short enough to age out. */
const RECORD_TTL_SECONDS = 7 * 24 * 3600;

export async function runWebullSessionKeeper(
  env: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<KeeperResult | null> {
  if (!webullSessionIsDurable(env)) {
    console.log("[webull-keeper] skipped: no durable session store is bound");
    return null;
  }

  const strings: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") strings[key] = value;
  }
  const cfg = webullDataConfigFromEnv(strings);

  const store = webullSessionStore(env);
  const kept = await keepWebullSessionAlive(
    fetchImpl,
    { appKey: cfg.appKey ?? "", appSecret: cfg.appSecret ?? "", apiHost: cfg.apiHost },
    store,
  );

  // Prove the lane, not just the session: one account-list read, the same
  // rung /api/broker/webull/status climbs. Count only; minting stays off.
  let result: KeeperResult = kept;
  if (LANE_READY.has(kept.outcome)) {
    const session = kept.outcome === KEEPER_OUTCOMES.TOKEN_NOT_REQUIRED ? null : await store.read();
    const receipt = await probeWebullBrokerConnection(fetchImpl, {
      appKey: cfg.appKey,
      appSecret: cfg.appSecret,
      apiHost: cfg.apiHost,
      accessToken: session?.token,
      mintSession: false,
    });
    result = { ...kept, broker: { state: receipt.state, accountCount: receipt.accountCount, atMs: Date.now() } };
  }

  const kv = env[WEBULL_SESSION_KV_BINDING] as WebullKvNamespace;
  try {
    await kv.put(WEBULL_KEEPER_RECORD_KEY, JSON.stringify(result), { expirationTtl: RECORD_TTL_SECONDS });
  } catch {
    // The run itself stands; only its receipt was lost. Logged below either way.
  }

  // The outcome word only — never the note's upstream text, never a token.
  console.log(`[webull-keeper] ${result.outcome}${result.authMode ? ` auth=${result.authMode}` : ""}${result.broker ? ` broker=${result.broker.state}` : ""}`);
  return result;
}

/** Read the last keeper run for a status surface. Null when none is recorded. */
export async function readWebullKeeperRecord(env: unknown): Promise<KeeperResult | null> {
  if (!webullSessionIsDurable(env)) return null;
  const kv = (env as Record<string, unknown>)[WEBULL_SESSION_KV_BINDING] as WebullKvNamespace;
  try {
    const raw = await kv.get(WEBULL_KEEPER_RECORD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<KeeperResult>;
    const outcomes = Object.values(KEEPER_OUTCOMES) as string[];
    if (typeof parsed.outcome !== "string" || !outcomes.includes(parsed.outcome)) return null;
    if (typeof parsed.atMs !== "number" || typeof parsed.note !== "string") return null;
    return parsed as KeeperResult;
  } catch {
    return null;
  }
}
