"use client";
/**
 * ONE LOUNGE (Founder, Oct 22): "the features in the wm pro lounge should be the
 * wow os lounge … it's one lounge not 2 different or multiple different lounges."
 *
 * WM Pro's Lounge door opens the WOW OS Lounge itself — same feed, same posts,
 * likes, comments and follows (one store, written by /api/lounge/wow and
 * /api/lounge). No "are you sure" screen: the Passport rides through
 * /api/passport/to-wow (POST from this site), so a signed-in member lands
 * signed in. Back from WOW returns here once and steps on back to where the
 * member was in WM Pro instead of bouncing them into the Lounge again.
 */
import { useEffect } from "react";
import { WOW_DOOR_ACTION, wowDoorFields } from "@/lib/passport/openWowWorld";

const FLAG = "wm.lounge.forwarded";

export function loungeTarget(search: string): string {
  const room = new URLSearchParams(search).get("room");
  return room && /^[A-Za-z0-9_-]{1,64}$/.test(room) ? `/lounge?room=${room}` : "/lounge";
}

export default function LoungeForward() {
  useEffect(() => {
    let recent = false;
    try { recent = Date.now() - Number(sessionStorage.getItem(FLAG) || 0) < 60_000; sessionStorage.removeItem(FLAG); } catch { /* storage off */ }
    if (recent && window.history.length > 1) { window.history.back(); return; }
    try { sessionStorage.setItem(FLAG, String(Date.now())); } catch { /* storage off */ }
    const form = document.createElement("form");
    form.method = "POST";
    form.action = WOW_DOOR_ACTION;
    form.style.display = "none";
    for (const [name, value] of Object.entries(wowDoorFields(loungeTarget(window.location.search)))) {
      const input = document.createElement("input");
      input.type = "hidden"; input.name = name; input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }, []);
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6 text-center" aria-live="polite">
      <div>
        <p className="text-lg font-black text-wm-text">Opening the WOW Lounge…</p>
        <p className="mt-2 text-sm text-wm-text-dim">One Lounge for every ATH app — your Passport comes with you.</p>
        <noscript><a href="https://thewow.online/lounge">Open the WOW Lounge</a></noscript>
      </div>
    </main>
  );
}
