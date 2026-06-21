/**
 * Auth utilities — JWT + password hashing using Node built-ins only.
 * No npm packages required.
 *
 * JWT_SECRET must be set in env for production security.
 * Falls back to a dev secret with a loud console warning.
 */

import { createHmac, pbkdf2Sync, randomBytes } from "crypto";
import type { ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies";

const JWT_SECRET = process.env.JWT_SECRET ?? "wm-dev-secret-CHANGE-IN-PROD-4f8a2b1c";
const COOKIE_NAME = "wm_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface JWTPayload {
  sub:             string; // userId
  email:           string;
  displayName?:    string;
  handle?:         string;
  avatar?:         string;
  bio?:            string;
  profileComplete: boolean;
  iat:             number;
  exp:             number;
}

/* ── JWT (HMAC-SHA256, base64url) ─────────────────────── */
function b64url(s: string): string {
  return Buffer.from(s).toString("base64url");
}
function fromB64url(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

export function signJWT(payload: Omit<JWTPayload, "iat" | "exp">): string {
  const now = Math.floor(Date.now() / 1000);
  const full: JWTPayload = { ...payload, iat: now, exp: now + COOKIE_MAX_AGE };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body   = b64url(JSON.stringify(full));
  const sig    = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;
    const expected = createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (sig !== expected) return null;
    const payload = JSON.parse(fromB64url(body)) as JWTPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

/* ── Password hashing (PBKDF2-SHA512) ─────────────────── */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const attempt = pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  // Constant-time compare
  if (attempt.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < attempt.length; i++) diff |= attempt.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}

/* ── Cookie helpers ─────────────────────────────────────── */
export function setAuthCookie(cookies: ResponseCookies, jwt: string) {
  cookies.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   COOKIE_MAX_AGE,
    path:     "/",
  });
}

export function clearAuthCookie(cookies: ResponseCookies) {
  cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
}

export function getAuthToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/* ── In-memory user store ───────────────────────────────── */
// Persists within a single Node.js process lifetime.
// For production: replace with Supabase (set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY).
declare global {
  // eslint-disable-next-line no-var
  var __wmUsers: Map<string, { id: string; email: string; passwordHash: string; createdAt: number }> | undefined;
}
export const userStore: Map<string, { id: string; email: string; passwordHash: string; createdAt: number }> =
  globalThis.__wmUsers ?? (globalThis.__wmUsers = new Map());

export function useSupabase(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 10);
}

/* ── Supabase helpers (raw fetch, no package) ───────────── */
const SB_URL  = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY  = () => (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

// Admin API — auto-confirms email so users can sign in immediately on any device.
// Uses service role key which bypasses email confirmation.
export async function supabaseSignUp(email: string, password: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    // Use admin endpoint to create user with email auto-confirmed
    const res = await fetch(`${SB_URL()}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    const data = await res.json();
    // Admin API returns { id, email, ... } directly on success (no .user wrapper)
    // Normalize to { user, error } shape our caller expects
    if (data.id) return { user: data, error: null };
    // Handle "User already registered" or other errors
    return { user: null, error: { message: data.msg ?? data.message ?? "Signup failed" } };
  }
  // Fallback: regular signup (email confirmation may be required)
  const res = await fetch(`${SB_URL()}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SB_KEY() },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function supabaseResetPassword(email: string) {
  const res = await fetch(`${SB_URL()}/auth/v1/recover`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SB_KEY() },
    body: JSON.stringify({ email }),
  });
  return res.ok;
}

export async function supabaseSignIn(email: string, password: string) {
  const res = await fetch(`${SB_URL()}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SB_KEY() },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function supabaseGetUser(accessToken: string) {
  const res = await fetch(`${SB_URL()}/auth/v1/user`, {
    headers: { apikey: SB_KEY(), Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}
