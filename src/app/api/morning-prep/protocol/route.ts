import { NextResponse } from "next/server";

import { orderDecisionKv } from "@/lib/broker/orderDecisionLedger";
import { requestIsSameOrigin } from "@/lib/broker/credentialProbeGate";
import { webullWorkerEnv } from "@/lib/marketData/webullSessionStore";
import {
  DEFAULT_PROTOCOL, SAFE_UID, dayKey, emptyDay, protocolDate, protocolKey, sanitizeDay, sanitizeProtocol, triggersKey,
  type TriggerEntry,
} from "@/lib/morningProtocol/protocol";
import { checkRateLimit } from "@/lib/rateLimit";
import { requireAuth } from "@/lib/requireAuth";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const WRITE_LIMIT = { max: 60, windowMs: 10 * 60_000 } as const;
const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

async function kv() {
  try { return orderDecisionKv(await webullWorkerEnv()); } catch { return null; }
}

/**
 * GET /api/morning-prep/protocol — the signed-in trader's protocol (their own, else the defaults, said as such),
 * today's record on the New York calendar, and their trigger log. Each account reads only its own keys.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const uid = auth.user.sub;
  if (!SAFE_UID.test(uid)) return json({ error: "Account id unreadable.", code: "UNSAFE_ID" }, 400);
  const store = await kv();
  const date = protocolDate(Date.now());
  if (!store) return json({ stored: false, why: "Saving is not available on this host — showing the defaults.", protocol: DEFAULT_PROTOCOL, day: emptyDay(date), triggers: [] });
  const [p, d, t] = await Promise.all([store.get(protocolKey(uid)), store.get(dayKey(uid, date)), store.get(triggersKey(uid))]);
  let triggers: TriggerEntry[] = [];
  try { const parsed = t ? JSON.parse(t) : []; if (Array.isArray(parsed)) triggers = parsed; } catch { /* unreadable log reads as empty */ }
  let protocolRaw: unknown = null; try { protocolRaw = p ? JSON.parse(p) : null; } catch { /* defaults */ }
  let dayRaw: unknown = null; try { dayRaw = d ? JSON.parse(d) : null; } catch { /* empty day */ }
  return json({
    stored: true,
    isDefault: protocolRaw == null,
    protocol: protocolRaw == null ? DEFAULT_PROTOCOL : sanitizeProtocol(protocolRaw),
    day: dayRaw == null ? emptyDay(date) : sanitizeDay(dayRaw, date),
    triggers: triggers.slice(-60),
  });
}

/** PUT — `{ protocol?, day? }`. Each part is sanitised whole; the day is always today's (the client cannot pick one). */
export async function PUT(request: Request) {
  if (!requestIsSameOrigin(request)) return json({ error: "Cross-site write refused.", code: "CROSS_SITE" }, 403);
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const uid = auth.user.sub;
  if (!SAFE_UID.test(uid)) return json({ error: "Account id unreadable.", code: "UNSAFE_ID" }, 400);
  { const rl = checkRateLimit(`prep-protocol:${uid}`, WRITE_LIMIT); if (!rl.ok) return rl.response; }
  const store = await kv();
  if (!store) return json({ error: "Saving is not available on this host.", code: "NO_STORE" }, 503);
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return json({ error: "Unreadable body.", code: "BAD_BODY" }, 400); }
  const date = protocolDate(Date.now());
  const out: Record<string, unknown> = { saved: [] as string[] };
  if (body.protocol !== undefined) {
    const p = sanitizeProtocol(body.protocol);
    await store.put(protocolKey(uid), JSON.stringify(p));
    out.protocol = p; (out.saved as string[]).push("protocol");
  }
  if (body.day !== undefined) {
    const d = sanitizeDay(body.day, date);
    await store.put(dayKey(uid, date), JSON.stringify(d));
    out.day = d; (out.saved as string[]).push("day");
  }
  return json(out);
}
