"use client";
import * as React from "react";
import { WM } from "@/lib/design/wmTokens";
import type { DecisionContextBus } from "@/lib/experience/decisionContextBus";
import { useDecisionContext } from "@/lib/experience/useDecisionContext";
import { shellEmphasis } from "@/lib/experience/shellLayout";
import ExperienceModeBar from "./ExperienceModeBar";

/**
 * WMExperienceShell — the persistent Wealth Command Environment frame
 * (Founder Phase 1: Skeleton).
 *
 * Founder transformation: WM Pro is not a feature-organised dashboard; it is a
 * living environment organised around the human's CURRENT JOB
 * (PREP · OBSERVE · WAIT · EXECUTE · MANAGE · REVIEW · LEARN). The market truth
 * stays the same — the shell only changes its EMPHASIS around that job.
 *
 * This shell is a pure layout frame: a quiet brand line + the seven-mode bar +
 * a single job caption on top, the SACRED market canvas (children) filling the
 * body, and a collapsible contextual guest rail that opens by default only in
 * the reflection modes. It performs NO market computation and touches NO market
 * logic — it wraps whatever canvas the caller provides.
 */
export interface WMExperienceShellProps {
  /** Quiet brand slot — caller passes the compact wordmark. */
  readonly brand?: React.ReactNode;
  /** The sacred market canvas (chart / command surface). */
  readonly children: React.ReactNode;
  /** Contextual guest content (watchlist / prep / review). Collapsible. */
  readonly rail?: React.ReactNode;
  /** Optional label for the guest rail toggle. */
  readonly railLabel?: string;
  /** Injected bus for tests/stories; defaults to the singleton. */
  readonly bus?: DecisionContextBus;
  readonly className?: string;
}

