/**
 * selectNavEmphasis — pure navigation right-of-way for the WM Pro app shell.
 *
 * Founder UI Priority Lock (2026-08-30): "FOCUS THE PRODUCT; DO NOT ISOLATE
 * THE PRODUCT." The primary sidebar carries three tiers of surface:
 *   Tier 1 — always-primary live-decision surfaces (Command Deck / Charts /
 *            Market Truth / Structure / Order Flow / WHY).
 *   Tier 2 — trader-strengthening tools (Academy / Journal / Automation /
 *            Paper / Backtest).
 *   Tier 3 — WOW ecosystem support (Radio / TV / Lounge / Shop / Passport).
 *
 * The law: during ACTIVE TRADE / OPEN RISK the live-decision surfaces have
 * right-of-way and the entertainment ecosystem quiets down; during
 * WAITING / DONE / SAFE-TO-LEAVE the ecosystem may become more visible again.
 *
 * This selector expresses ONLY that emphasis. It composes with the existing
 * canon: `shellEmphasis(mode).liveFocus` already marks the live-market jobs
 * (OBSERVE / WAIT / EXECUTE / MANAGE) versus the reflection jobs
 * (PREP / REVIEW / LEARN). We reuse that single source of truth rather than
 * re-deriving "is the human live" a second way.
 *
 * INVARIANTS (mirrors shellLayout / selectDeckEmphasis doctrine):
 *  - Presentation-only. No surface is ever removed, disabled, or unreachable —
 *    Tier 3 is only visually quieted (reduced opacity), never hidden. Every
 *    destination stays one click away in every mode.
 *  - Tier 1 is NEVER quieted in any mode. The live-decision block always leads.
 *  - Tier 2 is never quieted either; strengthening tools stay calm-neutral.
 *  - PURE — no React, no I/O, no clock. Deterministic and total over every mode.
 */

import type { ExperienceMode } from "./decisionContextBus";
import { shellEmphasis } from "./shellLayout";

export const NAV_EMPHASIS_VERSION = "wm.nav-emphasis.v1" as const;

export interface NavEmphasis {
  readonly version: typeof NAV_EMPHASIS_VERSION;
  readonly mode: ExperienceMode;
  /**
   * TRUE in the live-market jobs (OBSERVE / WAIT / EXECUTE / MANAGE) — the human
   * has right-of-way for trade / risk / exit decisions. Mirrors
   * `shellEmphasis(mode).liveFocus` so the two can never disagree.
   */
  readonly liveFocus: boolean;
  /**
   * The opacity (0..1) the Tier 3 WOW-ecosystem group renders at. Quieted (but
   * never zero — the surfaces stay visible and clickable) while live; full while
   * reflecting. A floor keeps Tier 3 legible so nothing ever disappears.
   */
  readonly tier3Opacity: number;
  /** Convenience flag: is the Tier 3 group currently quieted below full? */
  readonly tier3Quieted: boolean;
  /** Tier 1 always renders at full strength — encoded so callers never guess. */
  readonly tier1Opacity: 1;
  /** One-line reason for this emphasis — for a11y / tooltip honesty. */
  readonly rationale: string;
}

/** Quieted Tier 3 opacity while live — dimmed but plainly legible & clickable. */
export const TIER3_QUIET_OPACITY = 0.55;
/** Full Tier 3 opacity while reflecting / safe-to-leave. */
export const TIER3_FULL_OPACITY = 1;

/**
 * Resolve the sidebar's tier emphasis for a job-mode. Total over every
 * ExperienceMode; presentation-only. When the human is in a live-market job the
 * WOW ecosystem quiets so the live-decision surfaces have right-of-way; in a
 * reflection job the ecosystem returns to full visibility.
 */
export function selectNavEmphasis(mode: ExperienceMode): NavEmphasis {
  const liveFocus = shellEmphasis(mode).liveFocus;
  const tier3Opacity = liveFocus ? TIER3_QUIET_OPACITY : TIER3_FULL_OPACITY;
  return {
    version: NAV_EMPHASIS_VERSION,
    mode,
    liveFocus,
    tier3Opacity,
    tier3Quieted: tier3Opacity < TIER3_FULL_OPACITY,
    tier1Opacity: 1,
    rationale: liveFocus
      ? "Live decision in progress — trade, risk and exit lead; the WOW ecosystem is quieted, not removed."
      : "Reflecting / safe to leave — the WOW ecosystem returns to full visibility.",
  };
}

export default selectNavEmphasis;
