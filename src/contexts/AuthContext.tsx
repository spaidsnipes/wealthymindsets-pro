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

export interface WMUser {
  id:             string;
  email:          string;
  displayName?:   string;
  handle?:        string;
  avatar?:        string;        // data URL or remote URL
  bio?:           string;
  profileComplete: boolean;
  verified?:      boolean;       // blue checkmark
  ceo?:           boolean;       // WM core team crown badge
}

interface AuthState {
  user:       WMUser | null;
  loading:    boolean;
  signUp:     (email: string, password: string) => Promise<{ error?: string }>;
  signIn:     (email: string, password: string) => Promise<{ error?: string }>;
  signOut:    () => Promise<void>;
  updateProfile: (data: Partial<WMUser>) => Promise<{ error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null, loading: true,
  signUp: async () => ({}),
  signIn:  async () => ({}),
  signOut: async () => {},
  updateProfile: async () => ({}),
  refreshUser: async () => {},
});

export function useAuth() { return useContext(AuthContext); }

const PUBLIC_PATHS = ["/login", "/signup"];

const SESSION_KEY = "wm_session_v1";

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
          verified: true, // all registered users get a check
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
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
    if (!user && !isPublic) {
      router.replace("/login");
      return;
    }
    if (user && !user.profileComplete && !pathname.startsWith("/profile") && !pathname.startsWith("/login")) {
      router.replace("/profile?setup=1");
      return;
    }
    if (user && isPublic) {
      router.replace("/charts");
    }
  }, [user, loading, pathname, router]);

  const signUp = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Signup failed" };
    await refreshUser();
    return {};
  }, [refreshUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Login failed" };
    await refreshUser();
    return {};
  }, [refreshUser]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
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
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
