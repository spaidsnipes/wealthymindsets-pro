/**
 * /api/decision-position — THE SHARED DECISION / POSITION AUTHORITY, wired.
 *
 * BUILD ORDER §22A / Known Holes H16 name one gap: position state lives in
 * per-device localStorage, so "the phone is the same position" (§5 STEP 9) is
 * a sentence WM cannot honour. `sharedPositionAuthority.ts` wrote the law and
 * `20260907080000_wm_decision_position_shared_authority.sql` wrote the table.
 * This is the only door between them.
 *
 * THREE THINGS THIS ROUTE REFUSES TO DO
 *
 * 1. It does not re-implement the law. Every write goes through `decideWrite`
 *    from the pure module. H21: one owner per rule. If this file ever grows
 *    its own version comparison, the two will drift and the phone will win an
 *    argument it should lose.
 *
 * 2. It does not pretend the authority exists. If Supabase is unconfigured on
 *    this runtime, or the migration has not been applied, GET answers
 *    `authority: null` — which is precisely what `selectCapitalReach` reads to
 *    keep saying THIS_BROWSER_ONLY. Cross-device parity is claimed by
 *    EVIDENCE that the table answered, never by the presence of a SQL file in
 *    the repo. That distinction is the entire point of the capitalReach seam.
 *
 * 3. It does not let a client be a broker. §11 — "Only the reconciliation
 *    worker writes quantity and working-order truth." A session cookie
 *    authenticates a HUMAN; the reconciliation role additionally requires the
 *    worker secret, because a signed-in phone is still not a broker.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuth } from "@/lib/requireAuth";
import {
  decideWrite,
  RECON_LAW_VERSION,
  SHARED_POSITION_AUTHORITY,
  type AuthorityWrite,
} from "@/lib/traderMemory/sharedPositionAuthority";

export const runtime = "nodejs";

/**
 * Does the authority actually answer?
 *
 * Not "is a client configured" — that only proves this process has a URL and
 * a key. It asks the table a question. An unapplied migration and a missing
 * env var are the same fact to the trader (his phone cannot see his position)
 * and they are reported as the same state.
 */
async function probeAuthority(): Promise<
  { reachable: true } | { reachable: false; because: string }
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      reachable: false,
      because:
        "This host runtime has no Supabase configuration, so there is no shared "
        + "record for a second device to read.",
    };
  }

  // A read for a decision id that cannot exist. Success means the RPC is
  // present and callable; zero rows is the expected, healthy answer.
  const { error } = await Promise.resolve(admin.rpc("wm_read_decision_position", {
    p_owner_id: "00000000-0000-0000-0000-000000000000",
    p_decision_id: "__wm_authority_probe__",
  })).catch(() => ({ error: { code: "TRANSPORT_UNVERIFIED" } }));

  if (error) {
    return {
      reachable: false,
      because:
        "The shared position store did not answer this check. Its availability "
        + "is unverified; this response does not establish that the table is missing.",
    };
  }

  return { reachable: true };
}

