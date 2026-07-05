"use client";
import React from "react";
import { COLOR_SCHEMES } from "./colorSchemes";

/**
 * Renders the shared named color schemes as one-click chips. `onApply(up, dn)`
 * is called with the chosen scheme's two colors — the parent gear decides WHAT
 * those colors recolor, keeping each gear scoped to its own target.
 */
export function SchemePresets({
  onApply,
  title = "Quick schemes",
}: {
  onApply: (up: string, dn: string) => void;
  title?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {title && <div className="text-[10px] font-bold uppercase tracking-wider text-wm-text-dim">{title}</div>}
      <div className="grid grid-cols-2 gap-1">
        {COLOR_SCHEMES.map(s => (
          <button
            key={s.id}
            onClick={() => onApply(s.up, s.dn)}
            title={s.label}
            className="flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] font-semibold border border-wm-border text-wm-text-dim hover:text-wm-text hover:border-wm-green/60 transition-colors"
          >
            <span className="flex shrink-0">
              <span className="w-2.5 h-2.5 rounded-l-sm" style={{ background: s.up }} />
              <span className="w-2.5 h-2.5 rounded-r-sm" style={{ background: s.dn }} />
            </span>
            <span className="truncate">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
