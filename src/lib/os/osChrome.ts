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

import {
  CANONICAL_FIDELITY_LABELS,
  type CanonicalFidelityLabel,
} from "@/lib/marketData/canonicalFidelityLabels";
import { REST_QUOTE_SOURCES, priceSourceBadge } from "@/lib/priceSource";

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
   * Whether a real price was received for THIS selection — not merely that a
   * provider is configured for it.
   *
   * ── WHY THIS IS EVIDENCE AND NOT A VERDICT ─────────────────────────────────
   * This field used to be `fidelity: CapabilityFidelity | null` — a
   * CERTIFICATION verdict. That asked every room for a conclusion no room can
   * reach. `certifySource` is the only thing in the codebase that produces a
   * `CapabilityFidelity`, it runs against provider probes on the server, and no
   * trading surface calls it. So the one honest answer available to `/charts`,
   * to the deck, and to the Vault was `null` — "no certification resolved" —
   * which compiles to FEED UNKNOWN. That is why, two commits into teaching this
   * ladder to grade fidelity correctly, NOTHING had ever published an
   * observation: not an unwritten wire, a field whose shape no caller could
   * fill.
   *
   * Rooms hold EVIDENCE: which provider answered, whether a price arrived, when
   * the last print landed, whether the socket is up, whether the session is
   * open. `priceSourceBadge` is the single writer that grades that evidence.
   * The fields on this interface are exactly that evidence and nothing more.
   */
  readonly quotePresent: boolean;
  /** Epoch ms of the last observed print, or null if nothing was observed. */
  readonly lastObservedAtMs: number | null;
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
 * Which tone each canon reading wears in the masthead.
 *
 * `Record<CanonicalFidelityLabel, …>` rather than a switch, so the day the
 * Visual Systems Canon grows an eighth label `tsc` fails HERE and forces a tone
 * decision — instead of that label arriving at the badge and falling through a
 * default to the green pip.
 *
 * BLOCKED BY ENTITLEMENT is IDLE, not DELAYED: a wall is not a lag. The trader
 * who reads "delayed" waits; the trader who reads a wall goes and fixes an
 * account. Colour that tells them to wait costs them the whole session.
 */
const TONE_BY_LABEL: Record<CanonicalFidelityLabel, FeedTone> = {
  [CANONICAL_FIDELITY_LABELS.LIVE_CERTIFIED_QUOTE]: "LIVE",
  [CANONICAL_FIDELITY_LABELS.DELAYED_BY_ENTITLEMENT]: "DELAYED",
  [CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED]: "DELAYED",
  [CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED]: "DELAYED",
  [CANONICAL_FIDELITY_LABELS.BLOCKED_BY_ENTITLEMENT]: "IDLE",
  [CANONICAL_FIDELITY_LABELS.STALE_PIPELINE]: "IDLE",
  [CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED]: "IDLE",
};

/**
 * Compile the masthead's feed badge.
 *
 * ── THE DEFECT THIS ENDS, WHICH IS THE ONE ABOVE IT ────────────────────────
 *
 * Two commits taught this function to grade fidelity like `priceSourceBadge`:
 * one gave it closed-session precedence, the next gave it the full
 * `CapabilityFidelity` vocabulary. Both findings were right and both were the
 * same finding, one level too shallow. THE MASTHEAD WAS NOT A SECOND OWNER OF
 * THE WORDS. IT WAS A SECOND OWNER OF THE LADDER. A third commit teaching this
 * copy to imitate the original more faithfully is not convergence; it is two
 * implementations drifting in lockstep until the day they don't.
 *
 * And the imitation could never have succeeded, because the two ladders do not
 * take the same input. `priceSourceBadge` grades a PROVIDER against observed
 * evidence. This one graded a CERTIFICATION. On the real /charts path — webull,
 * moomoo, longbridge, finnhub, yahoo — no certification is resolved, so this
 * ladder returned FEED UNKNOWN while the chip six inches below it read ACTIVE
 * DEGRADED with a price and a change. The contradiction was not avoidable by
 * grading more carefully. It was in the argument list.
 *
 * So this compiles nothing about fidelity. It delegates to the single writer,
 * and contributes ONLY what the frame uniquely owns:
 *
 *   · THE FRESHNESS BUDGET. `priceSourceBadge` takes `fresh` as evidence and
 *     documents that its callers derive it; it never sees a timestamp. The
 *     frame holds `lastObservedAtMs` and turns it into that flag — which is a
 *     join, not a second opinion.
 *   · THE CLOCK GUARD. A print stamped in the future is not freshness.
 *   · THE TRANSPORT ARM, because the canon has a reading for a dead pipe and
 *     the provider arms of the delegate do not consult `connected` at all.
 *   · FEED UNKNOWN, which is not a canon reading but the absence of one, and
 *     therefore cannot come from a compiler of readings.
 *
 * WHY `evaluatedAtMs` IS AN ARGUMENT AND NOT A FIELD ON THE OBSERVATION
 *
 * Staleness is a fact about NOW, and a room does not know when the masthead
 * will next be painted. If every room carried its own clock in its published
 * observation, the OS would hold as many opinions about the present moment as
 * it has open surfaces — and because rooms publish through a value-compared
 * effect, each tick of each of those clocks would re-publish the whole
 * standing. Rooms report what the market DID; the frame supplies when it is
 * being read. One clock, owned where the reading is rendered.
 */
