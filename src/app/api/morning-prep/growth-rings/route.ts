import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

const categories = new Set(["spiritual", "physical", "mental", "financial", "creative", "relationships", "work"]);

function databaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceKey ? { url, serviceKey } : null;
}

// WM Pro verifies its httpOnly Passport session before touching the shared
// Growth Rings table. The browser never receives a service-role key.
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const passport = auth.user;
  const config = databaseConfig();
  if (!config) {
    // Monday Test 2 truth: name the exact missing Supabase config.
    const missing: string[] = [];
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json(
      {
        error: `Growth Rings is NOT CONFIGURED on this host runtime — missing required ${missing.length === 1 ? "variable" : "variables"}: ${missing.join(", ")}. Set them in the host runtime secrets (e.g. Cloudflare) and redeploy.`,
        edge: "NOT CONFIGURED",
        missing,
      },
      { status: 503 },
    );
  }
  const url = new URL(`${config.url}/rest/v1/dreamboard_growth_entries`);
  url.searchParams.set("select", "id,occurred_on,category,practice,reflection,created_at");
  url.searchParams.set("owner_id", `eq.${passport.sub}`);
  url.searchParams.set("order", "occurred_on.desc,created_at.desc");
  url.searchParams.set("limit", "1500");
  const response = await fetch(url, { headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` }, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Growth Rings could not be reached." }, { status: 502 });
  return NextResponse.json({ entries: await response.json() });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const passport = auth.user;
  const config = databaseConfig();
  if (!config) {
    // Monday Test 2 truth: name the exact missing Supabase config.
    const missing: string[] = [];
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json(
      {
        error: `Growth Rings is NOT CONFIGURED on this host runtime — missing required ${missing.length === 1 ? "variable" : "variables"}: ${missing.join(", ")}. Set them in the host runtime secrets (e.g. Cloudflare) and redeploy.`,
        edge: "NOT CONFIGURED",
        missing,
      },
      { status: 503 },
    );
  }
  const body = await request.json().catch(() => null) as { category?: string; practices?: string[]; reflection?: string } | null;
  const category = body?.category;
  const practices = [...new Set((body?.practices || []).map(value => value.trim()).filter(Boolean))];
  const reflection = body?.reflection?.trim().slice(0, 2000) || null;
  if (!category || !categories.has(category) || !practices.length || practices.some(practice => practice.length > 80)) return NextResponse.json({ error: "Choose a category and at least one valid practice." }, { status: 400 });
  const occurred_on = new Date().toISOString().slice(0, 10);
  const response = await fetch(`${config.url}/rest/v1/dreamboard_growth_entries?on_conflict=owner_id,occurred_on,category,practice`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}`, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(practices.map(practice => ({ owner_id: passport.sub, occurred_on, category, practice, reflection }))),
  });
  if (!response.ok) return NextResponse.json({ error: "Growth Rings could not be recorded." }, { status: 502 });
  return NextResponse.json({ entries: await response.json() });
}
