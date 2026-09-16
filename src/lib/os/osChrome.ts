/**
 * osChrome — the single compiler for WM Pro's OPERATING-SYSTEM CHROME.
 *
 * THE DEFECT THIS EXISTS TO END
 *
 * The Founder sent ~28 canon mockups. Every one of them — Liquidity Weather,
 * Big Trade Intelligence, Decision-Time Machine, Market Reality Canvas, the
 * Long-Division Worksheet, Question-Driven Mode — wears the SAME five-region
 * silhouette:
 *
 *     MASTHEAD      crest · wordmark · surface · FEED STANDING · clock
 *     ROOM RAIL     the rooms, then the standing conditions
 *     ROOM          the work surface
 *     CONTEXT RAIL  passport / evidence / contextual analysis
 *     PROVENANCE    data source · fidelity · as-of · the decision word
 *
 * The build had THREE different frames instead (MainLayout, WMExperienceShell,
 * QuestionDrivenShell) and most routes wore none of them. That is why the app
 * reads as a pile of pages rather than one machine: not because any single
 * screen is wrong, but because no two screens agree on where the machine ends
 * and the work begins.
 *
 * WHY A COMPILER AND NOT JUST A COMPONENT
 *
 * Those mockups also paint `LIVE`, `INSTITUTIONAL GRADE`, `98.7% MEMORY
 * INTEGRITY`, `FIDELITY: LIVE · Level 2`. Every one of those is a CLAIM. A
 * frame that renders whatever string a route hands it makes the chrome the
 * easiest place in the codebase to tell a lie — it appears on every screen and
 * is typed by nobody in particular. So the readings are compiled HERE, from
 * evidence, with UNKNOWN as the default and no way to reach a confident label
 * without producing the evidence for it.
 *
 * PURE — no React, no clock read, no I/O. Every input arrives as an argument
 * so the same inputs always compile the same chrome.
 */

import { CANONICAL_FIDELITY_LABELS } from "@/lib/marketData/canonicalFidelityLabels";
import { CONTINUOUS_MARKET_SOURCES } from "@/lib/priceSource";

/**
 * How much the OS is entitled to say about its own data feed.
 *
 * Deliberately NOT a boolean. `connected === false` and "we have not yet
 * observed anything" are different facts, and the mockups' single green dot
 * cannot tell them apart — which is exactly how a disconnected feed ends up
 * wearing a LIVE badge on a Saturday.
 */
export type FeedTone = "LIVE" | "DELAYED" | "IDLE" | "UNKNOWN";

/**
 * The badge text the OS is NOT free to invent.
 *
 * Every confident reading below is a `CANONICAL_FIDELITY_LABELS` value. The
 * first cut of this compiler wrote its own words — "NO FEED", "STALE", "LIVE" —
 * and the canonicalFidelityLabels Sentinel caught it immediately: "NO FEED" is
 * a QUARANTINED phrase (§Legacy Surface Quarantine, "generic no-signal
 * blanket"). That catch was correct about something larger than one string. A
 * frame that appears on every screen speaking its own dialect of fidelity is
 * the product disagreeing with itself in the one place the user always looks.
 *
 * `FEED UNKNOWN` is the single label with no canon entry, because the canon
 * enumerates READINGS and this is the absence of one.
 */
const FEED_UNKNOWN = "FEED UNKNOWN";

export interface FeedStanding {
  /** Badge text. A canonical fidelity label, or FEED UNKNOWN. */
  readonly label: string;
  /** Why the badge says what it says. Never invented. */
  readonly detail: string;
  readonly tone: FeedTone;
  /** True only when the label rests on an observation, not on its absence. */
  readonly established: boolean;
}

export interface FeedObservation {
  /** Provider that produced the most recent tick, or null if none has. */
  readonly source: string | null;
  /**
   * Fidelity the provider is CERTIFIED for — not what we hope it is.
   * `null` when no certification has been resolved.
   */
  readonly fidelity: "REALTIME" | "DELAYED" | "SNAPSHOT" | null;
  /** Epoch ms of the last observed print, or null if nothing was observed. */
  readonly lastObservedAtMs: number | null;
  /** The instant the reading is being compiled for. */
  readonly evaluatedAtMs: number;
  /** Transport state, when the caller genuinely knows it. */
  readonly connected: boolean | null;
  /**
   * Whether this instrument's session is open, when the caller genuinely knows.
   *
   * TRI-STATE ON PURPOSE, and `null` is not a synonym for `true`. A room that
   * has not resolved the session calendar must say so; rounding "unknown" up to
   * "open" is how a badge asserts an active session on a Sunday.
   *
   * REQUIRED rather than optional so that adding a room to the OS forces the
   * author to answer the question. An optional field defaults to silence, and
   * silence here reads on screen as a claim.
   */
  readonly sessionOpen: boolean | null;
}