/**
 * GET — "how far does this book reach, really?"
 *
 * The answer is the evidence `PAPER_STORE_FACTS`/`selectCapitalReach` needs,
 * and it is deliberately shaped as that seam's input rather than as a status
 * page: a surface should not have to interpret this, it should be able to
 * hand it straight to the selector that already knows the law.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const probe = await probeAuthority();

  if (!probe.reachable) {
    return NextResponse.json(
      {
        lawVersion: RECON_LAW_VERSION,
        // null is the honest value and the one the reach selector reads.
        // §8: this is a designed boundary, not a failure.
        serverAuthority: null,
        note:
          probe.because
          + " Until then, a position opened here is visible on this device only.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    {
      lawVersion: RECON_LAW_VERSION,
      serverAuthority: SHARED_POSITION_AUTHORITY,
      note: "Every signed-in device reads this same record.",
    },
    { status: 200 },
  );
}

/** The worker proves it is the worker. A session cookie proves only a human. */
function isReconciliationWorker(request: Request): boolean {
  const secret = process.env.WM_RECONCILIATION_WORKER_SECRET;
  if (!secret) return false;
  return request.headers.get("x-wm-reconciliation-worker") === secret;
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { verdict: "REJECT_ROLE", note: "WM could not read that request as a position write." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { verdict: "REJECT_ROLE", note: "WM could not read that request as a position write." },
      { status: 400 },
    );
  }

  const write = body as Partial<AuthorityWrite> & Record<string, unknown>;

  if (typeof write.decisionId !== "string" || write.decisionId.trim() === "") {
    return NextResponse.json(
      {
        verdict: "REJECT_ROLE",
        note: "A position write must name the decision it belongs to. WM did not apply it.",
      },
      { status: 400 },
    );
  }

  if (typeof write.baseReconVersion !== "number" || !Number.isInteger(write.baseReconVersion)) {
    return NextResponse.json(
      {
        verdict: "REJECT_STALE",
        note:
          "This device did not say which version of the position it is amending, so WM "
          + "could not tell whether it is up to date. Re-read the position and try again.",
      },
      { status: 409 },
    );
  }

  // §11 AT THE DOOR. Anyone may claim the role in JSON; only the worker can
  // prove it. An unproven claim is downgraded to CLIENT_INTENT rather than
  // rejected outright, so `decideWrite` gets to state the real problem —
  // that a device tried to record broker truth — in its own words.
  const claimedRecon = write.role === "RECONCILIATION";
  const role = claimedRecon && isReconciliationWorker(request) ? "RECONCILIATION" : "CLIENT_INTENT";

  const version = await currentVersion(auth.user.sub, write.decisionId);
  if (version === null) return unavailableWrite();
  const decision = decideWrite(
    version,
    { ...(write as object), role } as AuthorityWrite,
  );

  if (decision.verdict !== "ACCEPT") {
    return NextResponse.json(decision, {
      status: decision.verdict === "REJECT_STALE" ? 409 : 403,
    });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      {
        verdict: "REJECT_STALE",
        nextReconVersion: null,
        lawVersion: RECON_LAW_VERSION,
        note:
          "This host runtime has no shared position store, so WM did not record the "
          + "change rather than record it somewhere only this device can see.",
      },
      { status: 503 },
    );
  }

  // THE ATOMIC HALF. `decideWrite` said this write MAY land; the RPC's
  // versioned WHERE clause decides whether it DID, when two devices passed
  // the same check at the same moment. A null return means the other one won.
  const applied =
    role === "RECONCILIATION"
      ? await Promise.resolve(admin.rpc("wm_apply_decision_reconciliation", {
          p_owner_id: auth.user.sub,
          p_decision_id: write.decisionId,
          p_base_version: write.baseReconVersion,
          p_quantity_filled: write.quantityFilled ?? null,
          p_quantity_protected: write.quantityProtected ?? null,
          p_execution_state: write.executionState ?? null,
          p_protection_state: write.protectionState ?? null,
        })).catch(unverifiedTransport)
      : await Promise.resolve(admin.rpc("wm_record_decision_intent", {
          p_owner_id: auth.user.sub,
          p_decision_id: write.decisionId,
          p_base_version: write.baseReconVersion,
          p_intent: typeof write.intent === "string" ? write.intent : null,
          p_device_id: typeof write.deviceId === "string" ? write.deviceId : null,
        })).catch(unverifiedTransport);

  if (applied.error) return unavailableWrite();

  if (applied.data === null) {
    return NextResponse.json(
      {
        verdict: "REJECT_STALE",
        nextReconVersion: null,
        lawVersion: RECON_LAW_VERSION,
        note:
          "Another device changed this position at the same moment, so WM kept that "
          + "change and did not apply this one. Nothing was lost — re-read the position "
          + "and send it again.",
      },
      { status: 409 },
    );
  }

  const appliedVersion = readVersion(applied.data);
  if (appliedVersion === null) return unavailableWrite();
  return NextResponse.json(
    { ...decision, nextReconVersion: appliedVersion },
    { status: 200 },
  );
}

function unavailableWrite() {
  return NextResponse.json({
    verdict: "UNVERIFIED",
    nextReconVersion: null,
    lawVersion: RECON_LAW_VERSION,
    note: "WM could not verify the shared position write. Re-read the position before retrying; this response does not prove a conflicting device or a saved change.",
  }, { status: 503 });
}

function unverifiedTransport() {
  return { data: null, error: { code: "TRANSPORT_UNVERIFIED" } };
}

/**
 * The version the authority currently holds. A record that does not exist is
 * at version 0, so a first intent write names 0 and lands at 1 — the same
 * arithmetic as every later write, with no special case for "new".
 */
async function currentVersion(ownerId: string, decisionId: string): Promise<number | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await Promise.resolve(admin.rpc("wm_read_decision_position", {
    p_owner_id: ownerId,
    p_decision_id: decisionId,
  })).catch(() => ({ data: null, error: { code: "TRANSPORT_UNVERIFIED" } }));

  if (error || !Array.isArray(data)) return null;
  if (data.length === 0) return 0;

  const row: unknown = data[0];
  if (!row || typeof row !== "object") return null;
  return readVersion((row as { recon_version?: unknown }).recon_version);
}

function readVersion(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return null;
  const version = Number(value);
  return Number.isSafeInteger(version) && version >= 0 ? version : null;
}
