"use client";

/**
 * AuthContext — wraps the entire app.
 *
 * Uses Supabase Auth via our server-side API routes (/api/auth/*).
 * The access_token is stored in an httpOnly cookie by the server —
 * the client never sees the raw token. We expose user metadata here.
 */

import { proofSceneHoldsWrites } from "@/lib/chart/proofScene";
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isCoreTeam } from "@/lib/coreTeam";
import { isPublicAuthPath, safeNextPath, selectAuthenticatedRouteState, signInPathFor } from "@/lib/authRoutes";
import { FOUNDER_LANDING_ROUTE } from "@/lib/routing/founderLanding";
import { clearAllSessionSymbols } from "@/lib/marketData/sessionSymbolStore";
import { clearPaperState } from "@/lib/paperTrade";
import { clearWMSState } from "@/contexts/WMSContext";
import { clearOwnerScopedLocalStorage, completeLocalSignOut } from "@/lib/logoutIsolation";
import { setManagementOwner, stampLegacyOwner } from "@/lib/journal/managementOwner";
import { clearSessionNectarForSignOut } from "@/lib/marketData/sessionNectar";
import { forgetQuoteToken } from "@/lib/broker/tastyQuoteTokenClient";
import { forgetTastyFrontMonths } from "@/lib/broker/tastyFrontMonth";
import { forgetTastyOptionStreamers } from "@/lib/broker/tastyOptionStreamers";
import { closeTastyStreamForSignOut, reopenTastyStream } from "@/lib/broker/tastyQuoteStream";
import { hydrateCachedUser, readCachedSession, type WMUser } from "@/lib/auth/cachedSession";
import { authLinkForwardTarget } from "@/lib/auth/authLinkForward";

// The account shape lives next to the only code that can PROVE a stored value
// has it. Re-exported here because this is where the app has always imported
// it from.
export type { WMUser } from "@/lib/auth/cachedSession";

interface AuthState {
  user:       WMUser | null;
  loading:    boolean;
  signUp:     (email: string, password: string) => Promise<{ error?: string; verificationRequired?: boolean }>;
  signIn:     (email: string, password: string) => Promise<{ error?: string; status?: number; edge?: string }>;
  resendConfirmation: (email: string) => Promise<{ error?: string }>;
  signOut:    () => Promise<void>;
  signOutAllDevices: () => Promise<void>;
  updateProfile: (data: Partial<WMUser>) => Promise<{ error?: string }>;
  refreshUser: () => Promise<WMUser | null | undefined>;
}

const AuthContext = createContext<AuthState>({
  user: null, loading: true,
  signUp: async () => ({}),
  signIn:  async () => ({}),
  resendConfirmation: async () => ({}),
  signOut: async () => {},
  signOutAllDevices: async () => {},
  updateProfile: async () => ({}),
  refreshUser: async () => undefined,
});

export function useAuth() { return useContext(AuthContext); }

const SESSION_KEY = "wm_session_v1";

/**
 * A phone on a weak signal can leave a request open for minutes. Every auth
 * call gets a ceiling so the door never shows an endless spinner (sign-in lane
 * 2026-10-06): the session check falls back to "not known", a sign-in attempt
 * fails with a sentence the human can act on.
 */
const SESSION_CHECK_TIMEOUT_MS = 12_000;
const AUTH_ACTION_TIMEOUT_MS = 25_000;
const AUTH_TIMEOUT_MESSAGE = "The account service did not answer in time. Check your connection and try again.";
const SESSION_NOT_KEPT_MESSAGE =
  "Your password was accepted, but this browser did not keep the sign-in. Turn off private browsing or " +
  "\"Block All Cookies\" for this site, then sign in again.";

