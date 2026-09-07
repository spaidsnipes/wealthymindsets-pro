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
 *
 * ── v2 (2026-09-06): the capital column ─────────────────────────────────────
 *
 * v1 expressed the law using MODE alone, and was imported by nothing. Both
 * facts were problems, and the second one hid the first.
 *
 * MODE is a preference. The human clicks it, and `inferJobMode` can propose it
 * from market shape. It answers "what are you trying to do." It does NOT
 * answer "is your money exposed" — a trader can sit in LEARN with a live
 * position, or in MANAGE with a flat book. Driving a capital-safety behaviour
 * off a preference means the human can dismiss a risk state by changing tabs,
 * which is the failure mode where the interface is most confidently wrong.
 *
 * So v2 takes a SECOND, independent input: the capital observation, sourced
 * from `compileScene`'s `capitalAtRisk` via the activeSceneBus. The two inputs
 * do different jobs and are never allowed to substitute for one another:
 *
 *   mode    → tier3Opacity   (EMPHASIS: how loud may the ecosystem be)
 *   capital → railWithheld   (ADMISSION: what is in the always-visible rail)
 *
 * That is the same ADMISSION-vs-EMPHASIS separation the scene compiler already
 * draws. Emphasis may follow a preference. Admission may not.
 *
 * ── The three-state capital input, and why it is not a boolean ──────────────
 *
 * "No exposure observed" and "nothing on screen can observe exposure" are
 * different facts. §14.1: FLAT is a FINDING, never a default. A boolean
 * collapses them, and collapses them toward the reassuring answer. So the
 * input is `CapitalObservation`, and UNOBSERVED gets its own branch that
 * withholds nothing and claims nothing.
 *
 * ── What "reduce navigation" is allowed to mean here ────────────────────────
 *
 * NOT "remove destinations". The founder UI Priority Lock is explicit that no
 * surface becomes unreachable, and trapping a trader inside a screen while
 * money is live would be a worse failure than the one being fixed. What is
 * withheld from the RAIL moves into the Workspace drawer that already holds
 * every other destination — one click, same as always.
 *
 * Two things are therefore structurally protected and asserted in tests:
 *  - Every Tier 1 live-decision surface survives in the rail, always.
 *  - Nothing is ever withheld without `reductionNote` explaining it in words.
 *    §9's colour clauses all end "…and a word"; a surface that vanishes
 *    silently is a worse version of the thing that rule exists to prevent.
 */

import type { ExperienceMode } from "./decisionContextBus";
import { shellEmphasis } from "./shellLayout";

export const NAV_EMPHASIS_VERSION = "wm.nav-emphasis.v2" as const;

/**
 * What the app shell knows about the trader's exposure right now.
 *
 * Mirrors `CapitalObservation` in useActiveScene.ts. Redeclared structurally
 * rather than imported so this module stays free of the React layer — the two
 * are pinned to each other by a test, not by a comment.
 */
export type NavCapitalObservation = "AT_RISK" | "NO_EXPOSURE_OBSERVED" | "UNOBSERVED";

/**
 * A navigation destination as the shell knows it. Structural, so the shell's
 * own NAV_CORE array satisfies it without this module importing React or the
 * icon set.
 */
export interface NavCandidate {
  readonly href: string;
  readonly label: string;
  /** 1 = live-decision surface (never withheld). 2 = strengthening tool. */
  readonly tier: number;
}

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

  // ── v2: the capital column ────────────────────────────────────────────────
  /** What the shell actually knows about exposure. Never inferred from mode. */
  readonly capital: NavCapitalObservation;
  /**
   * Hrefs withheld from the ALWAYS-VISIBLE rail while capital is live. Every
   * one of them remains reachable in one click via the Workspace drawer —
   * withheld from the rail is not removed from the product.
   */
  readonly railWithheld: readonly string[];
  /**
   * The sentence shown where the withheld items were. `null` exactly when
   * `railWithheld` is empty — a surface may never disappear without a word.
   */
  readonly reductionNote: string | null;
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
export function selectNavEmphasis(
  mode: ExperienceMode,
  /**
   * What the shell OBSERVES about exposure. Defaults to UNOBSERVED, which is
   * the honest answer for a caller that has no capital column at all — and
   * which withholds nothing, so v1 callers keep v1 behaviour exactly.
   */
  capital: NavCapitalObservation = "UNOBSERVED",
  /** The rail's current destinations. Empty = caller is asking about emphasis only. */
  railCandidates: readonly NavCandidate[] = [],
): NavEmphasis {
  const liveFocus = shellEmphasis(mode).liveFocus;
  const tier3Opacity = liveFocus ? TIER3_QUIET_OPACITY : TIER3_FULL_OPACITY;

  // ADMISSION. Driven by capital ONLY — never by `mode`, never by `liveFocus`.
  // Tier 1 is structurally exempt: the live-decision surfaces are the ones a
  // trader with an open position needs MOST, and §9's phone law is explicit
  // that nothing may block the exit path.
  const withheld =
    capital === "AT_RISK"
      ? railCandidates.filter(item => item.tier !== 1).map(item => item.href)
      : [];

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
    capital,
    railWithheld: withheld,
    // The note and the withholding are produced together, from one expression,
    // so no future edit can make a surface vanish without saying why.
    reductionNote:
      withheld.length === 0
        ? null
        : `Capital is live. ${withheld.length} ${withheld.length === 1 ? "surface" : "surfaces"} moved to Workspace so the decision surfaces lead — still one click away.`,
  };
}

export default selectNavEmphasis;
