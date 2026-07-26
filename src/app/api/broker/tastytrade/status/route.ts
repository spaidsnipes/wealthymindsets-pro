import { NextResponse } from "next/server";
import { getTastytradeCapabilities } from "@/lib/tastytrade";

// Server-only. Returns the tastytrade connection STATE + verified capabilities.
// Never returns tokens or secret values (Company Bible §30).
export async function GET() {
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
