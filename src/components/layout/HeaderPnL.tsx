"use client";

import React, { useEffect, useState } from "react";
import { clsx } from "clsx";
import { paperMastheadRealizedStat, type PaperStat } from "@/lib/paper/paperAccountStats";

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
 * ── WHAT IT MAY CLAIM IS NOT THIS FILE'S DECISION ───────────────────────────
 *
 * This header used to end with the sentence "On a parse failure it renders
 * NOTHING rather than zero. A confident `+$0.00` built from unreadable storage
 * is a lie with a decimal point on it." The code directly below it read
 * `const val = pnl ?? 0` and did exactly that. The prose was right and the
 * mechanism was absent, which is the more dangerous arrangement: a correct
 * comment is what a reader checks INSTEAD of the code.
 *
 * Worse, `const up = val >= 0` painted a book holding zero trades GREEN, with a
 * green border, in the masthead of every room. That is the H1 defect —
 * an untraded book may not claim a result — already found and fixed on the
 * /paper strip and never carried here.
 *
 * So the judgement is no longer made in this file. `paperMastheadRealizedStat`
 * routes it through `resultStat`, the SAME function the /paper strip uses, and
 * this component's whole job is to draw what it is handed:
 *
 *   null        no stored paper book at all — render nothing, claim nothing
 *   UNKNOWN     bytes we hold and cannot read — say so, do not print a zero
 *   NEUTRAL     a measured figure with no result to interpret
 *   WIN/LOSS    a real result, which earns its tint in both directions
 */
export function HeaderPnL() {
  const [show, setShow] = useState(false);
  const [stat, setStat] = useState<PaperStat | null>(null);

  useEffect(() => {
    const read = () => {
      try {
        const s = JSON.parse(localStorage.getItem("wm_settings") || "{}");
        // showPnl defaults to true in the panel; treat missing as on
        setShow(s.showPnl === undefined ? true : !!s.showPnl);
      } catch {
        setShow(false);
        return;
      }
      const stored = localStorage.getItem("wm_paper_state");
      // ABSENT AND UNREADABLE ARE DIFFERENT FACTS. No key means this trader has
      // no paper book; unparseable bytes mean we hold a book we cannot read.
      if (stored === null) { setStat(null); return; }
      try {
        const paper = JSON.parse(stored);
        const trades: ReadonlyArray<{ pnl?: number }> =
          paper && Array.isArray(paper.trades) ? paper.trades : null;
        if (trades === null) throw new Error("no trades array");
        setStat(
          paperMastheadRealizedStat({
            unreadable: false,
            tradeCount: trades.length,
            realizedPnl: trades.reduce((acc, t) => acc + (t.pnl ?? 0), 0),
          }),
        );
      } catch {
        setStat(paperMastheadRealizedStat({ unreadable: true, tradeCount: 0, realizedPnl: 0 }));
      }
    };
    read();
    window.addEventListener("wm-settings-changed", read);
    const iv = setInterval(read, 4000);
    return () => { window.removeEventListener("wm-settings-changed", read); clearInterval(iv); };
  }, []);

  if (!show || stat === null) return null;
  const border =
    stat.tone === "WIN" ? "rgba(0,212,170,0.4)"
    : stat.tone === "LOSS" ? "rgba(255,77,77,0.4)"
    : stat.tone === "ALERT" ? "rgba(255,77,77,0.4)"
    : "rgba(255,255,255,0.14)";
  return (
    <div
      className="wm-mobile-hide flex items-center gap-1 px-2 py-0.5 rounded-lg border mr-1"
      style={{ borderColor: border }}
      title={stat.reason}
      aria-label={`${stat.label}: ${stat.value}. ${stat.reason}`}
    >
      <span className="text-[9px] text-wm-text-dim font-semibold">P&L</span>
      <span
        className={clsx(
          "text-[11px] font-bold font-mono",
          stat.tone === "WIN" ? "text-wm-green"
          : stat.tone === "LOSS" || stat.tone === "ALERT" ? "text-wm-red"
          : "text-wm-text-muted",
        )}
      >
        {stat.value}
      </span>
    </div>
  );
}

export default HeaderPnL;
