"use client";

import React, { useEffect, useState } from "react";
import { clsx } from "clsx";

/**
 * The trader's realized paper P&L, drawn in the masthead.
 *
 * ── Why this is a module and not a local function ───────────────────────────
 *
 * It WAS a local function — `function HeaderPnL()` at the top of
 * MainLayout.tsx, above the component, not exported. That placement is not a
 * style choice; it is a reachability decision written in the least visible
 * possible way. A function declared inside the file that draws the July shell
 * can be rendered by exactly one shell. So:
 *
 *   A trader standing in an OS room — /command-deck, the route the product
 *   opens on — could not see their own realized P&L. Not hidden by a setting,
 *   not degraded to a dash: absent, with no way to reach it from that room.
 *
 * That is the same defect ShellAccessChrome was written for, one floor down.
 * Search, notifications, settings and sign-out were July-only because they
 * were drawn in July's JSX; P&L was July-only because it was DECLARED in
 * July's file. The second is harder to see and identical in effect.
 *
 * Extracting it does not change what it renders. It changes who is allowed to
 * render it — from one shell to any shell — and it makes "where does the P&L
 * number come from" a question with a filename for an answer.
 *
 * ── What it reads, and what it therefore promises ───────────────────────────
 *
 * `wm_paper_state.trades[].pnl`, summed. That is REALIZED PAPER P&L and
 * nothing else — no open-position mark, no live account, no broker. The title
 * attribute says so, because a number labelled only "P&L" in a product that
 * also talks to brokers is an overclaim waiting for a trader to act on it.
 *
 * `wm_settings.showPnl` gates it, defaulting to ON when the key is missing,
 * which matches the Settings panel's own default. A missing key means "never
 * opened settings", not "asked for it off".
 *
 * On a parse failure it renders NOTHING rather than zero. A confident `+$0.00`
 * built from unreadable storage is a lie with a decimal point on it.
 */
export function HeaderPnL() {
  const [show, setShow] = useState(false);
  const [pnl, setPnl] = useState<number | null>(null);

  useEffect(() => {
    const read = () => {
      try {
        const s = JSON.parse(localStorage.getItem("wm_settings") || "{}");
        // showPnl defaults to true in the panel; treat missing as on
        setShow(s.showPnl === undefined ? true : !!s.showPnl);
        const paper = JSON.parse(localStorage.getItem("wm_paper_state") || "null");
        if (paper && Array.isArray(paper.trades)) {
          const realized = paper.trades.reduce(
            (acc: number, t: { pnl?: number }) => acc + (t.pnl ?? 0), 0);
          setPnl(realized);
        } else { setPnl(null); }
      } catch { setShow(false); }
    };
    read();
    window.addEventListener("wm-settings-changed", read);
    const iv = setInterval(read, 4000);
    return () => { window.removeEventListener("wm-settings-changed", read); clearInterval(iv); };
  }, []);

  if (!show) return null;
  const val = pnl ?? 0;
  const up = val >= 0;
  return (
    <div
      className="wm-mobile-hide flex items-center gap-1 px-2 py-0.5 rounded-lg border mr-1"
      style={{ borderColor: up ? "rgba(0,212,170,0.4)" : "rgba(255,77,77,0.4)" }}
      title="Realized paper-trading P&L"
    >
      <span className="text-[9px] text-wm-text-dim font-semibold">P&L</span>
      <span className={clsx("text-[11px] font-bold font-mono", up ? "text-wm-green" : "text-wm-red")}>
        {up ? "+" : "-"}${Math.abs(val).toLocaleString("en-US", { maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

export default HeaderPnL;