export function WMExperienceShell({
  brand,
  children,
  rail,
  railLabel = "Context",
  bus,
  className,
}: WMExperienceShellProps) {
  const { context } = useDecisionContext(bus);
  const emphasis = shellEmphasis(context.mode);

  // The guest rail's default follows the current job's emphasis; a mode switch
  // reorganises the environment around the new job. The human may still toggle.
  const [railOpen, setRailOpen] = React.useState(emphasis.railDefaultOpen);
  const lastMode = React.useRef(context.mode);
  React.useEffect(() => {
    if (lastMode.current !== context.mode) {
      lastMode.current = context.mode;
      setRailOpen(emphasis.railDefaultOpen);
    }
  }, [context.mode, emphasis.railDefaultOpen]);

  const hasRail = !!rail;
  const showRail = hasRail && railOpen;

  return (
    <div
      className={`wm-sanctuary ${className ?? ""}`}
      data-mode={context.mode}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: WM.surface.deepest,
        color: WM.text.body,
        // The sanctuary layers below must sit UNDER interactive content.
        // isolate contains their z-order to this subtree.
        isolation: "isolate",
      }}
    >
      {/*
        THE THREE PLANES (Founder audit 2026-09-13):

          STATIC MATERIAL PLANE — vignette + grain + brass hairline
          AMBIENT PLANE          — WATER-BREATH, gentle, non-market
          SEMANTIC MARKET PLANE  — children (chart, decisions, receipts)

        WATER MAY BREATHE. PRICE MAY ONLY MOVE WHEN TRUTH MOVES.
        NO OWNER = STILL.

        Rules the sanctuary keeps:
          · The three layers are STATIC CSS.  No JS animation loop,
            no requestAnimationFrame, no per-frame noise.
          · Grain is a repeating linear-gradient tile at ~5% opacity —
            never regenerated per frame.
          · WATER-BREATH is one 26s transform on ONE element and is
            AUTOMATICALLY DISABLED under prefers-reduced-motion.
          · Nothing here is keyed on market state. Green never means
            bullish; red never means bearish; nothing speeds up when a
            candle prints. If a future revision wants to drive an
            atmospheric cue from market truth, it must own the
            MOTION_OWNER / SOURCE_EVENT / FIDELITY_ROLE / AS_OF quartet
            or the audit's "NO OWNER = STILL" rule kills it.
          · pointer-events: none on every atmosphere layer so click/tap
            never lands on the vignette by accident.
          · z-index: 0 with the content plane at z-index: 1 keeps focus
            outlines and drawer transitions above the atmosphere.
      */}
      <style>{`
        .wm-sanctuary::before,
        .wm-sanctuary::after,
        .wm-sanctuary > .wm-water-breath {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }
        /* Vignette — static inset radial darkening so MARKET feels
           spatially deeper than the outer chrome. Never breathes. */
        .wm-sanctuary::before {
          background: radial-gradient(
            ellipse at center,
            transparent 45%,
            rgba(0,0,0,0.35) 100%
          );
        }
        /* Grain — repeating 3px tile at ~5% opacity. One layer, static. */
        .wm-sanctuary::after {
          background-image:
            repeating-linear-gradient(
              0deg,
              rgba(255,255,255,0.014) 0,
              rgba(255,255,255,0.014) 1px,
              transparent 1px,
              transparent 3px
            ),
            repeating-linear-gradient(
              90deg,
              rgba(255,255,255,0.014) 0,
              rgba(255,255,255,0.014) 1px,
              transparent 1px,
              transparent 3px
            );
          mix-blend-mode: overlay;
        }
        /* WATER-BREATH — very subtle brass radial wash, drifting.
           Non-market. Zero information. Only present when the OS has
           NOT asked for reduced motion. Kept intentionally low-contrast
           and low-amplitude so it reads as room air, not as a signal. */
        .wm-sanctuary > .wm-water-breath {
          background: radial-gradient(
            ellipse 60% 40% at 30% 20%,
            rgba(201,165,92,0.045) 0%,
            transparent 60%
          );
          opacity: 0.9;
        }
        @media (prefers-reduced-motion: no-preference) {
          .wm-sanctuary > .wm-water-breath {
            animation: wm-breathe 26s ease-in-out infinite;
            will-change: transform, opacity;
          }
        }
        @keyframes wm-breathe {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.85; }
          50%      { transform: translate3d(8px, 4px, 0) scale(1.02); opacity: 1; }
        }
        /* Content plane sits above the atmosphere. Direct children of
           .wm-sanctuary get lifted (except the water-breath layer
           itself, which stays behind). */
        .wm-sanctuary > *:not(.wm-water-breath) {
          position: relative;
          z-index: 1;
        }
      `}</style>
      <div className="wm-water-breath" aria-hidden="true" />
      {/* Quiet chrome: brand + seven-mode operating-state bar + the one job. */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: WM.space.md,
          padding: `${WM.space.sm}px ${WM.space.md}px`,
          borderBottom: `1px solid ${WM.border.hair}`,
          background: WM.surface.deep,
        }}
      >
        {brand && <div style={{ flexShrink: 0, opacity: 0.9 }}>{brand}</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ExperienceModeBar bus={bus} />
        </div>
        {hasRail && (
          <button
            type="button"
            onClick={() => setRailOpen((v) => !v)}
            aria-pressed={showRail}
            aria-label={`${showRail ? "Hide" : "Show"} ${railLabel}`}
            style={{
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              padding: "5px 10px",
              borderRadius: WM.radius.md,
              border: `1px solid ${showRail ? WM.border.strong : WM.border.hair}`,
              color: showRail ? WM.text.hero : WM.text.muted,
              background: showRail ? WM.surface.raised : "transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {railLabel}
          </button>
        )}
      </header>

      {/* The current job, stated once. Gold = identity/ceremony, per canon. */}
      <div
        style={{
          padding: `${WM.space.xs}px ${WM.space.md}px`,
          fontSize: 11,
          letterSpacing: 0.3,
          color: WM.gold.mark,
          background: WM.surface.deep,
          borderBottom: `1px solid ${WM.border.hair}`,
        }}
      >
        {emphasis.job}
      </div>

      {/* Body: sacred canvas + collapsible guest rail. */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <main style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: "auto" }}>{children}</main>
        {showRail && (
          <aside
            aria-label={railLabel}
            style={{
              width: 320,
              maxWidth: "34vw",
              flexShrink: 0,
              overflow: "auto",
              borderLeft: `1px solid ${WM.border.hair}`,
              background: WM.surface.deep,
            }}
          >
            {rail}
          </aside>
        )}
      </div>
    </div>
  );
}

export default WMExperienceShell;
