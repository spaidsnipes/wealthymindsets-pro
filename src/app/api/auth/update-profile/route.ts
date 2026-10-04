import { NextResponse } from "next/server";
import { signJWT, setAuthCookie, useSupabase, supabaseUpdateUserMetadata, supabaseHandleTaken, canonicalHandle } from "@/lib/auth";
import { requireAuth } from "@/lib/requireAuth";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const payload = auth.user;

  const updates = await req.json().catch(() => ({})) as Record<string, string | boolean>;

  // A HANDLE IS AN IDENTITY (2026-10-04, guest audit): the Lounge and Radio
  // name authors by it, so taking another trader's handle meant posting as
  // them and deleting their posts. A changed handle must be well-formed and
  // free; when freedom cannot be checked, the change is refused, not assumed.
  if (typeof updates.handle === "string" && canonicalHandle(updates.handle) !== canonicalHandle(payload.handle ?? "")) {
    const wanted = updates.handle.trim();
    if (!/^@?[A-Za-z0-9_.]{3,30}$/.test(wanted)) {
      return NextResponse.json({ error: "Handles are 3–30 letters, numbers, dots or underscores." }, { status: 400 });
    }
    if (useSupabase()) {
      const taken = await supabaseHandleTaken(wanted, payload.sub);
      if (taken === null) return NextResponse.json({ error: "Couldn't confirm that handle is free right now — try again in a moment." }, { status: 503 });
      if (taken) return NextResponse.json({ error: "That handle belongs to another trader." }, { status: 409 });
    }
  }

  // Merge updates into existing payload
  const newPayload = {
    sub:             payload.sub,
    email:           payload.email,
    displayName:     (updates.displayName as string) ?? payload.displayName,
    handle:          (updates.handle as string) ?? payload.handle,
    avatar:          (updates.avatar as string) ?? payload.avatar,
    bio:             (updates.bio as string) ?? payload.bio,
    botName:         (updates.botName as string) ?? payload.botName,
    timezone:        (updates.timezone as string) ?? payload.timezone,
    bgColor:         (updates.bgColor as string) ?? payload.bgColor,
    profileComplete: (updates.profileComplete as boolean) ?? payload.profileComplete,
  };

  // ── PERSIST TO SUPABASE (the actual fix for "profile resets every login") ──
  // The JWT cookie alone is not durable: the login route rebuilds the JWT from
  // Supabase user_metadata, so the profile MUST live there to survive a fresh
  // sign-in on any device. Write the same fields into user_metadata via the
  // admin API. (avatar can be a large data URL; Supabase metadata handles it,
  // but we still keep the JWT copy for fast reads.)
  if (useSupabase()) {
    await supabaseUpdateUserMetadata(newPayload.sub, {
      displayName:     newPayload.displayName,
      handle:          newPayload.handle,
      avatar:          newPayload.avatar,
      bio:             newPayload.bio,
      botName:         newPayload.botName,
      timezone:        newPayload.timezone,
      bgColor:         newPayload.bgColor,
      profileComplete: newPayload.profileComplete,
    });
  }

  const newJWT = signJWT(newPayload);
  const res = NextResponse.json({ ok: true, user: newPayload });
  setAuthCookie(res.cookies, newJWT);
  return res;
}
