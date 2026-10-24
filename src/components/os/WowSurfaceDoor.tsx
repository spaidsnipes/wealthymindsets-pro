"use client";
/**
 * A one-click door from a WM Pro WOW-named surface (TV, Radio) to the same
 * room in WOW OS. It carries the Passport through /api/passport/to-wow in
 * a NEW tab, so whatever is playing or charting here stays where it is.
 * Lounge needs no door: since Oct 22 WM Pro's Lounge and WOW's Lounge are one
 * feed — both read `lounge_posts`, and WOW's posts are written here
 * (/api/lounge/wow), so a post made in either app shows in both.
 */
import { openWowWorld } from "@/lib/passport/openWowWorld";

export function WowSurfaceDoor({ to, label, testId }: { to: "/wow-tv" | "/wow-radio"; label: string; testId: string }) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={() => { openWowWorld(to); }}
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-black text-wm-text"
      style={{ border: "1px solid rgba(232,185,35,0.35)", background: "rgba(232,185,35,0.06)", minHeight: 32 }}
      aria-label={`${label} — opens WOW OS in a new tab`}
    >
      {label} <span aria-hidden="true">↗</span>
    </button>
  );
}
