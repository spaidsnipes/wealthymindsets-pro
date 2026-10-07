"use client";

/**
 * Garden 19 §30 — "Ask SpaidBot …" on a surface. Opens the EXISTING SpaidBot
 * panel with the question pre-filled (the trader presses Send) and the ask's
 * validated context patch for that one question. No new mode, no request here.
 */
import React from "react";
import { askSpaidbot, type SpaidbotAsk } from "@/lib/ai/spaidbotAsk";

export function AskSpaidbotButton({ label, ask, testId }: { label: string; ask: () => SpaidbotAsk; testId: string }) {
  return (
    <button type="button" data-testid={testId} onClick={() => askSpaidbot(ask())}
      className="wm-tap mt-2 inline-flex min-h-8 items-center rounded-md border px-2.5 text-[11px] font-semibold"
      style={{ borderColor: "rgba(212,175,55,0.45)", color: "#d4af37", background: "transparent" }}>
      {label}
    </button>
  );
}
