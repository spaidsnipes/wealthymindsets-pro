import type { FeedStanding } from "@/lib/os/osChrome";

/**
 * THE MASTHEAD'S TRAILING CHIP HAS TWO HALVES, AND ONE OF THEM WAS INVISIBLE.
 *
 * Canon frame F24 draws the top band carrying exactly two things: the Workspace
 * and Tools brass plates at the leading edge, and ONE chip at the trailing edge
 * reading `INDICATIVE · asOf` — a fidelity word, a separator, and a statement of
 * WHEN. Two halves, both on the glass.
 *
 * `compileFeedStanding` has been computing both halves all along. `label` is the
 * canonical fidelity word and it renders. `detail` is the WHEN — and it reached
 * the trader only through `title=` on the badge (WMOperatingSystem.tsx:639).
 * A `title` attribute is a hover affordance. It does not exist on touch, it does
 * not exist at a glance, and it is not read by anything until a pointer rests
 * for a second. So the product shipped one half of a two-half chip and put the
 * other half behind a gesture most traders never make.
 *
 * WHY THAT IS A TRUTH DEFECT AND NOT A STYLING ONE. The eight `detail` strings
 * are not decoration; each one changes what a trader DOES:
 *
 *   "certified realtime"       act normally
 *   "observed"                 act with reduced confidence
 *   "last print 41s ago"       the tape has gone quiet — this is the reason
 *   "session closed"           the quiet is NORMAL, do not diagnose it
 *   "historical bars"          the candles are real, the QUOTE is not present
 *   "transport disconnected"   the pipe is down; reconnect, do not re-read
 *   "no observation yet"       nothing was even attributed
 *   "provider returned no quote" / "quote arrived without a provider timestamp"
 *   "provider clock ahead of ours" / "provider not recognised"
 *
 * Three of those sit under the SAME label. `FEED UNKNOWN` covers "nothing was
 * attributed", "a provider answered with no price", and "a price arrived that
 * cannot be aged" — three states with three different next actions, collapsed
 * into one word on the glass and separated only inside a tooltip. That is the
 * precise shape of the defect `osChrome.ts:505-535` already records fixing one
 * layer down ("an absence must be a finding, not a default"): the distinction
 * was preserved in the data and then thrown away at the last inch.
 *
 * ── AND THEN THE WHEN TURNED OUT TO BE MISSING TOO ─────────────────────────
 *
 * F24's second half is not merely a word, it is `asOf 09:24:17 ET` — a WALL
 * CLOCK. The build reached `ACTIVE DEGRADED · observed`: a fidelity label and a
 * reason, and no instant anywhere. "observed" does not distinguish a price seen
 * four seconds ago from one seen forty minutes ago, and "last print 41s ago"
 * states an age against a frame clock that resamples every 15s rather than the
 * moment itself. So the chip has a THIRD part, compiled from the same
 * `lastObservedAtMs` the detail is already computed from — one number, one
 * owner, two readings that cannot drift because neither is re-derived.
 *
 * ── WHAT THIS OWNER REFUSES TO DO ──────────────────────────────────────────
 *
 * It does not INVENT a second half. If `detail` is empty or blank the chip is
 * one half, and says so by omitting the separator entirely — a dangling `·` is
 * a promise of a reading that is not there, which is how "—" in a title slot
 * came to occupy the shape of a title (WMOperatingSystem.tsx:1221).
 *
 * It does not render `provenance`. That field is the vendor name, marked
 * "INTERNAL only — never render in user chrome" at osChrome.ts:122-128 because
 * of WM-CHART-PROV-EMERG-01. This module takes `FeedStanding` whole and touches
 * two fields; a future edit that reaches for a third has to pass this comment.
 *
 * It does not decide COLOUR. Tone already owns the ink and the dot in
 * `FeedBadge`; a second opinion about tone here is how two nodes come to
 * disagree about one reading.
 */

export interface OsFeedChipParts {
  /** The canonical fidelity word. Always present. */
  readonly label: string;
  /**
   * The WHEN half, or `null` when the compiler produced nothing to say. `null`
   * means the separator must be omitted too — see `separator`.
   */
  readonly detail: string | null;
  /**
   * `"·"` when there are genuinely two halves, `null` otherwise. Rendering is
   * then a plain truthy check with no chance of a dangling separator.
   */
  readonly separator: string | null;
  /**
   * The WHEN-EXACTLY half — canon F24's `asOf 09:24:17 ET` — or `null` when
   * the compiler resolved no observed instant. Same no-dangling rule as
   * `detail`: `null` here means `instantSeparator` is `null` too.
   */
  readonly instant: string | null;
  /** `"·"` when an instant is genuinely present, `null` otherwise. */
  readonly instantSeparator: string | null;
  /**
   * The whole chip as one sentence, for `aria-label` and `title`. Assistive
   * tech gets the same halves the eye gets, in the same order.
   */
  readonly spoken: string;
  /**
   * True when `established` is false — the reading rests on an absence. The
   * caller uses this to keep the hollow-dot treatment and to mark the node, so
   * a guard can tell "we know this" from "we do not".
   */
  readonly unestablished: boolean;
}

