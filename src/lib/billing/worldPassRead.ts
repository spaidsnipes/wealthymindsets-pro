/**
 * WM PRO BILLING — READING THE ONE WORLD PASS FROM WOW OS (server only).
 *
 * WOW owns the World Pass record. WM Pro asks WOW, signed with the key both sides hold
 * (WM Pro: WOW_REALM_KEY · WOW: REALM_KEY_WM_PRO), over the WOW service binding when the
 * Worker has it (wrangler.jsonc `services`), else over HTTPS. WOW's answer is signed too and
 * is checked before it is believed. The last good read is cached in the billing KV under
 * `billing:v1:worldpass:<userId>`; a cached read grants for at most 24 hours (worldPass.ts),
 * and is re-read whenever the member's standing is read and the cache is over an hour old.
 * A failed read keeps the old one, which simply goes stale. Never a secret in a response.
 */
import { webullWorkerEnv } from "@/lib/marketData/webullSessionStore";

import type { BillingKv } from "./billingStore";
import type { BillingEnv } from "./tiers";
import { WORLD_PASS_KEY_ENV, WORLD_PASS_REALM, WORLD_PASS_REREAD_MS, parseWorldPassRead, readWorldPassAnswer, signRealm, verifyRealm, type WorldPassRead } from "./worldPass";

export const WOW_WORLD_PASS_URL = "https://thewow.online/api/realm/world-pass-state";
const PASSPORT_REF = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Same `billing:v1:` prefix as billingStore.ts (kept literal here so the two modules do not import each other). */
export const worldPassKey = (userId: string) => `billing:v1:worldpass:${userId}`;

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** The WOW service binding's fetch when the Worker has one, else the global fetch. */
async function wowFetcher(): Promise<Fetcher> {
  const env = (await webullWorkerEnv()) as { WOW?: { fetch(input: Request | string, init?: RequestInit): Promise<Response> } } | undefined;
  return env?.WOW ? (url, init) => env.WOW!.fetch(url, init) : (url, init) => fetch(url, init);
}

/** Ask WOW for one member's World Pass. Throws on anything WOW did not sign or that is not this member's. */
export async function fetchWorldPass(userId: string, env: BillingEnv = process.env, fetcher?: Fetcher, nowMs: number = Date.now()): Promise<WorldPassRead> {
  const key = (env[WORLD_PASS_KEY_ENV] ?? "").trim();
  if (key.length < 32) throw new Error("World Pass reads are not configured.");
  const ref = userId.toLowerCase();
  if (!PASSPORT_REF.test(ref)) throw new Error("Not a Passport identity.");
  const body = JSON.stringify({ passport_id_ref: ref });
  const init: RequestInit = { method: "POST", headers: { "Content-Type": "application/json", "X-Realm": WORLD_PASS_REALM, "X-Realm-Signature": await signRealm(key, body, Math.floor(nowMs / 1000)) }, body, signal: AbortSignal.timeout(8_000) };
  const res = await (fetcher ?? (await wowFetcher()))(WOW_WORLD_PASS_URL, init);
  if (!res.ok) throw new Error(`WOW OS could not confirm the World Pass (HTTP ${res.status}).`);
  const text = await res.text();
  if (text.length > 4000 || !(await verifyRealm(key, text, res.headers.get("X-Realm-Signature"), Math.floor(nowMs / 1000)))) throw new Error("World Pass answer was not signed by WOW OS.");
  return { ...readWorldPassAnswer(JSON.parse(text), ref, nowMs), userId };
}

export async function loadWorldPass(kv: BillingKv | null, userId: string): Promise<WorldPassRead | null> {
  if (!kv) return null;
  try { return parseWorldPassRead(await kv.get(worldPassKey(userId)), userId); } catch { return null; }
}

/**
 * The member's World Pass as WM Pro knows it now: the cached read, re-read from WOW when it is
 * missing or older than an hour (or `force`). Never throws; null = nothing known.
 */
export async function currentWorldPass(userId: string, kv: BillingKv | null, opts: { env?: BillingEnv; fetcher?: Fetcher; nowMs?: number; force?: boolean } = {}): Promise<WorldPassRead | null> {
  const env = opts.env ?? process.env;
  const nowMs = opts.nowMs ?? Date.now();
  const cached = await loadWorldPass(kv, userId);
  const age = cached ? nowMs - Date.parse(cached.fetchedAt) : Infinity;
  if (!opts.force && cached && age >= 0 && age < WORLD_PASS_REREAD_MS) return cached;
  if ((env[WORLD_PASS_KEY_ENV] ?? "").trim().length < 32) return cached;
  try {
    const fresh = await fetchWorldPass(userId, env, opts.fetcher, nowMs);
    if (kv) { try { await kv.put(worldPassKey(userId), JSON.stringify(fresh)); } catch { /* the read still counts for this request */ } }
    return fresh;
  } catch {
    return cached;
  }
}
