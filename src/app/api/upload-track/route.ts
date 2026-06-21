import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BUCKET = "radio";

export async function POST(request: Request) {
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