/**
 * How stale an observation may be and still be called LIVE.
 *
 * 90s rather than a few seconds: WM Pro's free tier polls, and a thin tape on
 * a quiet instrument legitimately goes a minute between prints. Calling that
 * DELAYED would make the badge flicker on truthful data, and a badge that
 * flickers gets ignored, which costs more truth than it buys.
 */
export const LIVE_STALENESS_BUDGET_MS = 90_000;

/**
 * Compile the masthead's feed badge.
 *
 * The ladder only ever SHARPENS: every path that lacks evidence lands on
 * UNKNOWN, and `established` is true only where an observation was actually
 * supplied. There is no argument that produces "LIVE" without a source, a
 * REALTIME certification, and a recent print.
 */
export function compileFeedStanding(obs: FeedObservation): FeedStanding {
  const observed =
    obs.source !== null && obs.lastObservedAtMs !== null && obs.fidelity !== null;

  // ── CLOSED IS NOT DELAYED, AND IT IS NOT BROKEN EITHER ───────────────────
  //
  // This branch is the reason this commit exists. The ladder below grades
  // FRESHNESS, and on a closed market every reading it can reach is a slander:
  // a print from Friday afternoon is older than the 90s budget, so the badge
  // that appears on EVERY OS screen would have read STALE PIPELINE all weekend
  // — an infrastructure alarm raised about a market behaving normally.
  //
  // It is worse than wrong on its own. `priceSourceBadge` (src/lib/priceSource
  // .ts) already applies this precedence, so the chart chip would have read
  // SESSION CLOSED — LAST VERIFIED while the masthead six inches above it read
  // STALE PIPELINE. TWO COMPILERS OF ONE FACT, disagreeing on the same screen,
  // in the vocabulary the trader is supposed to use to decide whether to trust
  // the number. That contradiction — not the missing wire — is what has kept
  // every room from publishing a FeedObservation at all.
  //
  // Precedence matches the sibling exactly:
  //   · AFTER the observation gate, because "LAST VERIFIED" asserts that a
  //     verified value EXISTS. Closure does not manufacture an observation.
  //   · BEFORE the transport check, because on a closed market a quiet socket
  //     is the expected condition and naming it a pipeline fault sends the
  //     trader to diagnose infrastructure instead of reading the clock.
  //   · BEFORE the entitlement arm, which is canon law #2 stated literally.
  //
  // The continuous-market exemption is imported, not re-declared: honouring
  // `sessionOpen: false` for crypto would print SESSION CLOSED over a genuinely
  // streaming tape, the mirror image of the defect being fixed here.
  if (
    obs.sessionOpen === false &&
    observed &&
    !CONTINUOUS_MARKET_SOURCES.has(obs.source as string)
  ) {
    return {
      label: CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED,
      detail: `${obs.source} · session closed`,
      tone: "IDLE",
      established: true,
    };
  }

  if (obs.connected === false) {
    // The canon has no separate word for "the pipe is down" — STALE_PIPELINE
    // is its infrastructure reading, and a transport that is delivering
    // nothing is the limiting case of one delivering nothing FRESH. The
    // distinction survives where it is actionable: in `detail`.
    return {
      label: CANONICAL_FIDELITY_LABELS.STALE_PIPELINE,
      detail: "transport disconnected",
      tone: "IDLE",
      established: true,
    };
  }

  if (!observed) {
    return {
      label: FEED_UNKNOWN,
      detail: "no certified observation yet",
      tone: "UNKNOWN",
      established: false,
    };
  }

  if (obs.fidelity === "DELAYED") {
    return {
      label: CANONICAL_FIDELITY_LABELS.DELAYED_BY_ENTITLEMENT,
      detail: `${obs.source} · certified delayed`,
      tone: "DELAYED",
      established: true,
    };
  }

  const ageMs = obs.evaluatedAtMs - obs.lastObservedAtMs;
  // A negative age means the print is stamped in the future — a clock
  // disagreement between us and the provider. That is not freshness, and
  // reading it as "0ms old" would turn a broken clock into a LIVE badge.
  if (ageMs < 0) {
    return {
      label: FEED_UNKNOWN,
      detail: "provider clock ahead of ours",
      tone: "UNKNOWN",
      established: false,
    };
  }

  if (ageMs > LIVE_STALENESS_BUDGET_MS) {
    return {
      label: CANONICAL_FIDELITY_LABELS.STALE_PIPELINE,
      detail: `${obs.source} · last print ${Math.floor(ageMs / 1000)}s ago`,
      tone: "IDLE",
      established: true,
    };
  }

  // A SNAPSHOT is a point-in-time picture that was genuinely verified — the
  // canon's HISTORICAL_BARS_VERIFIED, which exists precisely so a limited
  // capability is reported as limited rather than as a symbol-wide insult.
  if (obs.fidelity === "SNAPSHOT") {
    return {
      label: CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED,
      detail: `${obs.source} · snapshot`,
      tone: "DELAYED",
      established: true,
    };
  }

  return {
    label: CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE,
    detail: `${obs.source} · ${obs.fidelity.toLowerCase()}`,
    tone: "LIVE",
    established: true,
  };
}

