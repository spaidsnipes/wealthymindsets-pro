"use client";

/**
 * A TOOL'S OWN STYLE, ON ITS GEAR (Founder 2026-10-16: "I'm trying to change the color. I click on this shit.
 * This shit is chart settings … it should be a setting for each thing you're using … like TradingView").
 *
 * The gear on a Profiles / Tools / Active-tools row opens THIS — a small card beside the gear with that tool's
 * colour and opacity only — never the whole Chart Settings sheet. Every control writes through the same lawful
 * owners Chart Settings uses (appearanceLaw), so the chart repaints at once and the full sheet agrees.
 * A colour is offered only where the glass paints its body with it (a picker that changes nothing is a lie).
 */
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  INVENTION_DIAL_LABEL, PROFILE_SPECIES_LABEL, SPECIES_INK_DEFAULTS, lawfulInventionOpacity, lawfulSpeciesInks,
  lawfulSpeciesOpacity, type InventionDialKey, type ProfileSpeciesKey,
} from "@/lib/chart/appearanceLaw";
import type { ChartSettings } from "./ChartSettingsModal";
import { PROFILE_INK_AT_REST } from "@/lib/chart/profileFamilyInk";

/** Species whose BODY is painted in its stored ink (MainChart pkFamily.species). TPO's tiles are its period ramp. */
export const COLOUR_SPECIES: readonly ProfileSpeciesKey[] = ["LIVING", "STRUCTURE", "FUSION", "MEMORY", "DNA", "VISIBLE_RANGE", "COMPOSITE"];
const FAMILY_GOLD = "#d4af37";
/** Screen-bright choices, one tap each; the native picker covers the rest. */
const PALETTE = ["#5fa8ff", "#3fe0c0", "#4ade80", "#a3e635", "#fb923c", "#f87171", "#f472b6", "#c084fc", "#e5e7eb", "#22d3ee"];

export interface ToolStyleTarget {
  readonly section: string;
  readonly rect: { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number } | null;
}

