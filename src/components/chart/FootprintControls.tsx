"use client";

import React from "react";
import { clsx } from "clsx";
import type { FootprintType } from "./ChartsDashboard";

const FOOTPRINT_TYPES: { id: FootprintType; label: string; desc: string }[] = [
  { id: "bid-ask",            label: "Bid × Ask",    desc: "Bid/ask split cells per price level — order flow footprint" },
  { id: "delta",              label: "Delta",         desc: "Net ask−bid per row. Teal = buying pressure, purple = selling" },
  { id: "volume-profile",     label: "Vol Profile",   desc: "Volume-at-price horizontal bars per candle" },
  { id: "imbalance",          label: "Imbalance",     desc: "Highlight cells with >2.5× bid/ask ratio — spot trapped traders" },
  { id: "aggressive-passive", label: "Agg/Passive",   desc: "Teal = aggressive buyers lifting ask. Purple = aggressive sellers hitting bid" },
  { id: "big-trades",         label: "Big Trades",    desc: "Large trade circles on candles — spot institutional order flow" },
];

export function FootprintControls({
  active, enabled, onChange, onDisable,
}: {
  active: FootprintType;
  enabled: boolean;
  onChange: (t: FootprintType) => void;
  onDisable: () => void;
}) {
  return (
    <>
      <span className="text-[11px] text-wm-text-dim uppercase tracking-widest ml-2 mr-1 shrink-0">ORDER FLOW:</span>

      {/* OFF button — always visible, prominent when active */}
      <button
        onClick={onDisable}
        title="Turn off all footprint overlays"
        className={clsx(
          "px-2 h-5 rounded text-[11px] font-bold tracking-wide transition-all shrink-0 mr-1",
          !enabled
            ? "bg-red-500/20 text-red-400 border border-red-500/50"
            : "text-wm-text-dim hover:text-red-400 hover:bg-red-500/10 border border-transparent"
        )}
      >
        OFF
      </button>

      {FOOTPRINT_TYPES.map(({ id, label, desc }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          title={desc}
          className={clsx(
            "px-2.5 h-5 rounded text-[11px] font-semibold tracking-wide transition-all shrink-0",
            active === id && enabled
              ? "bg-wm-green/20 text-wm-green border border-wm-green/50 shadow-[0_0_6px_rgba(0,229,204,0.25)]"
              : "text-wm-text-dim hover:text-wm-text hover:bg-wm-surface border border-transparent"
          )}
        >
          {label}
        </button>
      ))}
    </>
  );
}
