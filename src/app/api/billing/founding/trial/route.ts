import { NextResponse } from "next/server";

import {
  FOUNDING_100_ACTIVITY_KIND, FOUNDING_OFF, foundingEvidenceRef, foundingLive, passportUuid, readClaim,
} from "@/lib/billing/founding";
import { founding100Claim, memberRecordedDecision } from "@/lib/billing/foundingPassport";
import { requestIsSameOrigin } from "@/lib/broker/credentialProbeGate";
import { checkRateLimit } from "@/lib/rateLimit";
import { requireAuth } from "@/lib/requireAuth";
import { isDecisionId } from "@/lib/traderMemory/decisionIdentity";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const LIMIT = { max: 5, windowMs: 10 * 60_000 } as const;
const MAX_CANDIDATES = 10;
const say = (body: object, status: number) => NextResponse.json(body, { status, headers: NO_STORE });
const NOT_NOW = { error: "FOUNDING 100 can't be claimed right now. Try again later.", code: "FOUNDING_UNAVAILABLE" } as const;

/**
 * POST /api/billing/founding/trial — FOUNDING 100: a free 30-day Premium trial after your first real save.
 * No card. No Stripe. It never charges, and the Passport grant ends by itself 30 days after it starts.
 *
 * Flag off → 404 FOUNDING_OFF.
 *
 * THE FIRST REAL SAVE, VERIFIED BY THE SERVER. The body may only PROPOSE decision ids this browser saw
 * (`{ decisionIds: string[] }`, at most ten). Each is checked against the member's OWN account: the shared
 * decision store (wm_read_decision_position, owner-scoped) must hold that decision, with a written intent,
 * for THIS member. That record exists only after the member placed an order and WM wrote the decision to
 * their account. The first one that verifies is the evidence (`wm_pro:decision:<id>`); a client flag,
 * a made-up id or someone else's decision verifies nothing.
 *
 * Fail closed: the store or the Passport cannot be asked → nothing is claimed.
 */
export async function POST(request: Request) {
  if (!foundingLive(process.env)) return say(FOUNDING_OFF, 404);
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (!requestIsSameOrigin(request)) return say({ error: "Cross-site request refused.", code: "CROSS_SITE_REFUSED" }, 403);
  { const rl = checkRateLimit(`founding-trial:${auth.user.sub}`, LIMIT); if (!rl.ok) return rl.response; }
  const user = passportUuid(auth.user.sub);
  if (!user) return say({ error: "FOUNDING 100 needs a WOW Passport sign-in.", code: "NOT_A_PASSPORT" }, 403);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const proposed = Array.isArray(body?.decisionIds) ? (body!.decisionIds as unknown[]) : [];
  const candidates = [...new Set(proposed.filter((x): x is string => typeof x === "string" && x.length <= 200 && isDecisionId(x)))].slice(0, MAX_CANDIDATES);
  const firstSave = { error: "FOUNDING 100 opens after your first real save: place a paper or live order so WM records the decision to your account, then claim here.", code: "FIRST_SAVE_NOT_FOUND" } as const;
  if (candidates.length === 0) return say(firstSave, 409);

  let evidence: string | null = null;
  let unreadable = false;
  for (const id of candidates) {
    const has = await memberRecordedDecision(user, id);
    if (has === null) { unreadable = true; continue; }
    if (has) { evidence = foundingEvidenceRef(id); if (evidence) break; }
  }
  if (!evidence) return unreadable ? say(NOT_NOW, 503) : say(firstSave, 409);

  const claimed = await founding100Claim(user, FOUNDING_100_ACTIVITY_KIND, evidence);
  const answer = claimed.ok ? readClaim(claimed.data) : null;
  if (answer?.ok && answer.reason === "ACTIVATED") return say({ ok: true, reason: "ACTIVATED", expiresAt: answer.expiresAt }, 201);
  if (answer?.reason === "ALREADY_ENROLLED") return say({ error: "You already have FOUNDING 100.", code: "ALREADY_ENROLLED", expiresAt: answer.expiresAt }, 409);
  if (answer?.reason === "COHORT_FULL") return say({ error: "FOUNDING 100 is full for WM Pro.", code: "COHORT_FULL" }, 409);
  if (answer?.reason === "PROGRAM_NOT_OPEN") return say({ error: "FOUNDING 100 is not open right now.", code: "PROGRAM_NOT_OPEN" }, 409);
  console.warn(`[wm:founding] claim failed ${claimed.ok ? `reason=${answer?.reason ?? "UNREADABLE"}` : claimed.why}`);
  return say(NOT_NOW, 503);
}
