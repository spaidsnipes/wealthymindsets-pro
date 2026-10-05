"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";

/**
 * Is the signed-in user the broker OWNER? (garden pass 2026-10-05.)
 *
 * The owner-only broker panels each discovered "not yours" by calling an
 * owner route and reading a 403 — and several then painted that refusal as a
 * fault (red "BLOCKED", "did not answer", raw codes). This is the one place a
 * client asks, once per account: `/api/broker/readiness` answers every
 * signed-in user with `audience: "OWNER" | "GUEST"`.
 *
 * null while asking. Fails CLOSED: no answer, an error or no session is GUEST.
 * Cached per user id, so a different account in the same tab asks again.
 */
export type BrokerAudience = "OWNER" | "GUEST";

const answers = new Map<string, Promise<BrokerAudience>>();

function ask(userId: string): Promise<BrokerAudience> {
  let p = answers.get(userId);
  if (!p) {
    p = fetch("/api/broker/readiness", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then((j): BrokerAudience => (j?.audience === "OWNER" ? "OWNER" : "GUEST"))
      .catch((): BrokerAudience => "GUEST");
    answers.set(userId, p);
  }
  return p;
}

export function useBrokerAudience(): BrokerAudience | null {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;
  const [audience, setAudience] = useState<BrokerAudience | null>(null);
  useEffect(() => {
    if (loading) { setAudience(null); return; }
    if (!userId) { setAudience("GUEST"); return; }
    let live = true;
    setAudience(null);
    void ask(userId).then(a => { if (live) setAudience(a); });
    return () => { live = false; };
  }, [userId, loading]);
  return audience;
}
