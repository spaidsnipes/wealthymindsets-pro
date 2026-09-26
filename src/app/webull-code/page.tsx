"use client";

/**
 * /webull-code — opening this page IS the "Text me a code" press.
 *
 * The same request as the broker panel's button (POST /api/broker/webull/
 * session), for when the Founder asks for a code from anywhere but the drawer.
 * Every refusal of that route holds here: nothing is sent when 2FA is off, when
 * a session is live, or within a minute of the last code. It prints the
 * server's sentence and nothing else.
 */

import React, { useEffect, useRef, useState } from "react";
import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";
import { usePublishOsStanding } from "@/components/os/osStandingContext";

export default function WebullCodePage() {
  const [said, setSaid] = useState<{ outcome: string; note: string } | null>(null);
  const once = useRef(false);
  usePublishOsStanding({ surface: "Webull code", feed: FEEDLESS_SURFACE });
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    (async () => {
      try {
        const res = await fetch("/api/broker/webull/session", { method: "POST", cache: "no-store" });
        const json = (await res.json().catch(() => null)) as { outcome?: string; note?: string; error?: string } | null;
        setSaid({
          outcome: json?.outcome ?? `HTTP ${res.status}`,
          note: json?.note ?? json?.error ?? (res.status === 401 ? "Sign in to WM Pro first, then open this page again." : "No sentence came back."),
        });
      } catch {
        setSaid({ outcome: "UNREACHABLE", note: "WM Pro could not reach its own session door." });
      }
    })();
  }, []);
  return (
    <div className="min-h-screen bg-[#0b0a08] text-[#EDE6D3] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-[#c9a55c]/40 p-5" data-webull-code={said?.outcome ?? "ASKING"}>
        <div className="text-[11px] font-bold tracking-wider text-[#c9a55c]">WEBULL · SESSION CODE</div>
        <p className="mt-3 text-[15px] font-semibold">{said ? said.outcome.replace(/_/g, " ") : "Asking Webull…"}</p>
        {said && <p className="mt-2 text-[13px] leading-relaxed text-[#C8C0AE]">{said.note}</p>}
        <p className="mt-4 text-[11px] leading-relaxed text-[#9aa1b8]">
          To never need a code again: webull.com → API Management → API Keys Management → Edit → untick “Enable 2FA Verification” → Submit.
        </p>
      </div>
    </div>
  );
}