/**
 * One standing condition — the readings the rail and the provenance bar both
 * carry (Evidence Debt, Right of Way).
 *
 * `unresolved` and `alert` are separate because they are different facts:
 * "we have no reading" must never wear the same ink as "we have a reading and
 * it is bad". Collapsing them is how an uncompiled ledger reads as a clean
 * bill of health.
 */
export interface StandingCondition {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly unresolved: boolean;
  readonly alert: boolean;
}

export interface StandingConditionsInput {
  /**
   * Open evidence items, or `null` when no ledger has been compiled.
   * `0` and `null` are emphatically not the same: zero open items is a clean
   * bill of health, and a ledger nobody opened has no health at all.
   */
  readonly openEvidenceItems: number | null;
  /** Compiled Right-of-Way verdict. */
  readonly rightOfWay: string;
  /** Whether that verdict is a real reading. */
  readonly rightOfWayResolved: boolean;
}

/** The decision word the canon treats as permission to act. */
export const RIGHT_OF_WAY_GRANTED = "ACTION";

/**
 * Compile the two standing conditions ONCE.
 *
 * The frame renders them in two places — the rail on desktop, the provenance
 * bar on phone — and two independently-typed copies of one reading is how a
 * screen ends up disagreeing with itself.
 */
export function compileStandingConditions(
  input: StandingConditionsInput,
): readonly StandingCondition[] {
  const { openEvidenceItems, rightOfWay, rightOfWayResolved } = input;
  const debtUnknown = openEvidenceItems === null;

  return [
    {
      label: "Evidence Debt",
      value: debtUnknown
        ? "UNKNOWN"
        : openEvidenceItems === 0
          ? "PAID"
          : `${openEvidenceItems} OPEN`,
      detail: debtUnknown ? "no ledger compiled" : "unpaid information",
      unresolved: debtUnknown,
      alert: !debtUnknown && openEvidenceItems > 0,
    },
    {
      label: "Right of Way",
      value: rightOfWay,
      detail: rightOfWayResolved ? "compiled from evidence" : "no permission reading",
      unresolved: !rightOfWayResolved,
      alert: rightOfWayResolved && rightOfWay !== RIGHT_OF_WAY_GRANTED,
    },
  ];
}

/**
 * The provenance line every mockup carries along the bottom edge:
 * "DATA SOURCE: RAW TICK · INSTITUTIONAL GRADE · TIME 06:42:18 UTC".
 *
 * Rendered as SEGMENTS rather than one pre-joined string so the frame cannot
 * be handed a sentence it did not compile — the bottom bar is the last place
 * in the app anyone looks, which makes it the easiest place to smuggle a
 * claim past review.
 */
export function compileProvenanceSegments(
  feed: FeedStanding,
  asOfLabel: string | null,
): readonly string[] {
  const segments = [`SOURCE ${feed.established ? feed.detail.toUpperCase() : "UNKNOWN"}`];
  // "AS OF —" is worse than no segment at all: it occupies the slot where a
  // timestamp belongs and reads as one at a glance.
  if (asOfLabel !== null) segments.push(`AS OF ${asOfLabel}`);
  return segments;
}
