/**
 * THE FROZEN PLAN, KEPT BY DECISION_ID — Garden 19 §27. Storage injected.
 *
 * One record per Decision_ID. `freezePlanOnce` never replaces a frozen plan:
 * the first freeze wins (the ticket at send beats a later journal entry), and
 * hindsight cannot rewrite it. Changes arrive only as dated amendments through
 * `appendPlanAmendment`, which keeps the frozen base byte-for-byte.
 *
 * Written only by a trader's own action (the ticket's send, an amendment the
 * trader saves). It is not the journal store; it is purged at sign-out
 * (logoutIsolation OWNER_SCOPED_KEYS).
 */

import { amendPlan, readPlanSnapshot, type ManagementPlanSnapshot, type PlanAmendment } from "./managementPlan";

export const MANAGEMENT_PLAN_KEY = "wm:management-plan:v1";
export const MANAGEMENT_PLAN_MAX = 400;

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

function readAll(storage: Storage | null | undefined): Record<string, ManagementPlanSnapshot> {
  if (!storage) return {};
  let raw: string | null = null;
  try { raw = storage.getItem(MANAGEMENT_PLAN_KEY); } catch { return {}; }
  if (!raw) return {};
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return {}; }
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, ManagementPlanSnapshot> = {};
  for (const [k, r] of Object.entries(v as Record<string, unknown>)) {
    const s = readPlanSnapshot(r);
    if (s && s.base.decisionId === k) out[k] = s;
  }
  return out;
}

function writeAll(storage: Storage, all: Record<string, ManagementPlanSnapshot>): boolean {
  const keys = Object.keys(all).sort((a, b) => all[a].frozenAtMs - all[b].frozenAtMs);
  const kept: Record<string, ManagementPlanSnapshot> = {};
  for (const k of keys.slice(-MANAGEMENT_PLAN_MAX)) kept[k] = all[k];
  try { storage.setItem(MANAGEMENT_PLAN_KEY, JSON.stringify(kept)); return true; } catch { return false; }
}

export function readPlanForDecision(storage: Storage | null | undefined, decisionId: string | null | undefined): ManagementPlanSnapshot | null {
  if (!decisionId) return null;
  return readAll(storage)[decisionId] ?? null;
}

export function readAllPlans(storage: Storage | null | undefined): Readonly<Record<string, ManagementPlanSnapshot>> {
  return readAll(storage);
}

export type FreezeOutcome = "FROZEN" | "ALREADY_FROZEN" | "NOT_STORED";

/** Store a plan unless one is already frozen for its Decision_ID. */
export function freezePlanOnce(storage: Storage | null | undefined, snap: ManagementPlanSnapshot | null): FreezeOutcome {
  if (!storage || !snap) return "NOT_STORED";
  const all = readAll(storage);
  if (all[snap.base.decisionId]) return "ALREADY_FROZEN";
  return writeAll(storage, { ...all, [snap.base.decisionId]: snap }) ? "FROZEN" : "NOT_STORED";
}

export type AppendOutcome =
  | { readonly ok: true; readonly snapshot: ManagementPlanSnapshot }
  | { readonly ok: false; readonly reason: string };

export function appendPlanAmendment(storage: Storage | null | undefined, decisionId: string, amendment: PlanAmendment): AppendOutcome {
  if (!storage) return { ok: false, reason: "No storage on this device." };
  const all = readAll(storage);
  const snap = all[decisionId];
  if (!snap) return { ok: false, reason: "No plan is frozen for this decision." };
  const r = amendPlan(snap, amendment);
  if (!r.ok) return r;
  return writeAll(storage, { ...all, [decisionId]: r.snapshot }) ? r : { ok: false, reason: "This device would not keep the amendment." };
}

/**
 * Garden 19 §47–51 — ERASE a decision's plan. Its amendments live inside the
 * snapshot, so they go with it (nothing can orphan). The trader's own action
 * only. Returns whether a plan was there.
 */
export function deletePlanForDecision(storage: Storage | null | undefined, decisionId: string): boolean {
  if (!storage) return false;
  const all = readAll(storage);
  if (!all[decisionId]) return false;
  delete all[decisionId];
  return writeAll(storage, all);
}