export function ToolStylePopover({ target, settings, onChange, onClose, onMore }: {
  readonly target: ToolStyleTarget;
  readonly settings: ChartSettings;
  readonly onChange: (s: ChartSettings) => void;
  readonly onClose: () => void;
  readonly onMore: () => void;
}): React.ReactElement | null {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => window.addEventListener("pointerdown", onDown), 0);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); window.clearTimeout(t); };
  }, [onClose]);
  if (typeof document === "undefined") return null;

  const [kind, key] = target.section.split(":") as [string, string | undefined];
  const species = kind === "species" ? (key as ProfileSpeciesKey) : null;
  const inv = kind === "inv" ? (key as InventionDialKey) : null;
  const label = species ? PROFILE_SPECIES_LABEL[species] : inv ? INVENTION_DIAL_LABEL[inv] : "Tool";
  const set = (patch: Partial<ChartSettings>) => onChange({ ...settings, ...patch });

  const opacity = species ? settings.profileSpeciesOpacity?.[species] : inv ? settings.inventionOpacity?.[inv] : undefined;
  const v = typeof opacity === "number" && Number.isFinite(opacity) ? opacity : 1;
  const setOpacity = (n: number) => {
    if (species) set({ profileSpeciesOpacity: lawfulSpeciesOpacity({ ...(settings.profileSpeciesOpacity ?? {}), [species]: n }) });
    else if (inv) set({ inventionOpacity: lawfulInventionOpacity({ ...(settings.inventionOpacity ?? {}), [inv]: n }) });
  };

  const colourable = species != null && COLOUR_SPECIES.includes(species);
  const current = species ? settings.profileSpeciesInk?.[species] ?? SPECIES_INK_DEFAULTS[species] ?? FAMILY_GOLD : FAMILY_GOLD;
  const law = species ? lawfulSpeciesInks(settings.profileSpeciesInk, { field: settings.background, poc: `rgb(${PROFILE_INK_AT_REST.rgb("POC")})` }) : null;
  const refused = species ? law?.refused[species] : undefined;
  const setInk = (hex: string) => { if (species) set({ profileSpeciesInk: { ...(settings.profileSpeciesInk ?? {}), [species]: hex } }); };

  // Beside the gear, kept on screen.
  const W = 280;
  const vw = window.innerWidth, vh = window.innerHeight;
  const r = target.rect;
  const left = r ? Math.max(8, Math.min(vw - W - 8, r.right + 8 > vw - W - 8 ? r.left - W - 8 : r.right + 8)) : vw - W - 24;
  const top = r ? Math.max(8, Math.min(vh - 300, r.top - 8)) : 120;

  return createPortal(
    <div ref={ref} role="dialog" aria-label={`${label} style`} data-testid="tool-style-popover" data-section={target.section}
      style={{ position: "fixed", left, top, width: W, zIndex: 2147483000, background: "#14110c", border: "1px solid rgba(212,175,55,0.55)",
        borderRadius: 12, boxShadow: "0 18px 48px rgba(0,0,0,0.6)", padding: "12px 14px", color: "#EDE6D3", font: "500 13px/1.35 ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ font: "700 14px Georgia, serif", color: "#F3D78A" }}>{label} · style</span>
        <button type="button" aria-label="Close" onClick={onClose} style={{ background: "none", border: "none", color: "#a99f86", fontSize: 18, cursor: "pointer", minWidth: 32, minHeight: 32 }}>×</button>
      </div>
      {colourable ? (
        <div data-testid="tool-style-colour" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#c0b8a0", marginBottom: 6 }}>Colour</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {PALETTE.map(c => (
              <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={current.toLowerCase() === c} onClick={() => setInk(c)}
                style={{ height: 30, borderRadius: 7, background: c, cursor: "pointer",
                  border: current.toLowerCase() === c ? "2px solid #fff" : "1px solid rgba(255,255,255,0.15)" }} />
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "#c0b8a0" }}>
            Any colour
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(current) ? current : FAMILY_GOLD} aria-label={`${label} colour`} onChange={e => setInk(e.target.value)}
              style={{ width: 44, height: 28, border: "1px solid rgba(212,175,55,0.4)", borderRadius: 6, background: "none", padding: 0, cursor: "pointer" }} />
          </label>
          {refused ? (
            <div data-testid="tool-style-refused" style={{ marginTop: 6, fontSize: 12, color: "#fb923c" }}>
              {refused === "POC" ? "Too close to the POC gold — the centre would vanish. Pick another." : refused === "FIELD" ? "Too close to the chart background. Pick another." : refused === "TWIN" ? "Another profile already wears this colour. Pick another." : "Not a colour."}
            </div>
          ) : null}
        </div>
      ) : species === "TPO" ? (
        <div style={{ fontSize: 12, color: "#c0b8a0", marginBottom: 10 }}>TPO colours are its time periods: early blue → green → gold → late red.</div>
      ) : null}
      {species || inv ? (
        <label style={{ display: "block", marginBottom: 10 }}>
          <span style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#c0b8a0" }}>
            Strength <span style={{ fontFamily: "monospace", color: "#EDE6D3" }}>{Math.round(v * 100)}%</span>
          </span>
          <input type="range" min={0.4} max={1.6} step={0.1} value={v} aria-label={`${label} strength`} onChange={e => setOpacity(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#C9A55C", minHeight: 28 }} />
        </label>
      ) : null}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <button type="button" onClick={() => { if (species) set({ profileSpeciesInk: Object.fromEntries(Object.entries(settings.profileSpeciesInk ?? {}).filter(([k]) => k !== species)) }); setOpacity(1); }}
          style={{ flex: 1, minHeight: 36, borderRadius: 8, border: "1px solid rgba(212,175,55,0.35)", background: "transparent", color: "#d6c9a6", cursor: "pointer" }}>Reset</button>
        <button type="button" onClick={onMore}
          style={{ flex: 1, minHeight: 36, borderRadius: 8, border: "1px solid rgba(212,175,55,0.35)", background: "transparent", color: "#a99f86", cursor: "pointer" }}>All settings…</button>
      </div>
    </div>,
    document.body,
  );
}
