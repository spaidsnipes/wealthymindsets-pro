"use client";
/**
 * ARRANGE THE STACK — order and opacity of the stacked profile lanes (P-110).
 * Innermost (nearest the price axis) first. Geometry stays with the plan: a
 * lane can move and dim, never overlap another.
 */
import React from "react";
import type { StackSpecies } from "@/lib/marketData/viewModels/profileStackPlan";
import {
  STACK_LABEL, STACK_SPECIES, cycleOpacity, isLocked, moveSpecies, orderStack, stackOpacity, toggleLock, type ProfileStackPrefs,
} from "@/lib/marketData/viewModels/profileStackPrefs";

export function StackArrangeBar({ prefs, onChange }: { prefs: ProfileStackPrefs; onChange: (p: ProfileStackPrefs) => void }) {
  const order = orderStack(STACK_SPECIES, prefs);
  return (
    <div data-testid="stack-arrange-bar" className="mt-2 rounded-lg border border-wm-border px-3 py-2">
      <div className="pb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-wm-text-dim">
        Arrange the stack · nearest the price axis first
      </div>
      {order.map((sp: StackSpecies, i) => (
        <div key={sp} className="flex items-center justify-between gap-2 py-0.5" data-testid={`stack-row-${sp}`}>
          <span className="text-[11px] font-semibold text-wm-text">{i + 1}. {STACK_LABEL[sp]}</span>
          <span className="flex gap-1">
            <button type="button" aria-label={`Move ${STACK_LABEL[sp]} inward`} disabled={i === 0}
              onClick={() => onChange(moveSpecies(prefs, sp, -1))}
              className="min-h-7 min-w-7 rounded border border-wm-border text-[11px] text-wm-text disabled:opacity-30">▲</button>
            <button type="button" aria-label={`Move ${STACK_LABEL[sp]} outward`} disabled={i === order.length - 1}
              onClick={() => onChange(moveSpecies(prefs, sp, 1))}
              className="min-h-7 min-w-7 rounded border border-wm-border text-[11px] text-wm-text disabled:opacity-30">▼</button>
            <button type="button" aria-label={`${STACK_LABEL[sp]} opacity`} data-testid={`stack-opacity-${sp}`}
              onClick={() => onChange(cycleOpacity(prefs, sp))}
              className="min-h-7 min-w-12 rounded border border-wm-border px-1 text-[10px] font-semibold text-wm-text">
              {Math.round(stackOpacity(sp, prefs) * 100)}%
            </button>
            <button type="button" aria-pressed={isLocked(sp, prefs)} data-testid={`stack-lock-${sp}`}
              aria-label={`${isLocked(sp, prefs) ? "Unlock" : "Lock"} ${STACK_LABEL[sp]} — presets and desks leave a locked lane as it is`}
              title="Locked: presets, desks and Restore leave this lane as it is"
              onClick={() => onChange(toggleLock(prefs, sp))}
              className="min-h-7 min-w-12 rounded border px-1 text-[10px] font-semibold"
              style={{ borderColor: isLocked(sp, prefs) ? "rgba(212,175,55,0.8)" : undefined, color: isLocked(sp, prefs) ? "#d4af37" : undefined }}>
              {isLocked(sp, prefs) ? "LOCKED" : "LOCK"}
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}
