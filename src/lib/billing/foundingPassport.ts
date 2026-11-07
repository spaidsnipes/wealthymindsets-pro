/**
 * WM PRO — FOUNDING: THE PASSPORT CALLS (server only; service role via supabaseAdmin).
 *
 * Every call answers `{ ok: true, data }` or `{ ok: false }` — never throws, never guesses. The RPCs are
 * not applied until the Founder runs the FOUNDING SQL, so today every call is `{ ok: false }` (PostgREST
 * 404) and every caller fails CLOSED: no checkout, no grant.
 *
 * Also the ONE read of the FOUNDING 100 evidence: a trade decision the member recorded to their own account
 * (wm_read_decision_position, scoped by owner — a service-role caller still cannot read another member's).
 */
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

import { FOUNDING_APP } from "./founding";

export type RpcResult = { readonly ok: true; readonly data: unknown } | { readonly ok: false; readonly why: string };

export async function passportRpc(fn: string, args: Record<string, unknown>): Promise<RpcResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, why: "NO_PASSPORT_CONFIG" };
  try {
    const { data, error } = await Promise.resolve(admin.rpc(fn, args));
    if (error) return { ok: false, why: `RPC_ERROR ${String((error as { code?: unknown }).code ?? "")}`.trim() };
    return { ok: true, data };
  } catch {
    return { ok: false, why: "RPC_TRANSPORT" };
  }
}

export const foundingOpen = () => passportRpc("ath_svc_founding_open", { p_app: FOUNDING_APP });

export const founding500Reserve = (userId: string, holdMinutes: number) =>
  passportRpc("ath_svc_founding500_reserve", { p_user: userId, p_app: FOUNDING_APP, p_hold_minutes: holdMinutes });

export const founding500ApplyPaymentEvent = (a: {
  eventId: string; eventType: string; eventCreatedSec: number; livemode: boolean; userId: string;
  subscriptionRef: string; subscriptionStatus: string; paid: boolean;
}) => passportRpc("ath_svc_founding500_apply_payment_event", {
  p_provider: "stripe",
  p_event_id: a.eventId,
  p_event_type: a.eventType,
  p_event_created: new Date(a.eventCreatedSec * 1000).toISOString(),
  p_livemode: a.livemode,
  p_user: a.userId,
  p_app: FOUNDING_APP,
  p_subscription_ref: a.subscriptionRef,
  p_subscription_status: a.subscriptionStatus,
  p_paid: a.paid,
});

export const founding100Claim = (userId: string, activityKind: string, evidenceRef: string) =>
  passportRpc("ath_svc_founding100_claim", { p_user: userId, p_app: FOUNDING_APP, p_activity_kind: activityKind, p_evidence_reference: evidenceRef });

export const entitlementsFor = (userId: string) => passportRpc("ath_svc_entitlements_for", { p_user: userId });

/**
 * FOUNDING 100 EVIDENCE. Did THIS member record THIS decision to their account? True only when the shared
 * decision store answers with exactly one row for (owner, decision) that carries a written intent at
 * version ≥ 1. `null` = the store could not be asked (fail closed, never "no").
 */
export async function memberRecordedDecision(userId: string, decisionId: string): Promise<boolean | null> {
  const got = await passportRpc("wm_read_decision_position", { p_owner_id: userId, p_decision_id: decisionId });
  if (!got.ok || !Array.isArray(got.data)) return null;
  if (got.data.length !== 1) return got.data.length === 0 ? false : null;
  const row = got.data[0] as Record<string, unknown> | null;
  if (!row || typeof row !== "object" || row.decision_id !== decisionId) return false;
  const version = typeof row.recon_version === "number" ? row.recon_version : Number(row.recon_version);
  return typeof row.intent === "string" && row.intent.trim() !== "" && Number.isFinite(version) && version >= 1;
}
