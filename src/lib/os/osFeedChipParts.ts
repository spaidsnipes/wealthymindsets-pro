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
   * The whole chip as one sentence, for `aria-label` and `title`. Assistive
   * tech gets the same two halves the eye gets, in the same order.
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
 * Compose the two-half trailing chip from a compiled feed standing.
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

  return {
    label,
    detail,
    separator: detail === null ? null : "·",
    spoken: detail === null ? label : `${label} · ${detail}`,
    unestablished: feed.established !== true,
  };
}
