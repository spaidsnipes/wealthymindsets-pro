import { NextRequest, NextResponse } from "next/server";
import { getTastytradeCapabilities } from "@/lib/tastytrade";
import { requireAuth } from "@/lib/requireAuth";
import { brokerOwnerRefusal, tastytradeOwnerGate } from "@/lib/broker/brokerOwner";
import { checkRateLimit } from "@/lib/rateLimit";
import { TASTY_READ_LIMIT } from "@/lib/broker/brokerReadLimit";

// Server-only. Returns the tastytrade connection STATE + verified capabilities.
// Never returns tokens or secret values (Company Bible §30).
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  // Garden 16 §35 / Garden 18 §LXXIII: the Founder's broker truth is the owner's alone.
  const owner = tastytradeOwnerGate(auth.user.sub, process.env);
  if (!owner.allowed) return NextResponse.json(brokerOwnerRefusal(owner), { status: 403, headers: { "Cache-Control": "no-store" } });
  // P0.1: a runaway client loop must not hammer the owner's broker session.
  { const rl = checkRateLimit(`tasty-status:${auth.user.sub}`, TASTY_READ_LIMIT); if (!rl.ok) return rl.response; }
  try {
    const caps = await getTastytradeCapabilities();
    return NextResponse.json(caps, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // Status only — never echo secrets or raw provider errors that might carry them.
    return NextResponse.json(
      { configured: false, connected: false, note: "tastytrade status check failed." },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
