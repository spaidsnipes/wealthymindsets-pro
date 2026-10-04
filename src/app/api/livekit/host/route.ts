import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { isLiveHost } from "@/lib/livekit/liveHost";

export const dynamic = "force-dynamic";

/** May the signed-in user go live? The TV room shows its host doors only to hosts (2026-10-04). */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ host: isLiveHost(auth.user.sub, process.env) }, { headers: { "Cache-Control": "no-store" } });
}
