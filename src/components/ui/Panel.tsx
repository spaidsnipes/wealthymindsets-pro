"use client";
import * as React from "react";

/**
 * Panel — obsidian glass surface with gold hairline border.
 *
 * Foundation primitive for WM Pro Command Deck modules. Renders a translucent
 * surface with a warm-gold 1px border and subtle inner glow. Adopts the
 * existing --wm-gold / --wm-obsidian tokens defined in globals.css.
 *
 * Responsive:
 *  - Full-width by default; grid parents control column layout.
 *  - Padding stays comfortable at all breakpoints.
 *
 * Accessibility:
 *  - `role` defaults to "region" when `label` is provided so screen readers
 *    announce the panel as a landmark.
 *  - `label`/`sublabel` render as visible headings and are also exposed via
 *    aria-labelledby without duplication.
 */
export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Small caps label rendered at the top of the panel. */
  label?: string;
  /** Optional descriptive line rendered below the label. */
  sublabel?: string;
  /** Enables a soft gold halo behind the panel. Default false to preserve calm. */
  halo?: boolean;
  /** Ref for parents that need to measure or focus the panel. */
  panelRef?: React.Ref<HTMLDivElement>;
}

export function Panel({
  label,
  sublabel,
  halo = false,
  panelRef,
  className,
  children,
  role,
  ...rest
}: PanelProps) {
  // React.useId() produces IDs that are deterministic AND identical
  // between SSR and client hydration. A previous module-scoped counter
  // accumulated across Next.js SSR requests (server side) but reset on
  // each client load, so SSR emitted e.g. "wm-panel-47" while client
  // hydration wanted "wm-panel-1" → React #418 text mismatch on every
  // route rendering a labelled Panel. useId() is the framework-blessed
  // fix; no more shared counter.
  const generatedId = React.useId();
  const labelId = label ? `wm-panel-${generatedId}` : undefined;
  const resolvedRole = role ?? (label ? "region" : undefined);

  return (
    <div
      ref={panelRef}
      role={resolvedRole}
      aria-labelledby={labelId}
      className={[
        "wm-panel",
        "relative rounded-[14px] px-6 py-5",
        "border border-[color:var(--wm-gold-hair,#6d5220)]",
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.015),rgba(255,255,255,0.005))]",
        "shadow-[inset_0_0_0_1px_rgba(212,175,55,0.04)]",
        halo ? "shadow-[0_0_60px_-30px_rgba(212,175,55,0.35)]" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {label && (
        <div
          id={labelId}
          className="text-[10px] tracking-[0.32em] uppercase text-[color:var(--wm-gold-line,#8b6a29)] mb-3.5"
        >
          {label}
        </div>
      )}
      {sublabel && (
        <div className="text-[11px] text-[color:var(--wm-text-2,#8a8271)] tracking-[0.08em] -mt-1.5 mb-3">
          {sublabel}
        </div>
      )}
      {children}
    </div>
  );
}

export default Panel;