async function fetchWithTimeout(input: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function readResponseJson(response: Response): Promise<Record<string, unknown>> {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

/**
 * No cast. A truthy blob out of localStorage used to become a signed-in
 * trader — measured: `{}` trapped them on /profile?setup=1 on every
 * navigation, and `{"id":123}` ran the whole app under a numeric identity.
 * The cache only saves a login flash; `/api/auth/me` is the authority.
 */
function readCachedUser(): WMUser | null {
  if (typeof window === "undefined") return null;
  return readCachedSession(localStorage, SESSION_KEY);
}

function writeCachedUser(u: WMUser | null) {
  if (typeof window === "undefined") return;
  try {
    // A proof scene writes nothing (2026-10-09): re-caching the SAME signed-in
    // account on a scene load is held. A sign-out (u === null) is never held —
    // clearing the cache is isolation, not a preference.
    if (u) { if (!proofSceneHoldsWrites()) localStorage.setItem(SESSION_KEY, JSON.stringify(u)); }
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<WMUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();

  // An emailed link's fragment that arrived on the wrong page goes to the page
  // that can read it — before the route guard's client redirect drops it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = authLinkForwardTarget(window.location.pathname, window.location.hash);
    if (target) window.location.replace(target);
  }, []);

  // The browser's last-known account BEFORE this load's sign-in replaces the cache: the only
  // member legacy (pre-isolation) rows may be handed to (managementOwner.legacyRowsBelongTo).
  const legacyMarkerRef = useRef<string | null | undefined>(undefined);
  if (legacyMarkerRef.current === undefined && typeof window !== "undefined") legacyMarkerRef.current = readCachedUser()?.id ?? null;
  // The owner is set BEFORE the account reaches React state (Garden 19 member isolation,
  // 2026-10-08): a room's first render — the journal reads its book in a state initializer —
  // must already open the member's own key, never a guess and never nobody's.
  const claimOwner = useCallback((u: WMUser | null | undefined, resolved: boolean) => {
    if (u?.id) setManagementOwner(u.id, undefined, legacyMarkerRef.current ?? null);
    else if (resolved) setManagementOwner(null);
  }, []);

  // Restore from localStorage immediately on first render to prevent flash-to-login
  useEffect(() => {
    const cached = readCachedUser();
    if (cached) { claimOwner(cached, false); setUser(cached); }
  }, [claimOwner]);

  // Resolves the account (signed in), null (the server said: no session), or
  // undefined (could not tell — network, timeout, 5xx).
  const refreshUser = useCallback(async (): Promise<WMUser | null | undefined> => {
    try {
      const res  = await fetchWithTimeout("/api/auth/me", { credentials: "include", cache: "no-store" }, SESSION_CHECK_TIMEOUT_MS);
      if (res.ok) {
        const data = await res.json();
        // Through the same reader as the cache. `{ ...raw }` trusted the
        // response to be an account, and it is this branch that WRITES the
        // cache — so an id-less 200 body did not just render wrong once, it
        // was persisted and re-read on every subsequent load.
        const hydrated = hydrateCachedUser(data.user);
        const u: WMUser | null = hydrated && {
          ...hydrated,
          // Core-team status is DERIVED here, never read from the payload.
          ceo: isCoreTeam(hydrated.handle, hydrated.email),
        };
        claimOwner(u, true);
        setUser(u);
        writeCachedUser(u);
        return u;
      } else if (res.status === 401 || res.status === 403) {
        // Only an explicit authentication rejection invalidates this cache.
        // A 429/5xx response does not prove that the session expired.
        // The session ended WITHOUT a sign-out: tie any legacy (pre-isolation) rows on this
        // browser to the account they belonged to, before the cache that names it is cleared.
        stampLegacyOwner(readCachedUser()?.id);
        writeCachedUser(null);
        claimOwner(null, true);
        setUser(null);
        return null;
      } else {
        // Preserve the last account display during a service interruption,
        // matching network-error recovery below. Protected API routes still
        // verify the cookie and revocation state on every request.
        const cached = readCachedUser();
        if (cached) { claimOwner(cached, false); setUser(cached); }
        return undefined;
      }
    } catch {
      // Network error or timeout — keep cached session alive
      const cached = readCachedUser();
      if (cached) { claimOwner(cached, false); setUser(cached); }
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [claimOwner]);

  // Hydrate on mount
  useEffect(() => { refreshUser(); }, [refreshUser]);

  // MEMBER ISOLATION for the management stores (plans, drafts, Morning Prep rules), Garden 19
  // audit 2026-10-08: they are keyed by the signed-in member's id. The owner is set as soon as
  // a member is known, and set to nobody only once auth has RESOLVED to nobody — a guest then
  // reads no rows and writes none; a different member reads only their own.
  // The browser's last-known account BEFORE this load's sign-in replaces the cache: the only
  // member legacy (pre-isolation) management rows may be handed to (managementOwner.legacyRowsBelongTo).
  useEffect(() => {
    if (user?.id) setManagementOwner(user.id, undefined, legacyMarkerRef.current ?? null);
    else if (!loading) setManagementOwner(null);
  }, [user?.id, loading]);

  // ACCOUNT SWITCH without a sign-out through this tab (session expired, a
  // different account signed in from another tab, the cached account replaced
  // by /api/auth/me): the tastytrade stream token belongs to whoever asked for
  // it. A member's grant serves that member only, so a change of identity drops
  // the token, the socket and every contract the previous account resolved —
  // and re-asks under the new account (or stays closed when no one is signed in).
  const streamIdentityRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const id = user?.id ?? null;
    const previous = streamIdentityRef.current;
    streamIdentityRef.current = id;
    if (previous === undefined || previous === id) return;
    forgetTastyFrontMonths();
    forgetTastyOptionStreamers();
    if (id === null) closeTastyStreamForSignOut();
    else reopenTastyStream();
  }, [user?.id]);

  // Route guard
  useEffect(() => {
    const routeState = selectAuthenticatedRouteState(pathname, user, loading);
    if (routeState === "CHECKING_SESSION") return;
    const isPublic = isPublicAuthPath(pathname);
    if (routeState === "SIGN_IN_REQUIRED") {
      // Carry the room along so sign-in returns the human to it.
      router.replace(signInPathFor(pathname, typeof window === "undefined" ? "" : window.location.search));
      return;
    }
    // Completeness must use the same rule the server uses in /api/auth/login:
    // an existing display name is itself proof the profile was completed, even
    // when the flag did not survive (stale cookie, metadata write that never
    // landed). Without this the guard bounces the user back to /profile on
    // every navigation and they can never reach the rest of the app.
    if (routeState === "PROFILE_SETUP_REQUIRED") {
      router.replace("/profile?setup=1");
      return;
    }
    if (user && isPublic) {
      // A signed-in human on /login goes back to the room they asked for
      // (?next=), else — having named no destination — to the landing owner.
      const next = typeof window === "undefined" ? null : safeNextPath(new URLSearchParams(window.location.search).get("next"));
      router.replace(next ?? FOUNDER_LANDING_ROUTE);
    }
  }, [user, loading, pathname, router]);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetchWithTimeout("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: "include",
      }, AUTH_ACTION_TIMEOUT_MS);
      const data = await readResponseJson(res);
      if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Signup failed" };
      if (data.verificationRequired === true) return { verificationRequired: true };
      const account = await refreshUser();
      if (account === null) return { error: SESSION_NOT_KEPT_MESSAGE };
      return {};
    } catch (error) {
      if (isAbort(error)) return { error: AUTH_TIMEOUT_MESSAGE };
      return { error: "We could not reach the account service. Check your connection and try again." };
    }
  }, [refreshUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetchWithTimeout("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: "include",
      }, AUTH_ACTION_TIMEOUT_MS);
      const data = await readResponseJson(res);
      if (!res.ok) {
        // Carry the STATUS and the route's named `edge` through. Without them the
        // caller can only guess at the failure class by reading the prose, and a
        // configuration outage gets mis-worded as a wrong password.
        return {
          error: typeof data.error === "string" ? data.error : "Login failed",
          status: res.status,
          edge: typeof data.edge === "string" ? data.edge : undefined,
        };
      }
      // A 200 whose cookie the browser refused (private mode, "Block All
      // Cookies", a cookie too large to keep) used to leave the human on the
      // form with no message at all. Ask the server whether the session stuck.
      const account = await refreshUser();
      if (account === null) return { error: SESSION_NOT_KEPT_MESSAGE, status: 0, edge: "SESSION NOT KEPT" };
      return {};
    } catch (error) {
      return {
        error: isAbort(error) ? AUTH_TIMEOUT_MESSAGE : "We could not reach the account service. Check your connection and try again.",
        status: 0,
      };
    }
  }, [refreshUser]);

  const resendConfirmation = useCallback(async (email: string) => {
    try {
      const res = await fetchWithTimeout("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      }, AUTH_ACTION_TIMEOUT_MS);
      const data = await readResponseJson(res);
      if (!res.ok) {
        return { error: typeof data.error === "string" ? data.error : "Confirmation email could not be requested" };
      }
      return {};
    } catch {
      return { error: "We could not reach the account service. Check your connection and try again." };
    }
  }, []);

  // Founder Nectar Persistence Authority §"logout/account transition
  // clears owner-local symbol, Nectar and canonical runtime state
  // without deleting server history." sessionSymbolStore has no owner-
  // scoping today, so on shared browsers User B would inherit User A's
  // observations. Clear browser-local session stats on every sign-out.
  // Does NOT touch server-side coverage (there isn't any owner-scoped
  // server-durable Nectar tier yet; when it lands, this line does not
  // interfere — server rows stay put).
  const signOut = useCallback(async () => {
    await completeLocalSignOut(
      fetch("/api/auth/logout", { method: "POST", credentials: "include", keepalive: true }),
      [
        clearAllSessionSymbols,
        clearPaperState,
        clearWMSState,
        clearOwnerScopedLocalStorage,
        // In-memory owner state that outlives a client-side sign-out (garden pass 2026-10-04):
        clearSessionNectarForSignOut,
        forgetQuoteToken,
        // The shared tastytrade socket and its last values: a member's own live
        // stream must not keep running for the next person on this device.
        closeTastyStreamForSignOut,
        forgetTastyFrontMonths,
        forgetTastyOptionStreamers,
        () => writeCachedUser(null),
        () => setUser(null),
        () => router.replace("/login"),
      ],
    );
  }, [router]);

  // Revoke every session everywhere (bumps the server-side session epoch), then
  // sign out locally. Other devices drop at their next /api/auth/me poll.
  const signOutAllDevices = useCallback(async () => {
    await completeLocalSignOut(
      fetch("/api/auth/logout-all", { method: "POST", credentials: "include", keepalive: true }),
      [
        clearAllSessionSymbols,
        clearPaperState,
        clearWMSState,
        clearOwnerScopedLocalStorage,
        // In-memory owner state that outlives a client-side sign-out (garden pass 2026-10-04):
        clearSessionNectarForSignOut,
        forgetQuoteToken,
        // The shared tastytrade socket and its last values: a member's own live
        // stream must not keep running for the next person on this device.
        closeTastyStreamForSignOut,
        forgetTastyFrontMonths,
        forgetTastyOptionStreamers,
        () => writeCachedUser(null),
        () => setUser(null),
        () => router.replace("/login"),
      ],
    );
  }, [router]);

  const updateProfile = useCallback(async (updates: Partial<WMUser>) => {
    // Never rejects (sign-in lane 2026-10-06): profile SETUP awaits this, and a
    // thrown parse of a non-JSON error page left "Create My Profile" doing
    // nothing at all — the one step between a new member and the app.
    let res: Response;
    let data: Record<string, unknown>;
    try {
      res = await fetchWithTimeout("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      }, AUTH_ACTION_TIMEOUT_MS);
      data = await readResponseJson(res);
    } catch (error) {
      return { error: isAbort(error) ? AUTH_TIMEOUT_MESSAGE : "We could not reach the account service. Check your connection and try again." };
    }
    if (!res.ok) {
      return { error: typeof data.error === "string" ? data.error : `Your profile could not be saved (HTTP ${res.status}).` };
    }
    // Keep the cached session in step with the account (garden pass
    // 2026-10-04: an outage restored the pre-edit profile from the cache).
    setUser(prev => {
      const next = prev ? { ...prev, ...updates } : null;
      if (next) writeCachedUser(next);
      return next;
    });
    return {};
  }, []);

  const routeState = selectAuthenticatedRouteState(pathname, user, loading);
  const renderProtectedChildren = routeState === "READY";
  const renderPublicChildren = routeState === "PUBLIC";

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, resendConfirmation, signOut, signOutAllDevices, updateProfile, refreshUser }}>
      {renderPublicChildren || renderProtectedChildren ? children : (
        <main
          className="flex min-h-screen items-center justify-center bg-wm-black px-6 text-center text-wm-text-muted"
          aria-live="polite"
          aria-busy={routeState === "CHECKING_SESSION"}
        >
          <p>{routeState === "CHECKING_SESSION" ? "Checking your secure session…" : "Opening sign in…"}</p>
        </main>
      )}
    </AuthContext.Provider>
  );
}
