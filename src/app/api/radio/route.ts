/**
 * /api/radio — WM Radio's uploaded tracks through WM's own sign-in.
 *
 * Measured 2026-10-03: the browser bundle carries no public Supabase
 * connection, so /radio listed no uploaded track for anyone and an upload
 * failed inside the client. Same cure as /api/lounge: the session names the
 * uploader, the server writes with the service key.
 *
 * A FILE never passes through this Worker. `op: "sign"` mints a one-time
 * signed upload URL for a server-chosen path in the `radio` bucket; the
 * browser PUTs the audio straight to storage; `op: "file"` then records the
 * track, accepting only a path of the shape this route mints.
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { edgeAllows, tooManyRequests, COMMUNITY_WRITE_LIMITER_BINDING } from "@/lib/edgeRateLimit";
import { resolveSupabaseServiceKey } from "@/lib/supabaseConfigStatus";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const BUCKET = "radio";
const AUDIO_EXT = new Set(["mp3", "m4a", "aac", "wav", "ogg", "flac"]);
const PATH_RE = /^\d{13}-[a-z0-9]{6,12}\.(mp3|m4a|aac|wav|ogg|flac)$/;

class RadioStoreError extends Error {
  constructor(readonly state: "NOT_CONFIGURED" | "TABLE_MISSING" | "UPSTREAM", message: string) { super(message); }
}

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = resolveSupabaseServiceKey(process.env);
  if (!url || !key) throw new RadioStoreError("NOT_CONFIGURED", "The radio store is not configured on this host.");
  return { url, key };
}

async function call<T>(c: { url: string; key: string }, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${c.url}${path}`, {
    ...init,
    headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
    cache: "no-store",
    redirect: "manual",
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const code = (body as { code?: string } | null)?.code;
    if (code === "42P01" || code === "PGRST205" || (res.status === 404 && path.startsWith("/rest/"))) throw new RadioStoreError("TABLE_MISSING", "The radio_tracks table does not exist in the store.");
    throw new RadioStoreError("UPSTREAM", `Radio store answered HTTP ${res.status}.`);
  }
  return body as T;
}

function failure(e: unknown) {
  if (e instanceof RadioStoreError) return NextResponse.json({ state: e.state, error: e.message }, { status: e.state === "UPSTREAM" ? 502 : 503, headers: NO_STORE });
  return NextResponse.json({ state: "UPSTREAM", error: "Radio request failed." }, { status: 502, headers: NO_STORE });
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  try {
    const c = config();
    const tracks = await call<unknown[]>(c, `/rest/v1/radio_tracks?select=*&order=created_at.desc&limit=200`);
    return NextResponse.json({ state: "OK", tracks }, { headers: NO_STORE });
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const uploader = (auth.user.handle ?? auth.user.email?.split("@")[0] ?? "").trim();
  if (!uploader) return NextResponse.json({ error: "Your account has no handle." }, { status: 400 });
  // Anti-flood (2026-10-04): Radio writes had no limit.
  const rl = checkRateLimit(`radio-write:${auth.user.sub}`, { max: 10, windowMs: 60_000 });
  if (!rl.ok) return rl.response;
  if (!(await edgeAllows([`radio:${auth.user.sub}`], COMMUNITY_WRITE_LIMITER_BINDING))) return tooManyRequests();
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  try {
    const c = config();
    const meta = () => {
      const title = clean(b.title, 120), artist = clean(b.artist, 120), genre = clean(b.genre, 40);
      const duration = Number(b.duration);
      return { title, artist, genre, duration: Number.isFinite(duration) && duration > 0 && duration < 36_000 ? Math.round(duration) : null };
    };
    if (b.op === "sign") {
      const ext = clean(b.ext, 5).toLowerCase();
      if (!AUDIO_EXT.has(ext)) return NextResponse.json({ error: "Audio files only (mp3, m4a, aac, wav, ogg, flac)." }, { status: 400 });
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10).padEnd(6, "0")}.${ext}`;
      const signed = await call<{ url?: string }>(c, `/storage/v1/object/upload/sign/${BUCKET}/${path}`, { method: "POST", body: "{}" });
      if (!signed?.url) throw new RadioStoreError("UPSTREAM", "Storage did not return an upload URL.");
      return NextResponse.json({ state: "OK", path, uploadUrl: `${c.url}/storage/v1${signed.url}` }, { headers: NO_STORE });
    }
    if (b.op === "url" || b.op === "file") {
      const m = meta();
      if (!m.title || !m.artist) return NextResponse.json({ error: "Title and artist are required." }, { status: 400 });
      let storage_path = "", public_url = "";
      if (b.op === "url") {
        const u = clean(b.url, 600);
        if (!/^https:\/\/[^\s]+$/i.test(u)) return NextResponse.json({ error: "Paste an https:// link." }, { status: 400 });
        public_url = u;
      } else {
        const p = clean(b.path, 80);
        if (!PATH_RE.test(p)) return NextResponse.json({ error: "Unknown upload path." }, { status: 400 });
        storage_path = p;
        public_url = `${c.url}/storage/v1/object/public/${BUCKET}/${p}`;
      }
      const [row] = await call<unknown[]>(c, `/rest/v1/radio_tracks`, { method: "POST", body: JSON.stringify({ ...m, storage_path, public_url, uploader }) });
      return NextResponse.json({ state: "OK", track: row }, { headers: NO_STORE });
    }
    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (e) {
    return failure(e);
  }
}
