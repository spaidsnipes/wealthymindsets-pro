"use client";
/**
 * /education is now the door to WOW Academy (Founder 2026-10-17: the old education page was "split brain";
 * one education owner — WOW Academy · A+ Student of the Game). The lesson the link asked for opens there,
 * in a new tab with the Passport carried, so the chart this tab came from stays where it was.
 * The older catalogue is still reachable with ?stay=1 while anything is being moved.
 */
import * as React from "react";
import { openWowWorld } from "@/lib/passport/openWowWorld";
import { WOW_ORIGIN } from "@/lib/passport/wowBridge";
import { wowAcademyPath } from "@/lib/academy/wowAcademyPath";
import { returnLabel, safeChartsReturn } from "@/lib/academy/academyContinuity";

export function WowAcademyHandoff({ lessonId, from }: { lessonId: string | null; from: string | null }) {
  const to = wowAcademyPath(lessonId);
  const back = safeChartsReturn(from);
  return (
    <div data-testid="wow-academy-handoff" className="mx-auto max-w-3xl px-4 py-10">
      <section className="relative overflow-hidden rounded-3xl p-8 md:p-12"
        style={{ background: "radial-gradient(120% 140% at 85% -10%, rgba(227,183,74,.22), transparent 55%), linear-gradient(180deg,#14110b,#090807)", border: "1px solid rgba(227,183,74,.3)" }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#e3b74a" }}>WOW Academy · A+ Student of the Game</p>
        <h1 className="mt-3 text-4xl font-black md:text-5xl" style={{ color: "#f5e3b0" }}>Your Academy lives in WOW</h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-wm-text-muted">
          Every lesson behind an ⓘ on the chart — all the inventions, the Fair Value Gap course and every indicator — is taught in WOW Academy,
          with pictures, drills and live classes. It opens in a new tab with your Passport, so your chart stays right here.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" data-testid="wow-academy-open" onClick={() => { openWowWorld(to); }}
            className="inline-flex h-12 items-center rounded-xl px-6 text-[13px] font-black uppercase tracking-[0.12em]"
            style={{ background: "linear-gradient(180deg,#f8dc85,#e3b74a 48%,#b8862a)", color: "#1a1205" }}>
            Open WOW Academy ↗
          </button>
          {back ? (
            <a href={back} className="inline-flex h-12 items-center rounded-xl px-6 text-[13px] font-bold" style={{ border: "1px solid rgba(227,183,74,.45)", color: "#e3b74a" }}>
              {returnLabel(back)}
            </a>
          ) : null}
        </div>
        <p className="mt-5 text-[11.5px] text-wm-text-muted">Opens {WOW_ORIGIN.replace("https://", "")}{to}</p>
      </section>
    </div>
  );
}
