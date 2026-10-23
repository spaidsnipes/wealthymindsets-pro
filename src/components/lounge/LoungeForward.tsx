"use client";
/**
 * ONE DESTINATION PER SHARED ROOM (Founder, Oct 22): "it's one lounge not 2
 * different or multiple different lounges" — and the same for TV, Radio, Shop
 * and the Academy. WM Pro is the trading OS; these rooms are WOW OS's. A WM Pro
 * door to one of them opens the WOW room itself. No "are you sure" screen: the
 * Passport rides through /api/passport/to-wow (POST from this site), so a
 * signed-in member lands signed in. Back from WOW returns here once and steps
 * on back to where the member was in WM Pro instead of bouncing them out again.
 */
import { useEffect } from "react";
import { WOW_DOOR_ACTION, wowDoorFields } from "@/lib/passport/openWowWorld";
import { wowAcademyPath } from "@/lib/academy/wowAcademyPath";

export type WowRoom = "lounge" | "tv" | "radio" | "shop" | "academy";

const ROOM_PATH: Record<WowRoom, string> = { lounge: "/lounge", tv: "/wow-tv", radio: "/wow-radio", shop: "/marketplace", academy: "/academy" };
const ROOM_NAME: Record<WowRoom, string> = { lounge: "WOW Lounge", tv: "WOW TV", radio: "WOW Radio", shop: "WOW Marketplace", academy: "WOW Academy" };

/** The WOW path a WM Pro room URL opens (keeps a live-room link and maps old lesson ids). */
export function wowTarget(room: WowRoom, search: string): string {
  const q = new URLSearchParams(search);
  if (room === "lounge") {
    const r = q.get("room");
    return r && /^[A-Za-z0-9_-]{1,64}$/.test(r) ? `/lounge?room=${r}` : "/lounge";
  }
  if (room === "academy") {
    const lesson = q.get("lesson");
    return lesson ? wowAcademyPath(lesson) : "/academy";
  }
  return ROOM_PATH[room];
}

/** Back-compat name used by the Lounge layout and tests. */
export const loungeTarget = (search: string) => wowTarget("lounge", search);

/** True only when this page load came from the browser's Back/Forward buttons. */
export function cameBack(perf: Pick<Performance, "getEntriesByType"> | undefined = typeof performance === "undefined" ? undefined : performance): boolean {
  const nav = perf?.getEntriesByType?.("navigation")?.[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "back_forward";
}

export function WowRoomForward({ room }: { room: WowRoom }) {
  useEffect(() => {
    // Arrived here by pressing Back from the WOW room: step on back into WM Pro
    // instead of bouncing out again. Any deliberate visit (click, link, typed URL) forwards.
    if (cameBack() && window.history.length > 1) { window.history.back(); return; }
    const form = document.createElement("form");
    form.method = "POST";
    form.action = WOW_DOOR_ACTION;
    form.style.display = "none";
    for (const [name, value] of Object.entries(wowDoorFields(wowTarget(room, window.location.search)))) {
      const input = document.createElement("input");
      input.type = "hidden"; input.name = name; input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  }, [room]);
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6 text-center" aria-live="polite">
      <div>
        <p className="text-lg font-black text-wm-text">Opening {ROOM_NAME[room]}…</p>
        <p className="mt-2 text-sm text-wm-text-dim">One {ROOM_NAME[room].replace("WOW ", "")} for every ATH app — your Passport comes with you.</p>
        <noscript><a href={`https://thewow.online${ROOM_PATH[room]}`}>Open {ROOM_NAME[room]}</a></noscript>
      </div>
    </main>
  );
}

export default function LoungeForward() {
  return <WowRoomForward room="lounge" />;
}
