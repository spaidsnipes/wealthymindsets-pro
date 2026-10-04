"use client";
/**
 * SETTINGS › CHART — Garden 18 §XXXIII/§XXXIV/§XCIV. The chart's style
 * preferences in the OS control centre, through their own owners: profile
 * strength (Subtle / Canon / Standard / Strong + Reset to Founder Canon) and
 * the visual roles the trader gave each sense (reset to canon = no roles).
 * Every control here changes the glass; none is a toggle without consequence.
 */
import React, { useEffect, useState } from "react";

import { PROFILE_STRENGTHS, type ProfileStrength } from "@/lib/chart/profileFamilyInk";
import { readStoredProfileStrength, writeStoredProfileStrength } from "@/lib/chart/profileStrengthStore";
import { VISUAL_ROLES_EVENT, readStoredRoles, writeStoredRoles } from "@/lib/workspace/visualRoles";

export function ChartStyleSettingsTab() {
  const [strength, setStrength] = useState<ProfileStrength>("CANON");
  const [roleCount, setRoleCount] = useState(0);
  useEffect(() => {
    const sync = () => { setStrength(readStoredProfileStrength()); setRoleCount(Object.keys(readStoredRoles()).length); };
    sync();
    window.addEventListener("wm-vp-colors", sync);
    window.addEventListener(VISUAL_ROLES_EVENT, sync);
    return () => { window.removeEventListener("wm-vp-colors", sync); window.removeEventListener(VISUAL_ROLES_EVENT, sync); };
  }, []);
  return (
    <div className="px-4 py-3 space-y-4" data-testid="settings-chart-style">
      <section>
        <div className="text-xs font-semibold text-wm-text">Profile strength</div>
        <div className="text-[10px] text-wm-text-dim mt-0.5">How strongly every profile paints. Faint fills lift most; POC rules barely move, so the hierarchy stays.</div>
        <div className="mt-2 flex flex-wrap gap-1">
          {PROFILE_STRENGTHS.map(v => (
            <button key={v} type="button" aria-pressed={strength === v} onClick={() => writeStoredProfileStrength(v)}
              className="min-h-8 rounded border px-3 text-[11px] font-semibold"
              style={{ borderColor: strength === v ? "rgba(212,175,55,0.8)" : undefined, color: strength === v ? "#d4af37" : undefined }}>
              {v === "CANON" ? "Canon" : v[0] + v.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {strength !== "CANON" ? (
          <button type="button" onClick={() => writeStoredProfileStrength("CANON")} className="mt-2 text-[11px] text-wm-gold underline-offset-2 hover:underline">Reset to WM default</button>
        ) : null}
      </section>
      <section>
        <div className="text-xs font-semibold text-wm-text">Visual roles</div>
        <div className="text-[10px] text-wm-text-dim mt-0.5">
          {roleCount === 0 ? "Every sense paints at its canon strength (no roles set)." : `${roleCount} sense${roleCount === 1 ? "" : "s"} carry a role (Primary / Supporting / Ambient / Latent). Set them from Tools › Active.`}
        </div>
        {roleCount > 0 ? (
          <button type="button" onClick={() => writeStoredRoles({})} className="mt-2 min-h-8 rounded border border-wm-border px-3 text-[11px] font-semibold text-wm-text">Reset roles to WM default</button>
        ) : null}
      </section>
    </div>
  );
}
