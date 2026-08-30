"use client";
import * as React from "react";
import { WM } from "@/lib/design/wmTokens";
import type { ExitRamp } from "@/lib/experience/composeExitRamp";

/**
 * ExitRampCard — the calm Completion Receipt surface.
 *
 * Canon: "ATH/WOW Cognitive Sovereignty Helicopter Audit" (2026-08-29),
 * §Exit Ramp / Completion Receipt: "When a useful stopping point is reached,
 * show a calm exit ramp rather than another dashboard."
 *
 * It is a PURE presentational reflection of a composed {@link ExitRamp}: it
 * renders the receipt (DONE / SAVED / OPEN / NEXT / RETURN / RECAP) and the
 * honest SAFE-TO-LEAVE verdict, and never re-derives the completion truth.
 *
 * §Silence Is A Feature: while there is live, active work (state === "ACTIVE"),
 * the exit ramp stays OUT OF THE WAY — it renders nothing rather than nag a
 * human who is stewarding an open position. The moment a stopping point is
 * genuinely reached, the ramp appears.
 */
export interface ExitRampCardProps {
  readonly ramp: ExitRamp;
  readonly className?: string;
}

function Section({
  label,
  items,
  tone,
}: {
  label: string;
  items: readonly string[];
  tone: string;
}) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ ...WM.type.labelSmall, color: WM.text.muted }}>{label}</span>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((item, i) => (
          <li
            key={`${label}-${i}`}
            style={{ ...WM.type.bodySm, color: WM.text.body, display: "flex", gap: 6, alignItems: "baseline" }}
          >
            <span aria-hidden style={{ color: tone, fontSize: 9, lineHeight: 1.6 }}>▪</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExitRampCard({ ramp, className }: ExitRampCardProps) {
  // §Silence Is A Feature — no exit ramp while live work remains.
  if (ramp.state === "ACTIVE") return null;

  const verdictTone = ramp.safeToLeave ? WM.state.ok : WM.state.watch;
  const verdictHalo = ramp.safeToLeave ? WM.halo.ok : WM.halo.watch;

  return (
    <section
      className={className}
      aria-label="Exit ramp"
      style={{
        border: `1px solid ${WM.border.line}`,
        borderRadius: WM.radius.xl,
        background: WM.surface.deep,
        padding: WM.space.lg,
        display: "flex",
        flexDirection: "column",
        gap: WM.space.md,
      }}
    >
      {/* Headline + state chip */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: WM.space.sm, flexWrap: "wrap" }}>
        <span style={{ ...WM.type.body, color: WM.text.hero, fontWeight: 700 }}>{ramp.headline}</span>
        <span
          style={{
            ...WM.type.labelSmall,
            color: verdictTone,
            background: verdictHalo,
            border: `1px solid ${WM.border.hair}`,
            borderRadius: WM.radius.sm,
            padding: "2px 6px",
            whiteSpace: "nowrap",
          }}
        >
          {ramp.safeToLeave ? "SAFE TO LEAVE" : ramp.state}
        </span>
      </header>

      <Section label="Done" items={ramp.done} tone={WM.state.ok} />
      <Section label="Saved" items={ramp.saved} tone={WM.gold.mark} />
      <Section label="Open" items={ramp.open} tone={WM.state.watch} />

      {ramp.next && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ ...WM.type.labelSmall, color: WM.text.muted }}>Next</span>
          <span style={{ ...WM.type.bodySm, color: WM.text.body }}>{ramp.next}</span>
        </div>
      )}

      {ramp.return && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ ...WM.type.labelSmall, color: WM.text.muted }}>Return when</span>
          <span style={{ ...WM.type.bodySm, color: WM.gold.mark }}>{ramp.return}</span>
        </div>
      )}

      <footer style={{ ...WM.type.labelSmall, color: WM.text.dim, borderTop: `1px solid ${WM.border.hair}`, paddingTop: WM.space.sm }}>
        {ramp.recap}
      </footer>
    </section>
  );
}

export default ExitRampCard;
