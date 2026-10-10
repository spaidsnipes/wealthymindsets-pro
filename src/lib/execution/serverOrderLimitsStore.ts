/**
 * WHERE THE SERVER-HELD ORDER LIMITS LIVE — Garden 19 §23 / P0.3.
 *
 * The browser's Settings › Execution ceilings (guardrails.ts) are the trader's
 * commitments on ONE device; the server cannot trust them. These limits are
 * held by the deployment (the WEBULL_SESSION KV namespace, the same store as
 * the order → Decision_ID ledger), keyed by the owner, and read by the
 * order-submit route on every send. No store, nothing stored, or unreadable →
 * the route refuses (fail closed).
 *
 * Changing them (applyLimitsChange, PURE):
 *   · engaging the kill switch is always allowed and disarms in the same write;
 *   · releasing it needs an explicit `releaseKillSwitch: true` — a stray
 *     `killSwitch: false` never releases it;
 *   · arming while the kill switch is engaged is refused;
 *   · SpaidBot has no path here at all: only the owner's signed-in request
 *     reaches the route, and no bot code imports this file.
 */

import type { WebullKvNamespace } from "@/lib/marketData/webullKvTokenStore";

import { readServerOrderLimits, type ServerOrderLimits } from "./liveOrderPreflight";

export const serverLimitsKey = (ownerId: string) => `wm:execution-limits:v1:${ownerId}`;

export async function loadServerOrderLimits(kv: WebullKvNamespace | null, ownerId: string): Promise<ServerOrderLimits | null> {
  if (!kv) return null;
  const raw = await kv.get(serverLimitsKey(ownerId));
  return raw ? readServerOrderLimits(raw) : null;
}

export async function saveServerOrderLimits(kv: WebullKvNamespace, ownerId: string, limits: ServerOrderLimits): Promise<void> {
  await kv.put(serverLimitsKey(ownerId), JSON.stringify(limits));
}

export interface LimitsPatch {
  readonly armed?: unknown;
  readonly killSwitch?: unknown;
  readonly releaseKillSwitch?: unknown;
  readonly maxContractsPerOrder?: unknown;
  readonly maxSharesPerOrder?: unknown;
  readonly maxNotionalUsdPerOrder?: unknown;
  readonly maxLossUsdPerOrder?: unknown;
  readonly maxQuoteAgeMs?: unknown;
  readonly maxOrdersPerMinute?: unknown;
  readonly maxOrdersPerDay?: unknown;
}

export type LimitsChange = { readonly ok: true; readonly limits: ServerOrderLimits } | { readonly ok: false; readonly reason: string };

const CAP_FIELDS = ["maxContractsPerOrder", "maxSharesPerOrder", "maxNotionalUsdPerOrder", "maxLossUsdPerOrder", "maxQuoteAgeMs", "maxOrdersPerMinute", "maxOrdersPerDay"] as const;

export function applyLimitsChange(current: ServerOrderLimits | null, patch: LimitsPatch, nowMs: number): LimitsChange {
  const base = readServerOrderLimits(current ?? null);
  // Caps: a present field replaces the stored one; null / "" clears it (which then refuses sends).
  const merged: Record<string, unknown> = { ...base };
  for (const k of CAP_FIELDS) if (k in patch) merged[k] = patch[k];

  let killSwitch = base.killSwitch;
  if (patch.killSwitch === true) killSwitch = true;
  if (patch.releaseKillSwitch === true) killSwitch = false;
  else if (patch.killSwitch === false && base.killSwitch) return { ok: false, reason: "The kill switch is released only by an explicit release (releaseKillSwitch: true)." };

  let armed = base.armed;
  if (patch.armed === true) armed = true;
  if (patch.armed === false) armed = false;
  if (killSwitch) {
    if (patch.armed === true) return { ok: false, reason: "The kill switch is engaged. Release it before arming." };
    armed = false;
  }
  return { ok: true, limits: readServerOrderLimits({ ...merged, armed, killSwitch, updatedAtMs: nowMs }) };
}