/**
 * THE INSTANT'S ONE FORMATTER — AND WHY IT CANNOT MISMATCH ON HYDRATION.
 *
 * This repo has a documented React #418 history caused by chrome that formats
 * times at render. Two separate hazards produce that error, and this shape
 * closes both:
 *
 *   1. A RENDER-TIME CLOCK. Server renders at T₀, client hydrates at T₁, the
 *      strings differ. Closed at the source: the only input is
 *      `feed.observedAtMs`, an epoch compiled from the observation. Nothing
 *      here reads `Date.now()`, and `compileFeedStanding` is forbidden from
 *      deriving the instant from its render clock (osChrome.ts's field note).
 *      Identical props therefore give an identical string forever.
 *
 *   2. AMBIENT LOCALE AND ZONE. `toLocaleTimeString()` with no arguments reads
 *      the HOST's locale and timezone — a UTC server and a New York browser
 *      then render different text from the SAME number, which is a mismatch a
 *      deterministic input cannot save you from. Closed by pinning all three
 *      variables: locale `en-US`, zone `America/New_York`, and every field
 *      given explicitly. `hourCycle: "h23"` rather than bare `hour12: false`
 *      because the latter yields `24:00:17` at midnight under some ICU builds,
 *      which is a different string for the same instant.
 *
 * Constructed once at module scope: `Intl.DateTimeFormat` is expensive, and a
 * per-call constructor in a component that paints on every tick is how a chip
 * starts costing frames.
 *
 * `America/New_York` is HARDCODED with the suffix `ET` because the canon frame
 * says `ET` — the trading day this product is about is a New York one, and a
 * clock that silently re-zones itself to the reader's laptop would make two
 * traders reading the same tape disagree about when it printed.
 */
const ET_CLOCK = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/**
 * Format an observed epoch as the canon `asOf 09:24:17 ET`, or `null` if the
 * number cannot honestly be a time.
 *
 * The plausibility test is REPEATED here rather than trusted from the compiler.
 * This is a total pure function over a public interface, and `Intl` will format
 * `-8.64e15` into a confident-looking wall clock without complaint; a formatter
 * that can only be called safely is not the same thing as a safe formatter.
 */
function formatObservedInstant(observedAtMs: unknown): string | null {
  if (typeof observedAtMs !== "number" || !Number.isFinite(observedAtMs)) return null;
  if (observedAtMs < Date.UTC(2000, 0, 1) || observedAtMs >= Date.UTC(2100, 0, 1)) return null;
  return `asOf ${ET_CLOCK.format(observedAtMs)} ET`;
}

/**
 * Compose the trailing chip from a compiled feed standing.
 *
 * Total over every `FeedStanding` the compiler can emit, including ones with a
 * blank detail, because the alternative — throwing, or returning an empty label
 * — would put a hole in the masthead at exactly the moment the feed is sick.
 */
export function osFeedChipParts(feed: FeedStanding): OsFeedChipParts {
  const label = typeof feed.label === "string" && feed.label.trim().length > 0
    ? feed.label.trim()
    : "FEED UNKNOWN";

  const rawDetail = typeof feed.detail === "string" ? feed.detail.trim() : "";
  const detail = rawDetail.length > 0 ? rawDetail : null;

  const instant = formatObservedInstant(feed.observedAtMs);

  return {
    label,
    detail,
    separator: detail === null ? null : "·",
    instant,
    instantSeparator: instant === null ? null : "·",
    // Joined from whatever halves EXIST, in eye order. Written as a filter
    // rather than nested ternaries because the chip now has three slots and two
    // of them are optional: the ternary form spells six cases, and the one it
    // got wrong in rehearsal was `detail === null && instant !== null`, which
    // produced a leading "·" — the dangling separator this file was written to
    // outlaw, arriving from the other side.
    spoken: [label, detail, instant].filter((s) => s !== null).join(" · "),
    unestablished: feed.established !== true,
  };
}
