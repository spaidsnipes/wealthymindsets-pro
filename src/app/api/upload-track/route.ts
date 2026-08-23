import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAuth } from "@/lib/requireAuth";
import { checkRateLimit } from "@/lib/rateLimit";

// SHIFT-K K-Bkt 3 (Noah): Supabase admin client is LAZY (getSupabaseAdmin).
// The prior `createClient(URL!, SERVICE_ROLE_KEY!)` at module scope crashed
// the Cloudflare / OpenNext build with "supabaseUrl is required" whenever
// the build environment lacked the values. See src/lib/supabaseAdmin.ts.

const BUCKET = "radio";

export async function POST(request: Request) {
  // WM-SEC-P0-06: was unauthenticated multipart write using SUPABASE_
  // SERVICE_ROLE_KEY to a public bucket — arbitrary-file upload for anyone.
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  // WM-SEC-P0-07: cap uploads per user to blunt a storage-DoS attempt.
  const rl = checkRateLimit(`upload-track:${auth.user.sub}`, { max: 20, windowMs: 60_000 });
  if (!rl.ok) return rl.response;
  // K-Bkt 3: honest 503 when Supabase isn't configured on this runtime
  // instead of a build-time crash or a stack-trace leak at request time.
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Radio uploads are not configured on this deployment (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 },
    );
  }
  try {
    const form = await request.formData();
    const file     = form.get("file") as File | null;
    const title    = (form.get("title")  as string | null)?.trim() ?? "";
    const artist   = (form.get("artist") as string | null)?.trim() ?? "";
    const genre    = (form.get("genre")  as string | null)?.trim() || "Other";
    const uploader = (form.get("uploader") as string | null)?.trim() ?? "";
    const durationStr = form.get("duration") as string | null;
    const duration = durationStr ? parseInt(durationStr, 10) : 0;

    if (!file || !title || !artist) {
      return NextResponse.json({ error: "file, title, and artist are required" }, { status: 400 });
    }

    // Ensure bucket exists (public)
    await supabaseAdmin.storage.createBucket(BUCKET, { public: true }).catch(() => {/* already exists */});

    // Upload file
    const ext  = file.name.split(".").pop() ?? "mp3";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type || "audio/mpeg", upsert: false });

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    // Insert into radio_tracks
    const { data: track, error: dbErr } = await supabaseAdmin
      .from("radio_tracks")
      .insert({ title, artist, genre, duration, storage_path: path, public_url: publicUrl, uploader })
      .select()
      .single();

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

    return NextResponse.json({ track, url: publicUrl });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
