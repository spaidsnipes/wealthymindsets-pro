"use client";
/**
 * PROFILE PRESETS — Clean / Day Trader / Auction / Order Flow / Memory /
 * Research (H-601A). Sits at the head of the Profiles door. A press sends the
 * preset's switch set through the same door the desks and Save My Stack use;
 * the lit preset is compiled from the live switches.
 */
import React from "react";
import type { ProfileId } from "@/lib/marketData/viewModels/selectProfileMenu";
import { PROFILE_PRESETS, matchPreset, presetSwitches } from "@/lib/marketData/viewModels/profileStackPresets";

type Switches = Readonly<Partial<Record<ProfileId, boolean>>>;

export function ProfilePresetBar({ active, onApply }: { active: Switches; onApply: (s: Switches) => void }) {
  const lit = matchPreset(active);
  const litNote = PROFILE_PRESETS.find(p => p.id === lit)?.note ?? "your own stack — no preset matches it";
  return (
    <div data-testid="profile-preset-bar" className="mb-2 rounded-lg border border-wm-border px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wm-text-dim">
        Presets · {litNote}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {PROFILE_PRESETS.map(p => (
          <button
            key={p.id}
            type="button"
            title={p.note}
            aria-pressed={lit === p.id}
            data-testid={`profile-preset-${p.id}`}
            onClick={() => onApply(presetSwitches(p.id))}
            className="min-h-8 rounded border px-2 text-[11px] font-semibold"
            style={{
              borderColor: lit === p.id ? "rgba(212,175,55,0.8)" : "rgba(139,106,41,0.35)",
              color: lit === p.id ? "#d4af37" : "#EDE6D3",
              background: lit === p.id ? "rgba(212,175,55,0.08)" : "transparent",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
