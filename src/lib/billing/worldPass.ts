/**
 * WM PRO BILLING — WHAT THE WORLD PASS GRANTS HERE (Founder canon, restated 2026-10-24).
 *
 * The $20/month World Pass is ONE app at its $20 Premium tier plus the $10 Basic tier of every
 * other ATH app. WOW OS (thewow.online) owns the ONE World Pass record; WM Pro never sells a
 * second one. WM Pro reads that record, signed, from WOW
 * (POST /api/realm/world-pass-state, X-Realm: wm_pro, keyed by the shared Passport identity) and
 * maps it onto its own tiers:
 *
 *   ACTIVE + chosen_app "wm_pro"           → PASSPORT (WM Pro Premium)
 *   ACTIVE + any other app / none chosen   → APP (WM Pro App · Basic)
 *   anything else, another mode, or a read older than 24 hours → nothing
 *
 * It NEVER STACKS with a WM Pro subscription: the member's tier is the higher of the two
 * (`combinedTier`), never a sum, and a paid tier the pass already covers is flagged so the member
 * can cancel it. Existing WM Pro subscribers' billing is not touched by any of this.
 *
 * PURE (WebCrypto only). The server read and its KV cache are worldPassRead.ts.
 */
import { TIER_SPEC, type BillingTier, type PaidTier } from "./tiers";

export const WORLD_PASS_REALM = "wm_pro" as const;
export const WORLD_PASS_APP_ID = "wm_pro" as const;
export const WORLD_PASS_PREMIUM_TIER: PaidTier = "PASSPORT";
export const WORLD_PASS_BASIC_TIER: PaidTier = "APP";
/** A read older than this grants nothing. */
export const WORLD_PASS_FRESH_MS = 24 * 60 * 60 * 1000;
/** A cached read older than this is re-read from WOW when the member's standing is read. */
export const WORLD_PASS_REREAD_MS = 60 * 60 * 1000;
/** Where a member buys the one World Pass, with WM Pro pre-selected as the Premium app. */
export const WORLD_PASS_BUY_URL = "https://thewow.online/passport?app=wm_pro#world-pass";
/** The env var holding the key shared with WOW (WOW's REALM_KEY_WM_PRO). A name, never a value. */
export const WORLD_PASS_KEY_ENV = "WOW_REALM_KEY";

const STATUSES = ["ACTIVE", "PAST_DUE", "CANCELED", "NONE"] as const;
export type WorldPassStatus = (typeof STATUSES)[number];
const APP = /^[a-z][a-z0-9_]{1,30}$/;

/** One cached, WOW-signed read for one member. */
export interface WorldPassRead {
  readonly v: 1;
  readonly userId: string;
  readonly status: WorldPassStatus;
  readonly chosenApp: string | null;
  readonly livemode: boolean;
  readonly currentPeriodEnd: string | null;
  readonly fetchedAt: string;
}

/** The WM Pro tier a World Pass read grants right now, in the server's current mode; null = none. */
export function worldPassTier(read: WorldPassRead | null, serverLive: boolean | null, nowMs: number = Date.now()): PaidTier | null {
  if (!read || serverLive === null || read.livemode !== serverLive || read.status !== "ACTIVE") return null;
  const at = Date.parse(read.fetchedAt);
  if (!Number.isFinite(at) || nowMs - at > WORLD_PASS_FRESH_MS || at - nowMs > 5 * 60_000) return null;
  return read.chosenApp === WORLD_PASS_APP_ID ? WORLD_PASS_PREMIUM_TIER : WORLD_PASS_BASIC_TIER;
}

/** Never stacked: the higher of the member's own tier and what the World Pass covers. */
export function combinedTier(own: BillingTier, pass: PaidTier | null): BillingTier {
  if (!pass) return own;
  return TIER_SPEC[pass].rank > TIER_SPEC[own].rank ? pass : own;
}

/** True when the World Pass already covers `tier` (so it must not be sold again, and a paid copy should be cancelled). */
export function worldPassCovers(pass: PaidTier | null, tier: BillingTier): boolean {
  return pass !== null && tier !== "FREE" && TIER_SPEC[pass].rank >= TIER_SPEC[tier].rank;
}

/** Validate WOW's (already signature-verified) answer for this member before it is cached. Throws on anything off. */
export function readWorldPassAnswer(value: unknown, userId: string, nowMs: number = Date.now()): WorldPassRead {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("World Pass answer is not an object.");
  const s = value as Record<string, unknown>;
  if (s.passport_id_ref !== userId) throw new Error("World Pass answer is for a different member.");
  if (!(STATUSES as readonly string[]).includes(String(s.status)) || typeof s.livemode !== "boolean") throw new Error("World Pass status is incomplete.");
  if (s.chosen_app !== null && (typeof s.chosen_app !== "string" || !APP.test(s.chosen_app))) throw new Error("World Pass chosen app is invalid.");
  if (s.current_period_end != null && (typeof s.current_period_end !== "string" || !Number.isFinite(Date.parse(s.current_period_end)))) throw new Error("World Pass period is invalid.");
  const fetched = typeof s.fetched_at === "string" ? Date.parse(s.fetched_at) : NaN;
  if (!Number.isFinite(fetched) || nowMs - fetched > 30_000 || fetched - nowMs > 5_000) throw new Error("World Pass answer is stale.");
  return { v: 1, userId, status: s.status as WorldPassStatus, chosenApp: (s.chosen_app as string | null) ?? null, livemode: s.livemode, currentPeriodEnd: (s.current_period_end as string | null | undefined) ?? null, fetchedAt: new Date(fetched).toISOString() };
}

/** Parse a cached read fail-closed. */
export function parseWorldPassRead(raw: unknown, userId: string): WorldPassRead | null {
  let o: Record<string, unknown> | null = null;
  if (typeof raw === "string") { try { o = JSON.parse(raw) as Record<string, unknown>; } catch { return null; } }
  else if (raw && typeof raw === "object") o = raw as Record<string, unknown>;
  if (!o || o.v !== 1 || o.userId !== userId || typeof o.livemode !== "boolean" || typeof o.fetchedAt !== "string") return null;
  if (!(STATUSES as readonly string[]).includes(String(o.status))) return null;
  const chosenApp = typeof o.chosenApp === "string" && APP.test(o.chosenApp) ? o.chosenApp : null;
  return { v: 1, userId, status: o.status as WorldPassStatus, chosenApp, livemode: o.livemode, currentPeriodEnd: typeof o.currentPeriodEnd === "string" ? o.currentPeriodEnd : null, fetchedAt: o.fetchedAt };
}

/* ── the realm signature WOW uses: X-Realm-Signature: t=<unix>,v1=<hex HMAC-SHA256(key, t + "." + body)> ── */

const enc = new TextEncoder();
async function hmacHex(key: string, text: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(text)))].map(b => b.toString(16).padStart(2, "0")).join("");
}
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export async function signRealm(key: string, body: string, nowSec: number = Math.floor(Date.now() / 1000)): Promise<string> {
  return `t=${nowSec},v1=${await hmacHex(key, `${nowSec}.${body}`)}`;
}
export async function verifyRealm(key: string | undefined, body: string, header: string | null, nowSec: number = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!key || key.length < 32 || !header) return false;
  const parts = header.split(",").map(p => p.trim());
  const t = Number(parts.find(p => p.startsWith("t="))?.slice(2));
  const v1 = parts.find(p => p.startsWith("v1="))?.slice(3) ?? "";
  if (!t || !v1 || Math.abs(nowSec - t) > 300) return false;
  return same(v1, await hmacHex(key, `${t}.${body}`));
}
