/**
 * /api/audio — Audio track metadata store
 *
 * GET  /api/audio          → list all stored track URLs
 * POST /api/audio          → add/update a track URL
 *   body: { trackId: number | string, url: string, title?: string, artist?: string }
 *
 * For actual file hosting, upload MP3s to:
 *   - Vercel Blob:     vercel.com/docs/storage/vercel-blob
 *   - Cloudflare R2:   r2.cloudflarestorage.com
 *   - AWS S3 / CDN
 * Then paste the public URL here via POST.
 *
 * URLs are stored in memory (Vercel edge). For persistence, connect
 * a database (Supabase, Vercel Postgres, etc.) and replace the Map below.
 */

import { NextResponse } from "next/server";

// In-memory store — replace with DB for persistence across deploys
const trackStore = new Map<string, { url: string; title?: string; artist?: string; addedAt: number }>();
const stationStore = new Map<string, { url: string; addedAt: number }>();

export async function GET() {
  return NextResponse.json({
    tracks:   Object.fromEntries(trackStore),
    stations: Object.fromEntries(stationStore),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { type = "track", id, url, title, artist } = body as {
    type?: "track" | "station";
    id: string | number;
    url: string;
    title?: string;
    artist?: string;
  };

  if (!id || !url) return NextResponse.json({ error: "id and url are required" }, { status: 400 });
  if (!url.startsWith("https://")) return NextResponse.json({ error: "URL must be HTTPS" }, { status: 400 });

  const key = String(id);
  if (type === "station") {
    stationStore.set(key, { url, addedAt: Date.now() });
  } else {
    trackStore.set(key, { url, title, artist, addedAt: Date.now() });
  }

  return NextResponse.json({ ok: true, type, id: key, url });
}
