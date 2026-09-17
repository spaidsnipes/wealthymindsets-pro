"use client";
import * as React from "react";
import { WM } from "@/lib/design/wmTokens";
import {
  EXPERIENCE_MODES,
  type ExperienceMode,
  type DecisionContextBus,
} from "@/lib/experience/decisionContextBus";
import { useDecisionContext } from "@/lib/experience/useDecisionContext";
import { shellEmphasis } from "@/lib/experience/shellLayout";

/**
 * ExperienceModeBar — the seven human operating states (Founder Phase 1):
 *   PREP · OBSERVE · WAIT · EXECUTE · MANAGE · REVIEW · LEARN
 *
 * The SAME market truth reorganizes around whichever mode is active; this bar
 * makes the current job explicit and lets the human switch it (user intent
 * commits immediately, bypassing hysteresis). The active mode is marked with
 * gold — mode is part of WM IDENTITY/orientation, not a market verdict.
 *
 * Reads/writes the shared DecisionContextBus so every surface agrees on the
 * current job.
 */
export interface ExperienceModeBarProps {
  bus?: DecisionContextBus;
  className?: string;
}

/**
 * THE SECOND COPY OF THE CAPTION TABLE — AND IT HAD ALREADY DRIFTED.
 *
 * `shellLayout` owns one caption per mode and paints it in the masthead of
 * every route. This file kept its own table for the button tooltips, and two
 * copies of one rule agree exactly until one is edited. Both were:
 *
 *     WAIT    shell "Hold the thesis; wait for permission."
 *             here  "Have a thesis; wait for permission"
 *     MANAGE  shell "Steward the open position."
 *             here  "Steward an open position"
 *
 * Not catastrophic on their own — and precisely why they survived. A trader
 * hovering WAIT was told to HAVE a thesis while the masthead told them to HOLD
 * one, which are different instructions about the same job.
 *
 * It also meant the exposure-claim repair in `shellLayout`'s OBSERVE entry
 * would have healed the masthead and left this tooltip still asserting a
 * flatness WM cannot observe. Deleting the table is what makes that repair
 * reach every surface that speaks the caption, now and later.
 *
 * The tooltip drops the trailing period the masthead sentence carries — a
 * title attribute is a label, not a sentence — which is presentation, not a
 * second opinion about what the job IS.
 */
function modeHint(mode: ExperienceMode): string {
  return shellEmphasis(mode).job.replace(/\.$/, "");
}

export function ExperienceModeBar({ bus, className }: ExperienceModeBarProps) {
  const { context, setMode } = useDecisionContext(bus);

  return (
    <nav
      className={className}
      aria-label="Experience mode"
      style={{
        display: "flex",
        alignItems: "center",
        // Wrap gracefully on narrow (mobile) widths: the seven states must stay
        // fully visible — never overflow their container and collide with the
        // adjacent job descriptor. On desktop everything fits on one row, so
        // wrap never triggers and the layout is unchanged.
        flexWrap: "wrap",
        gap: 2,
        background: WM.surface.deep,
        border: `1px solid ${WM.border.hair}`,
        borderRadius: WM.radius.lg,
        padding: 3,
      }}
    >
      {EXPERIENCE_MODES.map((mode) => {
        const active = mode === context.mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setMode(mode)}
            aria-pressed={active}
            title={modeHint(mode)}
            style={{
              flex: "1 1 auto",
              // Keep each tap target readable when the bar wraps on mobile;
              // ignored on desktop where flex-grow spreads them across one row.
              minWidth: 52,
              // MEASURED 2026-09-13 at 390x844 by scripts/audit-phone-parity.mjs:
              // all seven buttons rendered 23px tall. minWidth alone had been
              // standing in for "tap target" since this bar was written, and the
              // comment above it asserted a care the code never delivered — a
              // comment is not a gate. This bar IS the navigation of the new
              // room, so on a phone it is the first thing a thumb reaches.
              // 44px is the binding floor.
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              padding: "5px 8px",
              borderRadius: WM.radius.md,
              border: `1px solid ${active ? WM.border.strong : "transparent"}`,
              color: active ? WM.gold.hero : WM.text.muted,
              background: active ? WM.halo.gold : "transparent",
              cursor: "pointer",
              transition: "color 120ms, background 120ms, border-color 120ms",
              whiteSpace: "nowrap",
            }}
          >
            {mode}
          </button>
        );
      })}
    </nav>
  );
}

export default ExperienceModeBar;
