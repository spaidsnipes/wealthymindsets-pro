import { NextResponse } from "next/server";
import { setAuthCookie, signJWT, supabaseGetUserById, useSupabase } from "@/lib/auth";
import { createHash } from "crypto";

const DESTINATIONS = new Set(["lounge", "shop", "radio"]);
const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

export async function POST(request: Request) {
  if (!useSupabase() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "WOW World Passport handoff is not configured yet." }, { status: 503 });
  const form = await request.formData().catch(() => null);
  const code = typeof form?.get("code") === "string" ? String(form?.get("code")) : "";
  const destination = typeof form?.get("route") === "string" ? String(form?.get("route")) : "";
  if (!code || !DESTINATIONS.has(destination)) return NextResponse.json({ error: "This Passport handoff is invalid." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const consume = await fetch(`${url}/rest/v1/rpc/consume_dreamboard_passport_handoff`, { method: "POST", headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}`, "Content-Type": "application/json" }, body: JSON.stringify({ requested_code_hash: hashCode(code), requested_destination: destination }), cache: "no-store" });
  const rows = await consume.json().catch(() => []) as Array<{ user_id?: string }>;
  const userId = rows[0]?.user_id;
  if (!consume.ok || !userId) return NextResponse.json({ error: "This Passport handoff expired or was already used. Return to Dreamboard and try again." }, { status: 401 });
  const user = await supabaseGetUserById(userId);
  const email = typeof user?.email === "string" ? user.email : "";
  if (!email) return NextResponse.json({ error: "WOW World could not restore this Passport." }, { status: 503 });
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const response = NextResponse.redirect(new URL(`/${destination}`, request.url), { status: 303 });
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  setAuthCookie(response.cookies, signJWT({ sub: userId, email, displayName: typeof metadata.displayName === "string" ? metadata.displayName : undefined, handle: typeof metadata.handle === "string" ? metadata.handle : undefined, avatar: typeof metadata.avatar === "string" ? metadata.avatar : undefined, bio: typeof metadata.bio === "string" ? metadata.bio : undefined, botName: typeof metadata.botName === "string" ? metadata.botName : undefined, timezone: typeof metadata.timezone === "string" ? metadata.timezone : undefined, bgColor: typeof metadata.bgColor === "string" ? metadata.bgColor : undefined, profileComplete: Boolean(metadata.profileComplete || metadata.displayName) }));
  return response;
}
