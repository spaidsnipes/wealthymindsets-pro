"use client";

/**
 * THE FOUR PROFILE TILES (Win Rate · Avg R:R · Net P&L · Trades) — one view, used by /profile and by
 * its proof scene (/profile?scene=profile-fixture), so the scene proves the very pixels the trader
 * sees. The numbers come from their one owner, traderPerformanceStats; this only paints them:
 * MEASURED in label ink, UNDEFINED / INSUFFICIENT EVIDENCE in the dim refusal style, every tile
 * carrying its reason on title + aria-label.
 */

import React from "react";
import type { PerfStat } from "@/lib/profile/traderPerformanceStats";

const STAT_COLORS: Record<string, string> = {
  // Garden 18 canon shift 2026-10-06: graphite + warm gold (F09/F11B).
  // Label inks only — green on a measured "+$0" read as profit.
  "Win Rate": "#ede6d3", "Avg R:R": "#c9a55c",
  "Net P&L": "#ede6d3", "Trades": "#c9a55c",
};

export function ProfilePerfTiles({ stats }: { readonly stats: readonly PerfStat[] }) {
  return (
    <div className="flex items-center gap-6 flex-wrap" data-testid="profile-perf-tiles">
      {stats.map(s => (
        <div
          key={s.label}
          className="text-center"
          data-kind={s.kind}
          title={s.reason}
          aria-label={`${s.label}: ${s.value}. ${s.reason}`}
        >
          <div
            className={s.kind === "MEASURED" ? "text-base font-black" : "text-xs font-bold text-wm-text-dim"}
            style={s.kind === "MEASURED" ? { color: STAT_COLORS[s.label] } : undefined}
          >{s.value}</div>
          <div className="text-[11px] text-wm-text-dim uppercase tracking-wider">{s.label}</div>
          {/* A refusal says WHY on the glass — a phone has no hover (title/aria stay for the full reason). */}
          {s.kind !== "MEASURED" && s.short ? (
            <div data-testid="profile-tile-reason" className="text-[11px] text-wm-text-dim max-w-[11rem] mx-auto leading-snug">{s.short}</div>
          ) : null}
          {/* A measured zero says what it is a sum OF, on the glass and
              not only in the tooltip (empty states say why). */}
          {s.label === "Net P&L" && stats.find(x => x.label === "Trades")?.value === "0" ? (
            <div data-testid="profile-net-zero-context" className="text-[11px] text-wm-text-dim">no closed trades yet</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
