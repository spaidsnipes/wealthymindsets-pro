"use client";

/**
 * Garden 19 §30 — "Ask SpaidBot …" on a surface. Opens the EXISTING SpaidBot
 * panel with the question pre-filled (the trader presses Send) and the ask's
 * validated context patch for that one question. No new mode, no request here.
 */
import React, { useEffect, useState } from "react";
import { askSpaidbot, spaidbotAskListened, type SpaidbotAsk } from "@/lib/ai/spaidbotAsk";

/**
 * Never a dead door: when no SpaidBot panel or ask host is listening on this
 * page, the button is not shown (checked after mount — listeners register in effects).
 */
export function AskSpaidbotButton({ label, ask, testId }: { label: string; ask: () => SpaidbotAsk; testId: string }) {
  const [listened, setListened] = useState(true);
  useEffect(() => { const t = setTimeout(() => setListened(spaidbotAskListened()), 0); return () => clearTimeout(t); }, []);
  if (!listened) return null;
  return (
    <button type="button" data-testid={testId} onClick={() => askSpaidbot(ask())}
      className="wm-tap mt-2 inline-flex min-h-8 items-center rounded-md border px-2.5 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wm-gold"
      style={{ borderColor: "rgba(212,175,55,0.45)", color: "#d4af37", background: "transparent" }}>
      {label}
    </button>
  );
}
