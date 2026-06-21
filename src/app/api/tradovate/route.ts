import { NextRequest, NextResponse } from "next/server";

// Tradovate server-side proxy — keeps credentials off the client
// Env vars: TRADOVATE_CID, TRADOVATE_SECRET (optional — user can supply their own)

const BASE: Record<string, string> = {
  demo: "https://demo.tradovateapi.com/v1",
  live: "https://live.tradovateapi.com/v1",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, method = "POST", payload, token, env = "demo" } = body;

    if (!endpoint) return NextResponse.json({ error: "missing endpoint" }, { status: 400 });

    const base = BASE[env] ?? BASE.demo;
    const url  = `${base}/${endpoint}`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: method !== "GET" && payload ? JSON.stringify(payload) : undefined,
    });

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return NextResponse.json({ status: res.status, data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET for simple passthrough queries
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") ?? "";
  const token    = searchParams.get("token")    ?? "";
  const env      = searchParams.get("env")      ?? "demo";

  if (!endpoint) return NextResponse.json({ error: "missing endpoint" }, { status: 400 });

  const base = BASE[env] ?? BASE.demo;
  const url  = `${base}/${endpoint}`;

  try {
    const res  = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ status: res.status, data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
