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
  const { data, error } = await Promise.resolve(admin.rpc("wm_read_decision_position", {
    p_owner_id: "00000000-0000-0000-0000-000000000000",
    p_decision_id: "__wm_authority_probe__",
  })).catch(() => ({ data: null, error: { code: "TRANSPORT_UNVERIFIED" } }));

  if (error || !Array.isArray(data) || data.length !== 0) {
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
 * GET — two questions through one door.
 *
 * Without `decisionId`: "how far does this book reach, really?" The answer is
 * the evidence `PAPER_STORE_FACTS`/`selectCapitalReach` needs, and it is
 * deliberately shaped as that seam's input rather than as a status page.
 *
 * With `decisionId`: "what does the authority hold for THIS decision?" — the
 * arrow that was missing. Until this existed the authority was WRITE-ONLY:
 * POST could record an intent and nothing could ever project it back, so §5
 * STEP 9 ("the phone is the same position") named a record no second device
 * could read. A record nobody can read is not shared truth, it is storage.
 *
 * WHY ONE ROUTE AND NOT A SECOND (H21). Both questions are answered by the
 * same authority under the same session and the same law version. A second
 * endpoint would be a second place where "is the store reachable" is decided,
 * and the two would eventually disagree about whether it is.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const decisionId = new URL(request.url).searchParams.get("decisionId");
  if (decisionId !== null && decisionId.trim() !== "") {
    return projectPosition(auth.user.sub, decisionId);
  }

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
 * THE ONE READ. Both the version check before a write and the projection a
 * second device asks for come through here, so there is exactly one place
 * that decides what "the authority did not answer" means. Two readers would
 * eventually disagree, and the disagreement would be invisible: one of them
 * would quietly treat an unreachable store as an empty one.
 *
 * `{ ok: false }` is NOT `{ ok: true, row: null }`. The first is "WM could not
 * ask"; the second is "WM asked and this decision is not there." Collapsing
 * them is how an outage starts reading as FLAT.
 */
type PositionRead = { ok: true; row: Record<string, unknown> | null } | { ok: false };

async function readPosition(ownerId: string, decisionId: string): Promise<PositionRead> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false };

  const { data, error } = await Promise.resolve(admin.rpc("wm_read_decision_position", {
    p_owner_id: ownerId,
    p_decision_id: decisionId,
  })).catch(() => ({ data: null, error: { code: "TRANSPORT_UNVERIFIED" } }));

  if (error || !Array.isArray(data)) return { ok: false };
  if (data.length === 0) return { ok: true, row: null };

  const row: unknown = data[0];
  if (!row || typeof row !== "object" || Array.isArray(row)) return { ok: false };
  return { ok: true, row: row as Record<string, unknown> };
}

/**
 * The version the authority currently holds. A record that does not exist is
 * at version 0, so a first intent write names 0 and lands at 1 — the same
 * arithmetic as every later write, with no special case for "new".
 */
async function currentVersion(ownerId: string, decisionId: string): Promise<number | null> {
  const read = await readPosition(ownerId, decisionId);
  if (!read.ok) return null;
  if (read.row === null) return 0;
  return readVersion(read.row.recon_version);
}

/**
 * Project the canonical record for one decision onto whichever device asked.
 *
 * THREE ANSWERS, THREE MEANINGS — and the reason this is not a bare row dump:
 *
 *   UNVERIFIED — WM could not ask the authority. It does not know. It must not
 *     answer "no position", because a phone that reads absence as FLAT while
 *     the broker holds three contracts is §14's very first forbidden state.
 *
 *   NOT_RECORDED — WM asked and the authority has never heard of this
 *     decision. Real, healthy, and NOT the same as a position of size zero.
 *
 *   PROJECTED — the record, exactly as the authority holds it. `null` in a
 *     settled-truth column stays `null`: H1 — absence is not zero. Nothing
 *     here is defaulted, because a default is this route inventing broker
 *     truth, and §11 says only reconciliation may speak it.
 */
async function projectPosition(ownerId: string, decisionId: string) {
  const read = await readPosition(ownerId, decisionId);

  if (!read.ok) {
    return NextResponse.json({
      lawVersion: RECON_LAW_VERSION,
      status: "UNVERIFIED",
      position: null,
      note:
        "WM could not read the shared record for this decision, so it is not reporting "
        + "one. This does not mean the position is flat or that the decision is unknown.",
    }, { status: 503 });
  }

  if (read.row === null) {
    return NextResponse.json({
      lawVersion: RECON_LAW_VERSION,
      status: "NOT_RECORDED",
      position: null,
      note:
        "The shared record holds nothing for this decision. Nothing has been written "
        + "here yet — that is not the same as a position of size zero.",
    }, { status: 200 });
  }

  const reconVersion = readVersion(read.row.recon_version);
  if (reconVersion === null) {
    // A row whose version cannot be read cannot be safely amended later: the
    // next write would name a base version WM invented. Refuse to project it
    // rather than hand a device a record it could overwrite from.
    return NextResponse.json({
      lawVersion: RECON_LAW_VERSION,
      status: "UNVERIFIED",
      position: null,
      note:
        "WM read a shared record it could not verify the version of, so it is not "
        + "projecting it. This does not mean the position is flat.",
    }, { status: 503 });
  }

  return NextResponse.json({
    lawVersion: RECON_LAW_VERSION,
    status: "PROJECTED",
    authority: SHARED_POSITION_AUTHORITY,
    position: {
      decisionId,
      reconVersion,
      intent: nullableString(read.row.intent),
      intentDeviceId: nullableString(read.row.intent_device_id),
      // §11 / H1: these are the broker's words or they are absent. Never 0.
      quantityFilled: nullableNumber(read.row.quantity_filled),
      quantityProtected: nullableNumber(read.row.quantity_protected),
      executionState: nullableString(read.row.execution_state),
      protectionState: nullableString(read.row.protection_state),
    },
    note: "Every signed-in device projects this record. Nothing here was defaulted.",
  }, { status: 200 });
}

/** Absent stays absent. A missing value may not become "" on the way out. */
function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * Absent stays absent. NOT YET RECONCILED is not zero — the migration says so
 * in the schema comment and this is the only place that could betray it.
 * Postgres `numeric` arrives over PostgREST as a string, so a digit string is
 * a real number here; anything unparseable is treated as absent rather than
 * coerced to 0 by `Number("")` or `Number(null)`.
 */
function nullableNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readVersion(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return null;
  const version = Number(value);
  return Number.isSafeInteger(version) && version >= 0 ? version : null;
}
