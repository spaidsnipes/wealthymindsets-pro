"use client";
import * as React from "react";
import { WM } from "@/lib/design/wmTokens";
import type { DecisionContextBus } from "@/lib/experience/decisionContextBus";
import { useDecisionContext } from "@/lib/experience/useDecisionContext";
import { useSanctuarySession } from "@/lib/experience/sanctuarySessionContext";
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
/**
 * Session dimension the sanctuary is allowed to observe.
 *
 * The Founder brief (2026-09-13) is explicit that CLOSED reads CALM: "last
 * verified market picture remains. Calm. No fake candle activity." Ambient
 * WATER-BREATH is not market truth, but reading like a busy trading room
 * behind a closed tape is exactly the pretend-alive shape the brief was
 * written to abolish. So the sanctuary accepts ONE session signal, tunes
 * its tempo to it, and refuses everything else.
 *
 * Kept as a small closed union — never a canonical MarketQualityState —
 * because those states are producer identities and the sanctuary is a
 * consumer costume. "OPEN" is the default and covers PREMARKET/RTH/AFTER
 * as a single "the tape can move" bucket; "CLOSED" is the founder canon
 * word from §7; "UNKNOWN" is the honest default when the caller has not
 * yet resolved a session.
 */
export type WMExperienceSessionSignal = "OPEN" | "CLOSED" | "UNKNOWN";

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
  /**
   * The scene's session, if the caller knows it. When absent or "UNKNOWN"
   * the sanctuary defaults to OBSERVE tempo — the brief allows breath at
   * that intensity; what it forbids is BUSY behind a CLOSED tape.
   */
  readonly session?: WMExperienceSessionSignal;
}

export function WMExperienceShell({
  brand,
  children,
  rail,
  railLabel = "Context",
  bus,
  className,
  session = "UNKNOWN",
}: WMExperienceShellProps) {
  const { context } = useDecisionContext(bus);
  const emphasis = shellEmphasis(context.mode);
  // The prop wins over the context — an explicit caller (mostly tests and
  // the founder-room preview) can override the surrounding page's signal
  // without a Provider hop. When the prop is UNKNOWN (the default), the
  // context's answer takes over.
  const contextSession = useSanctuarySession();
  const resolvedSession = session === "UNKNOWN" ? contextSession : session;

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
      data-session={resolvedSession}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        minHeight: 0,
        overflow: "hidden",
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
        /* MODE-KEYED (not market-keyed) atmosphere intensity.
           The audit's law is that market truth cannot drive atmosphere.
           EXPERIENCE MODE is different: it is the trader's own DECLARED
           intent — PREP/OBSERVE/WAIT/EXECUTE/MANAGE/REVIEW/LEARN —
           committed through the seven-mode bar with source=user. That is
           not a market claim; it is a self-report about which job the
           trader is on. Dimming the room in WAIT (no pulse baiting a
           trade) and steadying it in EXECUTE (place the planned
           decision) is exactly the audit's WAIT/EXECUTE atmosphere spec.
           No color changes, no red/green — only intensity, so the "state
           carried by labels, not decoration" law is preserved. */
        .wm-sanctuary[data-mode="WAIT"] > .wm-water-breath { opacity: 0.55; }
        .wm-sanctuary[data-mode="EXECUTE"] > .wm-water-breath { opacity: 1; }
        .wm-sanctuary[data-mode="MANAGE"] > .wm-water-breath { opacity: 0.95; }
        @media (prefers-reduced-motion: no-preference) {
          .wm-sanctuary > .wm-water-breath {
            animation: wm-breathe 26s ease-in-out infinite;
            will-change: transform, opacity;
          }
          /* In WAIT the room is very quiet: the audit's exact word.
             Slow the ambient cycle by half so the ceremony reads calm. */
          .wm-sanctuary[data-mode="WAIT"] > .wm-water-breath {
            animation-duration: 52s;
          }
          /* Founder brief (2026-09-13): "CLOSED: last verified market picture
             remains. Calm. No fake candle activity." Ambient breath is not
             market truth, but reading BUSY behind a closed tape is exactly the
             pretend-alive shape the brief was written to abolish. When the
             session signal is CLOSED, the sanctuary reads at WAIT's tempo
             regardless of the trader's job — the room is calm because the
             market is calm, not because the trader is waiting. */
          .wm-sanctuary[data-session="CLOSED"] > .wm-water-breath {
            animation-duration: 52s;
            opacity: 0.55;
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
      {/* Quiet chrome: brand + seven-mode operating-state bar + the one job.
          SCENE_FRAGMENTATION cure (Founder audit continuation): the header
          used to sit on WM.surface.deep — a solid opaque bar visually
          separated from the room beneath it. The Founder mandate is that
          MARKET IS THE ROOM; a chrome band above the room reads as a
          separate app-header plane. Transparent header + hairline lets the
          sanctuary atmosphere (vignette + grain + WATER-BREATH) continue
          all the way to the wordmark, so the top of the first viewport
          reads as the same room the market sits inside. */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: WM.space.md,
          padding: `${WM.space.sm}px ${WM.space.md}px`,
          borderBottom: `1px solid ${WM.border.hair}`,
          background: "transparent",
        }}
      >
        {/* Left cell. It renders even when no brand is supplied, because the
            job caption below is NOT optional — a shell without a wordmark must
            still tell the trader what job they are in. */}
        <div style={{ flexShrink: 0, opacity: 0.9, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            {brand}
            {/*
              SCENE_FRAGMENTATION repair (Founder audit 2026-09-13). The job
              sentence used to be its OWN full-width horizontal band directly
              beneath this header, with its own bottom hairline. Measured live
              on production at 1920x847: a 69px nav rail, then a 26px stripe
              carrying one sentence, then the room. Two stacked bars of
              permanent chrome consumed 11% of the viewport before the trader
              reached any market pixel, and the audit names permanent chrome
              as a fragmentation vector by name.

              The sentence is not chrome in its own right — it is the CAPTION
              OF THE SELECTED MODE, which is the control immediately to its
              right. Putting it under the wordmark inside the same band makes
              the relationship visible instead of implied, and removes a
              horizontal stripe without removing a word.
            */}
            <span
              data-testid="shell-job-caption"
              style={{
                fontSize: 10,
                letterSpacing: 0.3,
                color: WM.gold.mark,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 260,
              }}
            >
              {emphasis.job}
            </span>
        </div>
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

      {/* The job caption used to be a standalone band here. It now rides under
          the wordmark inside the header above — still stated exactly once, and
          still gold, but no longer costing the room its own horizontal stripe.
          See the comment at its new site for the measurement that motivated
          the move. */}

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
              // Same reasoning as the header — a chrome-coloured column
              // beside MARKET reads as a separate rail-plane. Transparent
              // keeps the guest content inside the sanctuary atmosphere;
              // the left hairline still delimits it as an ASIDE.
              background: "transparent",
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
