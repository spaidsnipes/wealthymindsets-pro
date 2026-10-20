import { NextResponse } from "next/server";

import { orderDecisionKv } from "@/lib/broker/orderDecisionLedger";
import { requestIsSameOrigin } from "@/lib/broker/credentialProbeGate";
import { webullWorkerEnv } from "@/lib/marketData/webullSessionStore";
import { SAFE_UID, TRIGGER_LOG_CAP, sanitizeTrigger, triggersKey, type TriggerEntry } from "@/lib/morningProtocol/protocol";
import { checkRateLimit } from "@/lib/rateLimit";
import { requireAuth } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const WRITE_LIMIT = { max: 40, windowMs: 10 * 60_000 } as const;
const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

/**
 * POST /api/morning-prep/triggers — append one trigger entry (trigger, intensity 1–10, action, interrupted, followed
 * rules) to the signed-in trader's own log. The server stamps the time; the log keeps the newest TRIGGER_LOG_CAP.
 */
export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return json({ error: "Cross-site write refused.", code: "CROSS_SITE" }, 403);
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const uid = auth.user.sub;
  if (!SAFE_UID.test(uid)) return json({ error: "Account id unreadable.", code: "UNSAFE_ID" }, 400);
  { const rl = checkRateLimit(`prep-triggers:${uid}`, WRITE_LIMIT); if (!rl.ok) return rl.response; }
  let store: Awaited<ReturnType<typeof orderDecisionKv>> = null;
  try { store = orderDecisionKv(await webullWorkerEnv()); } catch { store = null; }
  if (!store) return json({ error: "Saving is not available on this host.", code: "NO_STORE" }, 503);
  let raw: unknown;
  try { raw = await request.json(); } catch { return json({ error: "Unreadable body.", code: "BAD_BODY" }, 400); }
  const entry = sanitizeTrigger(raw, Date.now());
  if (!entry) return json({ error: "Name the trigger and rate it 1–10.", code: "BAD_ENTRY" }, 400);
  let log: TriggerEntry[] = [];
  try { const prev = await store.get(triggersKey(uid)); const parsed = prev ? JSON.parse(prev) : []; if (Array.isArray(parsed)) log = parsed; } catch { log = []; }
  log = [...log, entry].slice(-TRIGGER_LOG_CAP);
  await store.put(triggersKey(uid), JSON.stringify(log));
  return json({ saved: true, entry, n: log.length, triggers: log.slice(-60) });
}
