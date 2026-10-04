import { NextResponse } from "next/server";
import { tastytradeOwnerGate } from "@/lib/broker/brokerOwner";

/**
 * Operator-only tools (2026-10-04, guest audit): routes that write shared
 * state, read other users' records, or spend the operator's quota answer the
 * deployment's owner and nobody else. Returns the refusal, or null to proceed.
 */
export function operatorOnly(userId: string): NextResponse | null {
  if (tastytradeOwnerGate(userId, process.env).allowed) return null;
  return NextResponse.json({ error: "This tool is for the WM operator." }, { status: 403, headers: { "Cache-Control": "no-store" } });
}
