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
      className={className}
      data-mode={context.mode}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: WM.surface.deepest,
        color: WM.text.body,
      }}
    >
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
