import { NextResponse } from "next/server";
import { resolveSupabaseServiceKey, SERVICE_KEY_VARS } from "@/lib/supabaseConfigStatus";
import { requireAuth } from "@/lib/requireAuth";

/**
 * Founder-only diagnostic: list ALL rows in wm_market_coverage_checkpoints
 * for the current instrument, WITHOUT filtering by owner_id. Answers:
 *
 *   "Codex morning checkpoint said BTC observed_from = 09:15 UTC. This
 *    evening's authenticated read says 14:35 UTC. Did the morning row get
 *    deleted, or does it still exist under a different owner_id (JWT sub
 *    rotation between sessions)?"
 *
 * If more than one row per (instrument_id, channel, provider_path) shows
 * up, that confirms the rotate theory. If only the current one exists,
 * something deleted the morning row.
 *
 * Never exposes data — the current DB has exactly one user (the founder).
 * Auth-gated so a hostile visitor can't enumerate structure.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = resolveSupabaseServiceKey(process.env);
  if (!url || !serviceKey) {
    {
      const missing: string[] = [];
      if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
      if (!serviceKey) missing.push(SERVICE_KEY_VARS.join(" (or ") + ")");
      return NextResponse.json(
        {
          error: `Coverage inspection is NOT CONFIGURED on this host runtime — missing required ${missing.length === 1 ? "variable" : "variables"}: ${missing.join(", ")}. Set them in the host runtime secrets (e.g. Cloudflare) and redeploy.`,
          edge: "NOT CONFIGURED",
          missing,
        },
        { status: 503 },
      );
    }
  }

  const params = new URL(request.url).searchParams;
  const instrument = params.get("instrument_id") ?? "BTC";

  const query = new URL(`${url}/rest/v1/wm_market_coverage_checkpoints`);
  query.searchParams.set("instrument_id", `eq.${instrument}`);
  query.searchParams.set("select", "owner_id,instrument_id,channel,provider_path,observed_from,observed_through,observed_event_count,updated_at");
  query.searchParams.set("order", "observed_from.asc");
  query.searchParams.set("limit", "50");

  const res = await fetch(query, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Supabase query failed", status: res.status }, { status: 502 });
  }
  const rows = await res.json() as Array<{
    owner_id: string;
    instrument_id: string;
    channel: string;
    provider_path: string;
    observed_from: number;
    observed_through: number;
    observed_event_count: number;
    updated_at: string;
  }>;

  // Aggregate: per (channel, provider_path) how many owner_ids exist and
  // what is the EARLIEST observed_from across ALL of them.
  const groupKey = (r: typeof rows[number]) => `${r.channel}|${r.provider_path}`;
  const groups = new Map<string, {
    channel: string;
    providerPath: string;
    rowCount: number;
    distinctOwners: number;
    earliestObservedFrom: number;
    earliestObservedFromISO: string;
    currentOwnerObservedFrom: number | null;
    currentOwnerObservedFromISO: string | null;
    isRegression: boolean;
    owners: Array<{ ownerId: string; observedFrom: number; observedFromISO: string; observedThrough: number; count: number; updatedAt: string; isCurrentUser: boolean }>;
  }>();

  for (const row of rows) {
    const key = groupKey(row);
    const existing = groups.get(key);
    const ownerEntry = {
      ownerId: row.owner_id,
      observedFrom: row.observed_from,
      observedFromISO: new Date(row.observed_from).toISOString(),
      observedThrough: row.observed_through,
      count: row.observed_event_count,
      updatedAt: row.updated_at,
      isCurrentUser: row.owner_id === auth.user.sub,
    };
    if (!existing) {
      groups.set(key, {
        channel: row.channel,
        providerPath: row.provider_path,
        rowCount: 1,
        distinctOwners: 1,
        earliestObservedFrom: row.observed_from,
        earliestObservedFromISO: new Date(row.observed_from).toISOString(),
        currentOwnerObservedFrom: row.owner_id === auth.user.sub ? row.observed_from : null,
        currentOwnerObservedFromISO: row.owner_id === auth.user.sub ? new Date(row.observed_from).toISOString() : null,
        isRegression: false,
        owners: [ownerEntry],
      });
    } else {
      existing.rowCount += 1;
      if (!existing.owners.some(o => o.ownerId === row.owner_id)) existing.distinctOwners += 1;
      if (row.observed_from < existing.earliestObservedFrom) {
        existing.earliestObservedFrom = row.observed_from;
        existing.earliestObservedFromISO = new Date(row.observed_from).toISOString();
      }
      if (row.owner_id === auth.user.sub) {
        existing.currentOwnerObservedFrom = row.observed_from;
        existing.currentOwnerObservedFromISO = new Date(row.observed_from).toISOString();
      }
      existing.owners.push(ownerEntry);
    }
  }

  // Mark regression when current owner's observedFrom is LATER than the
  // earliest across all owners (meaning morning history exists elsewhere).
  for (const g of groups.values()) {
    g.isRegression = g.currentOwnerObservedFrom != null &&
      g.currentOwnerObservedFrom > g.earliestObservedFrom;
  }

  return NextResponse.json({
    instrument,
    currentUserSub: auth.user.sub,
    totalRows: rows.length,
    groups: [...groups.values()],
    interpretation: {
      multipleOwnersSeen: [...groups.values()].some(g => g.distinctOwners > 1),
      observedFromRegressionDetected: [...groups.values()].some(g => g.isRegression),
      hint: [...groups.values()].some(g => g.distinctOwners > 1)
        ? "Multiple owner_ids exist. Auth sub is rotating between sessions — coverage rows are being written under different identities. Fix: bind coverage owner_id to a stable identity (e.g. Passport root), not per-session JWT sub."
        : "Only one owner_id per group. If observedFrom regressed, something DELETED the earlier row. Check RLS + any cleanup jobs.",
    },
  });
}
