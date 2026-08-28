"use client";
import * as React from "react";
import { WM } from "@/lib/design/wmTokens";
import {
  EXPERIENCE_MODES,
  type ExperienceMode,
  type DecisionContextBus,
} from "@/lib/experience/decisionContextBus";
import { useDecisionContext } from "@/lib/experience/useDecisionContext";

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

const MODE_HINT: Readonly<Record<ExperienceMode, string>> = {
  PREP: "Plan the session before the bell",
  OBSERVE: "Watch the market with no position",
  WAIT: "Have a thesis; wait for permission",
  EXECUTE: "Place the planned decision",
  MANAGE: "Steward an open position",
  REVIEW: "Study what you and the market did",
  LEARN: "Train the exact weakness found",
};

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
            title={MODE_HINT[mode]}
            style={{
              flex: "1 1 auto",
              // Keep each tap target readable when the bar wraps on mobile;
              // ignored on desktop where flex-grow spreads them across one row.
              minWidth: 52,
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
