"use client";

/**
 * AuthContext — wraps the entire app.
 *
 * Uses Supabase Auth via our server-side API routes (/api/auth/*).
 * The access_token is stored in an httpOnly cookie by the server —
 * the client never sees the raw token. We expose user metadata here.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isCoreTeam } from "@/lib/coreTeam";
import { isPublicAuthPath } from "@/lib/authRoutes";
import { clearAllSessionSymbols } from "@/lib/marketData/sessionSymbolStore";
import { clearPaperState } from "@/lib/paperTrade";

export interface WMUser {
  id:             string;
  email:          string;
  displayName?:   string;
  handle?:        string;
  avatar?:        string;        // data URL or remote URL
  bio?:           string;
  botName?:       string;        // durable, follows the account
  timezone?:      string;
  bgColor?:       string;        // profile background color pref
  profileComplete: boolean;
  verified?:      boolean;       // blue checkmark
  ceo?:           boolean;       // WM core team crown badge
}

interface AuthState {
  user:       WMUser | null;
  loading:    boolean;
  signUp:     (email: string, password: string) => Promise<{ error?: string; verificationRequired?: boolean }>;
  signIn:     (email: string, password: string) => Promise<{ error?: string }>;
  resendConfirmation: (email: string) => Promise<{ error?: string }>;
  signOut:    () => Promise<void>;
  signOutAllDevices: () => Promise<void>;
  updateProfile: (data: Partial<WMUser>) => Promise<{ error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null, loading: true,
  signUp: async () => ({}),
  signIn:  async () => ({}),
  resendConfirmation: async () => ({}),
  signOut: async () => {},
  signOutAllDevices: async () => {},
  updateProfile: async () => ({}),
  refreshUser: async () => {},
});

export function useAuth() { return useContext(AuthContext); }

const SESSION_KEY = "wm_session_v1";

async function readResponseJson(response: Response): Promise<Record<string, unknown>> {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

function readCachedUser(): WMUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as WMUser) : null;
  } catch { return null; }
}

function writeCachedUser(u: WMUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<WMUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();

  // Restore from localStorage immediately on first render to prevent flash-to-login
  useEffect(() => {
    const cached = readCachedUser();
    if (cached) setUser(cached);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res  = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const raw = data.user ?? null;
        const u: WMUser | null = raw ? {
          ...raw,
          verified: raw.verified === true,
          ceo: isCoreTeam(raw.handle, raw.email),
        } : null;
        setUser(u);
        writeCachedUser(u);
      } else {
        // Cookie gone — clear cache only if we have no cached user
        // (avoid signing out on transient network errors)
        const cached = readCachedUser();
        if (!cached) setUser(null);
        else setUser(cached); // keep showing cached user
        writeCachedUser(null);
        setUser(null);
      }
    } catch {
      // Network error — keep cached session alive
      const cached = readCachedUser();
      if (cached) setUser(cached);
    } finally {
      setLoading(false);
    }
  }, []);

  // Hydrate on mount
  useEffect(() => { refreshUser(); }, [refreshUser]);

  // Route guard
  useEffect(() => {
    if (loading) return;
    const isPublic = isPublicAuthPath(pathname);
    if (!user && !isPublic) {
      router.replace("/login");
      return;
    }
    // Completeness must use the same rule the server uses in /api/auth/login:
    // an existing display name is itself proof the profile was completed, even
    // when the flag did not survive (stale cookie, metadata write that never
    // landed). Without this the guard bounces the user back to /profile on
    // every navigation and they can never reach the rest of the app.
    const profileDone = !!user && (user.profileComplete || !!user.displayName);
    if (user && !profileDone && !pathname.startsWith("/profile") && !pathname.startsWith("/login")) {
      router.replace("/profile?setup=1");
      return;
    }
    if (user && isPublic) {
      router.replace("/charts");
    }
  }, [user, loading, pathname, router]);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await readResponseJson(res);
      if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Signup failed" };
      if (data.verificationRequired === true) return { verificationRequired: true };
      await refreshUser();
      return {};
    } catch {
      return { error: "We could not reach the account service. Check your connection and try again." };
    }
  }, [refreshUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await readResponseJson(res);
      if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Login failed" };
      await refreshUser();
      return {};
    } catch {
      return { error: "We could not reach the account service. Check your connection and try again." };
    }
  }, [refreshUser]);

  const resendConfirmation = useCallback(async (email: string) => {
    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
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
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    try { clearAllSessionSymbols(); } catch { /* never block sign-out on store cleanup */ }
    try { clearPaperState(); }         catch { /* never block sign-out on store cleanup */ }
    writeCachedUser(null);
    setUser(null);
    router.replace("/login");
  }, [router]);

  // Revoke every session everywhere (bumps the server-side session epoch), then
  // sign out locally. Other devices drop at their next /api/auth/me poll.
  const signOutAllDevices = useCallback(async () => {
    try {
      await fetch("/api/auth/logout-all", { method: "POST", credentials: "include" });
    } catch { /* still clear locally below */ }
    try { clearAllSessionSymbols(); } catch { /* never block sign-out on store cleanup */ }
    try { clearPaperState(); }         catch { /* never block sign-out on store cleanup */ }
    writeCachedUser(null);
    setUser(null);
    router.replace("/login");
  }, [router]);

  const updateProfile = useCallback(async (updates: Partial<WMUser>) => {
    const res = await fetch("/api/auth/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Update failed" };
    setUser(prev => prev ? { ...prev, ...updates } : null);
    return {};
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, resendConfirmation, signOut, signOutAllDevices, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
