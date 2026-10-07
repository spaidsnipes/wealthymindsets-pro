"use client";

/**
 * The server-held order limits and kill switch (GET/PUT /api/execution/limits),
 * one read per tab shared by every surface. A refusal or failure reads as
 * `limits: null` — the ticket then shows LIMITS UNSET, never a guessed cap.
 */

import { useEffect, useSyncExternalStore } from "react";

import { readServerOrderLimits, type ServerOrderLimits, type TradeEnvironment } from "./liveOrderPreflight";

export interface ServerLimitsSnapshot {
  readonly state: "LOADING" | "SET" | "UNSET" | "NO_STORE" | "NOT_OWNER" | "UNREADABLE";
  readonly limits: ServerOrderLimits | null;
  readonly environment: TradeEnvironment | null;
  readonly reason: string | null;
}

let snap: ServerLimitsSnapshot = { state: "LOADING", limits: null, environment: null, reason: null };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

function accept(j: Record<string, unknown> | null, status: number) {
  if (status === 403) { snap = { state: "NOT_OWNER", limits: null, environment: null, reason: null }; return; }
  const env = j?.environment === "cert" ? "cert" : j?.environment === "production" ? "production" : null;
  const state = j?.state === "SET" || j?.state === "UNSET" || j?.state === "NO_STORE" ? (j.state as ServerLimitsSnapshot["state"]) : "UNREADABLE";
  snap = { state, limits: j?.limits ? readServerOrderLimits(j.limits) : null, environment: env, reason: typeof j?.reason === "string" ? j.reason : null };
}

export function refreshServerOrderLimits(): Promise<void> {
  inflight ??= fetch("/api/execution/limits", { cache: "no-store" })
    .then(async r => accept((await r.json().catch(() => null)) as Record<string, unknown> | null, r.status))
    .catch(() => { snap = { state: "UNREADABLE", limits: null, environment: null, reason: "The limits did not load." }; })
    .finally(() => { inflight = null; emit(); });
  return inflight;
}

/** PUT a change; the answer (including a refusal) replaces the snapshot. */
export async function changeServerOrderLimits(patch: Record<string, unknown>): Promise<{ ok: boolean; reason: string | null }> {
  try {
    const r = await fetch("/api/execution/limits", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    const j = (await r.json().catch(() => null)) as Record<string, unknown> | null;
    if (r.ok) { accept(j, r.status); emit(); return { ok: true, reason: null }; }
    await refreshServerOrderLimits();
    return { ok: false, reason: typeof j?.reason === "string" ? j.reason : `HTTP ${r.status}` };
  } catch {
    return { ok: false, reason: "The change did not reach the server." };
  }
}

const get = () => snap;
export function useServerOrderLimits(enabled = true): ServerLimitsSnapshot {
  useEffect(() => { if (enabled) void refreshServerOrderLimits(); }, [enabled]);
  return useSyncExternalStore(subscribe, get, get);
}
