"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";

import { readPlanEntitlements, type PlanEntitlements } from "./planEntitlements";

/**
 * The signed-in member's plan limits, AS THE SERVER DECIDED THEM (GET /api/billing/standing → `entitlements`).
 * null = not known (signed out, still reading, or the read failed): the chart never gates on an unknown plan,
 * so a slow or failed read can never strip a paying member's chart. Read once per member per mount.
 */
export function usePlanEntitlements(): PlanEntitlements | null {
  const { user } = useAuth();
  const [ent, setEnt] = useState<PlanEntitlements | null>(null);
  const who = user ? user.id : null;
  useEffect(() => {
    if (!who) { setEnt(null); return; }
    let live = true;
    fetch("/api/billing/standing", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (live) setEnt(readPlanEntitlements(j?.entitlements)); })
      .catch(() => { if (live) setEnt(null); });
    return () => { live = false; };
  }, [who]);
  return ent;
}