export function compileFeedStanding(obs: FeedObservation, evaluatedAtMs: number): FeedStanding {
  // Nothing to grade. `quotePresent` is load-bearing and NOT redundant with a
  // source name: a configured provider that has answered with nothing is the
  // exact case `priceSourceBadge` refuses to grade, and handing it
  // `present: true` on that evidence would manufacture the observation.
  if (obs.source === null || obs.lastObservedAtMs === null || !obs.quotePresent) {
    return {
      label: FEED_UNKNOWN,
      detail: "no observation yet",
      tone: "UNKNOWN",
      established: false,
    };
  }

  const ageMs = evaluatedAtMs - obs.lastObservedAtMs;
  // A negative age means the print is stamped in the future — a clock
  // disagreement between us and the provider. That is not freshness, and
  // reading it as "0ms old" would turn a broken clock into a LIVE badge.
  // Checked BEFORE the budget below, so a bad clock can never be rounded into
  // the `fresh: true` the delegate would then certify.
  if (ageMs < 0) {
    return {
      label: FEED_UNKNOWN,
      detail: "provider clock ahead of ours",
      tone: "UNKNOWN",
      established: false,
    };
  }

  // ── THE ONE DERIVATION THIS FRAME OWNS ───────────────────────────────────
  // `priceSourceBadge` documents `fresh` as evidence its callers supply and
  // never sees a timestamp; the frame holds the timestamp. Turning one into the
  // other is a JOIN, not a second opinion.
  //
  // REST_QUOTE_SOURCES get `undefined` — "not established" — per that module's
  // stated contract. Measuring a provider that publishes on a minutes cadence
  // BY DESIGN against a seconds-scale tape budget reports `fresh: false`, which
  // short-circuits the delegate to STALE PIPELINE and slanders a provider
  // behaving exactly as specified. Canon law 3: the absence of a per-trade tape
  // is a MISSING CAPABILITY, not a stalled pipeline.
  const fresh = REST_QUOTE_SOURCES.has(obs.source)
    ? undefined
    : ageMs <= LIVE_STALENESS_BUDGET_MS;

  // `connected !== false` rather than `connected ?? false`. A `null` transport
  // means the room did not report one, which is not the same as reporting a
  // dead one — and rounding it down would print STALE PIPELINE over a live
  // alpaca tape purely because a room stayed silent about its socket. The
  // known-down case is handled below, on the frame's own terms.
  const badge = priceSourceBadge(obs.source, obs.connected !== false, obs.sessionOpen, {
    present: true,
    fresh,
  });

  // The delegate cannot grade a provider it does not recognise, and says so
  // through two separate doors. Neither is a canon READING, so neither may
  // reach the badge as one.
  if (badge.unresolved || badge.availability === "unavailable") {
    return {
      label: FEED_UNKNOWN,
      detail: `${obs.source} · provider not recognised`,
      tone: "UNKNOWN",
      established: false,
    };
  }

  // ── CLOSURE OUTRANKS TRANSPORT, ASKED RATHER THAN RETYPED ────────────────
  // On a closed market a quiet socket is the EXPECTED condition, and naming it
  // a pipeline fault sends the trader to diagnose infrastructure instead of
  // reading a clock. That precedence used to be re-stated here, complete with
  // its own copy of the continuous-market exemption. Now the frame simply reads
  // the delegate's verdict: if closure already won, the transport arm does not
  // run. The rule has one owner and this is a reader of it.
  const sessionClosed = badge.label === CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED;

  if (!sessionClosed && obs.connected === false) {
    // Kept in the frame because the delegate's provider arms — webull, moomoo,
    // longbridge — never consult `connected` at all, so delegating this would
    // print ACTIVE DEGRADED over a dead socket. The canon has no separate word
    // for "the pipe is down"; STALE_PIPELINE is its infrastructure reading, and
    // the distinction that changes what a trader DOES survives in `detail`.
    return {
      label: CANONICAL_FIDELITY_LABELS.STALE_PIPELINE,
      detail: "transport disconnected",
      tone: "IDLE",
      established: true,
    };
  }

  return {
    label: badge.label,
    // The age is reported rather than hidden wherever it is the reason. On a
    // closed session it is not the reason and stating it invites the trader to
    // read a normal weekend as decay.
    detail: sessionClosed
      ? `${obs.source} · session closed`
      : fresh === false
        ? `${obs.source} · last print ${Math.floor(ageMs / 1000)}s ago`
        : `${obs.source} · ${badge.live ? "certified realtime" : "observed"}`,
    tone: TONE_BY_LABEL[badge.label],
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
