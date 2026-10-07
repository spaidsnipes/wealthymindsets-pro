/**
 * MEMBER BROKER GRANTS — a member's OWN broker credentials, encrypted at rest
 * (docs/operations/MEMBER-BROKER-CONNECT.md; Garden 19 §25).
 *
 * - AES-256-GCM via WebCrypto (Workers + Node both carry `crypto.subtle`).
 * - The key is HKDF-SHA256-derived from the server-only secret
 *   WM_BROKER_GRANT_KEY. Unset → `MEMBER_CONNECTIONS_NOT_ENABLED`; nothing is
 *   ever stored in plaintext as a fallback.
 * - AAD = `<provider>|<userId>`: a ciphertext moved under another member's key
 *   does not decrypt. The KV key is `broker-grant:v1:<provider>:<sha256(userId)>`.
 * - The userId passed here must be the SERVER-VERIFIED session subject
 *   (requireAuth → auth.user.sub). No caller may take it from a request body.
 * - Nothing in this module logs, and no function returns the secrets except
 *   `readMemberGrant`, whose result must stay on the server.
 */

export const MEMBER_GRANT_KEY_ENV = "WM_BROKER_GRANT_KEY";
export const MEMBER_GRANT_PREFIX = "broker-grant:v1:";

export type MemberGrantProvider = "tastytrade";

export interface MemberGrantKv {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Non-secret facts measured from the broker at connect time. */
export interface MemberGrantMeta {
  readonly accounts: number;
  readonly quotes: boolean;
  readonly level: string | null;
  readonly validatedAt: string;
}

export interface MemberGrantSecrets {
  readonly clientSecret: string;
  readonly refreshToken: string;
}

interface StoredGrant {
  readonly v: 1;
  readonly provider: MemberGrantProvider;
  readonly iv: string;
  readonly ct: string;
  readonly meta: MemberGrantMeta;
}

export type GrantStoreAvailability =
  | { readonly enabled: true; readonly kv: MemberGrantKv; readonly secret: string }
  | { readonly enabled: false; readonly reason: "NO_KEY" | "NO_STORE" };

/** Is the feature switched on for this runtime? Never reveals the key. */
export function grantStoreAvailability(env: Readonly<Record<string, unknown>> | undefined, kv: MemberGrantKv | null): GrantStoreAvailability {
  const raw = env?.WM_BROKER_GRANT_KEY; // = MEMBER_GRANT_KEY_ENV
  const secret = typeof raw === "string" ? raw.trim() : "";
  if (secret.length < 16) return { enabled: false, reason: "NO_KEY" };
  if (!kv) return { enabled: false, reason: "NO_STORE" };
  return { enabled: true, kv, secret };
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha256Hex(text: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(text)));
  return [...d].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function memberGrantKey(provider: MemberGrantProvider, userId: string): Promise<string> {
  return `${MEMBER_GRANT_PREFIX}${provider}:${await sha256Hex(`wm-member:${userId}`)}`;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(secret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode("wm-broker-grant"), info: enc.encode("wm-broker-grant-v1") },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function aad(provider: MemberGrantProvider, userId: string) {
  return enc.encode(`${provider}|${userId}`);
}

export async function sealGrant(secret: string, provider: MemberGrantProvider, userId: string, secrets: MemberGrantSecrets, meta: MemberGrantMeta): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = enc.encode(JSON.stringify({ clientSecret: secrets.clientSecret, refreshToken: secrets.refreshToken }));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad(provider, userId) }, key, plain));
  const stored: StoredGrant = { v: 1, provider, iv: b64(iv), ct: b64(ct), meta };
  return JSON.stringify(stored);
}

function parseStored(raw: string | null): StoredGrant | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Partial<StoredGrant>;
    if (j.v !== 1 || typeof j.iv !== "string" || typeof j.ct !== "string" || !j.meta || typeof j.provider !== "string") return null;
    return j as StoredGrant;
  } catch {
    return null;
  }
}

/** Decrypt or null. A wrong key, wrong user or tampered record all read as null. */
export async function openGrant(secret: string, provider: MemberGrantProvider, userId: string, raw: string | null): Promise<{ secrets: MemberGrantSecrets; meta: MemberGrantMeta } | null> {
  const s = parseStored(raw);
  if (!s || s.provider !== provider) return null;
  try {
    const key = await deriveKey(secret);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(s.iv), additionalData: aad(provider, userId) }, key, unb64(s.ct));
    const j = JSON.parse(dec.decode(plain)) as Partial<MemberGrantSecrets>;
    if (typeof j.clientSecret !== "string" || typeof j.refreshToken !== "string") return null;
    return { secrets: { clientSecret: j.clientSecret, refreshToken: j.refreshToken }, meta: s.meta };
  } catch {
    return null;
  }
}

export type MemberGrantRead =
  | { readonly state: "NONE" }
  | { readonly state: "UNREADABLE"; readonly meta: MemberGrantMeta | null }
  | { readonly state: "OK"; readonly secrets: MemberGrantSecrets; readonly meta: MemberGrantMeta };

/** SERVER ONLY — the result carries secrets. Never serialize it into a response. */
export async function readMemberGrant(store: Extract<GrantStoreAvailability, { enabled: true }>, provider: MemberGrantProvider, userId: string): Promise<MemberGrantRead> {
  let raw: string | null = null;
  try { raw = await store.kv.get(await memberGrantKey(provider, userId)); } catch { return { state: "NONE" }; }
  if (!raw) return { state: "NONE" };
  const opened = await openGrant(store.secret, provider, userId, raw);
  if (!opened) return { state: "UNREADABLE", meta: parseStored(raw)?.meta ?? null };
  return { state: "OK", ...opened };
}

export async function writeMemberGrant(store: Extract<GrantStoreAvailability, { enabled: true }>, provider: MemberGrantProvider, userId: string, secrets: MemberGrantSecrets, meta: MemberGrantMeta): Promise<void> {
  const sealed = await sealGrant(store.secret, provider, userId, secrets, meta);
  await store.kv.put(await memberGrantKey(provider, userId), sealed);
}

export async function deleteMemberGrant(store: Extract<GrantStoreAvailability, { enabled: true }>, provider: MemberGrantProvider, userId: string): Promise<void> {
  await store.kv.delete(await memberGrantKey(provider, userId));
}

/** Duck-typed KV binding lookup (the existing WEBULL_SESSION namespace, own prefix). */
export const MEMBER_GRANT_KV_BINDING = "WEBULL_SESSION";
export function memberGrantKvFrom(env: unknown): MemberGrantKv | null {
  if (!env || typeof env !== "object") return null;
  const c = (env as Record<string, unknown>)[MEMBER_GRANT_KV_BINDING] as Partial<MemberGrantKv> | undefined;
  return c && typeof c.get === "function" && typeof c.put === "function" && typeof c.delete === "function" ? (c as MemberGrantKv) : null;
}
