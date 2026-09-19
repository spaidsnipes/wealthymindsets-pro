import { relTime } from "../nectarFormat";

/**
 * coverageLastEventFact — the "Last event" receipt row on /nectar/[symbol].
 *
 * ── THE DEFECT: A DASH, A HIDDEN CLOCK, AND AN UNBOUNDED SENTENCE ─────────
 *
 * The COVERAGE RECEIPTS panel prints five rows per channel. Four of them are
 * owned: `Coverage state` and `Fidelity class` carry tones from named
 * selectors, `Observed events` tones on a real count, and `Gaps` routes
 * through `describeGapCoverage` and carries its detail in a `title`. The
 * fifth row was this:
 *
 *     <ReceiptRow label="Last event"
 *                 value={ch.lastEventAt ? relTime(ch.lastEventAt) : "—"} />
 *
 * No tone. No title. No owner. Three separate defects live in that one line.
 *
 * ── 1. THE DASH IS SEVERAL ANSWERS WEARING ONE GLYPH ─────────────────────
 *
 * `lastEventAt` is absent for genuinely different reasons, and the row
 * collapsed all of them into `—`:
 *
 *   - the channel is UNAVAILABLE — no adapter ships for it, so no event ever
 *     could have arrived;
 *   - the channel is CONNECTING — it exists and has simply not spoken yet;
 *   - the receipt was persisted without the field (`coverageServerPersistence`
 *     writes `last_event_at` only when truthy, and reads it back optional).
 *
 * The first is a capability statement, the second is a timing statement, the
 * third is a bookkeeping gap in WM's own store. A dash states none of them.
 *
 * ── 2. TRUTHINESS IS NOT A RANGE CHECK ───────────────────────────────────
 *
 *     ch.lastEventAt ? relTime(ch.lastEventAt) : "—"
 *
 * `relTime` computes `now - t` and divides. It has NO UPPER BOUND and no
 * lower one, so every number it is handed becomes a confident sentence:
 *
 *   - a SECONDS-valued timestamp — and this codebase genuinely carries both
 *     units; `LegacyOhlcvTuple.time` and `liveBarPolicy`'s `tick.time` are in
 *     seconds while `coverageMap` writes `observation.receivedAt` in
 *     milliseconds — renders as `"20443d ago"`. Plausible-looking. Wrong by
 *     fifty-five years.
 *   - a timestamp from a clock running ahead renders as a NEGATIVE diff,
 *     which falls through every branch to `"-1d ago"`.
 *
 * A UNIT ERROR MUST NOT RENDER AS A FLUENT SENTENCE. This owner bounds the
 * value against a plausible calendar window and names the failure instead.
 *
 * ── 3. A HIDDEN CLOCK IS A HIDDEN CLAIM ──────────────────────────────────
 *
 * `relTime(t, now = Date.now())` reads the clock in a DEFAULT PARAMETER, so
 * the single call site above read `Date.now()` during render without saying
 * so. That is the exact shape of the five React #418 hydration defects this
 * codebase has already repaired. `now` is a REQUIRED argument here; the
 * caller must state which clock it is measuring against.
 *
 * ── WHAT IS DELIBERATELY *NOT* CLAIMED ───────────────────────────────────
 *
 *   - "5m ago" is WM's own receipt of when it last RECEIVED an event on this
 *     channel. It is not a claim about when the market produced it, nor that
 *     the channel is healthy now — `Coverage state` one row above owns that.
 *   - Nothing is hidden. An implausible timestamp is still disclosed as
 *     present-but-unusable rather than silently swapped for a dash, because
 *     "WM holds a number it cannot read" and "WM holds nothing" are
 *     different facts about WM's own store.
 *
 * PURE — no clock, no I/O, no React.
 */

/** The ONLY thing the Last-event row's tone may be derived from. */
export type LastEventTone = "OBSERVED" | "AGING" | "IMPLAUSIBLE" | "NONE";

export interface CoverageLastEventFact {
  /** Already phrased. Never a bare glyph, never an unbounded age. */
  readonly text: string;
  /** True when WM is rendering an age it can actually stand behind. */
  readonly measured: boolean;
  readonly tone: LastEventTone;
  readonly reason: string;
}

/**
 * 2000-01-01T00:00:00Z in milliseconds. Any smaller positive number is not a
 * millisecond timestamp from this decade — most likely it is SECONDS.
 */
const MIN_PLAUSIBLE_MS = Date.UTC(2000, 0, 1);

/** Tolerance for ordinary clock skew before a timestamp counts as future-dated. */
const FUTURE_SKEW_MS = 60_000;

/** Beyond this the age is still shown, but no longer in the freshest tone. */
const AGING_AFTER_MS = 24 * 60 * 60 * 1000;

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function coverageLastEventFact(
  lastEventAt: unknown,
  coverageState: string | null | undefined,
  now: number,
  channel: string,
): CoverageLastEventFact {
  const state = (coverageState ?? "").toUpperCase();

  if (!finite(lastEventAt) || lastEventAt <= 0) {
    if (state === "UNAVAILABLE") {
      return {
        text: "Never — channel unavailable",
        measured: false,
        tone: "NONE",
        reason: `WM has never received an event on the ${channel} channel because no adapter for it is shipped in this build. This is a CAPABILITY statement, not a timing one — waiting will not produce a timestamp here.`,
      };
    }
    if (state === "CONNECTING") {
      return {
        text: "No event yet",
        measured: false,
        tone: "NONE",
        reason: `The ${channel} channel exists and is connecting, but has not delivered a single event to WM yet. This is a TIMING statement — unlike an unavailable channel, this one may still speak.`,
      };
    }
    return {
      text: "Not recorded",
      measured: false,
      tone: "NONE",
      reason: `WM's coverage receipt for the ${channel} channel carries no last-event timestamp. WM will not infer one from the observed-event count or from when this page loaded: an absent field in WM's OWN bookkeeping is a gap in WM, and it is named rather than papered over with a dash.`,
    };
  }

  if (lastEventAt < MIN_PLAUSIBLE_MS) {
    return {
      text: "Timestamp unreadable",
      measured: false,
      tone: "IMPLAUSIBLE",
      reason: `WM holds a last-event value of ${lastEventAt} for the ${channel} channel, which is before the year 2000 when read as milliseconds — almost certainly SECONDS from a producer that disagrees with this store's unit. Rendered as a relative age it would read as a confident sentence roughly fifty-five years wrong, so WM names it unreadable instead. WM holds a number it cannot read; that is not the same as holding nothing.`,
    };
  }

  if (lastEventAt > now + FUTURE_SKEW_MS) {
    return {
      text: "Dated in the future",
      measured: false,
      tone: "IMPLAUSIBLE",
      reason: `The last-event timestamp for the ${channel} channel is ahead of the clock this row is measured against by more than a minute. WM cannot have received an event that has not happened, so one of the two clocks is wrong and WM will not print a negative age as though it were a measurement.`,
    };
  }

  const age = now - lastEventAt;
  const phrase = relTime(lastEventAt, now);

  if (age > AGING_AFTER_MS) {
    return {
      text: phrase,
      measured: true,
      tone: "AGING",
      reason: `WM last received an event on the ${channel} channel ${phrase}. That is over a day old, so the age is dimmed. This is WM's own receipt of RECEIPT — it does not claim the market produced the event then, and it makes no claim about whether the channel is flowing now; the Coverage state row above owns that.`,
    };
  }

  return {
    text: phrase,
    measured: true,
    tone: "OBSERVED",
    reason: `WM last received an event on the ${channel} channel ${phrase}, measured against this page's clock. This is WM's receipt of RECEIPT, not a claim about when the market produced the event, and not a claim that the channel is healthy right now — the Coverage state row above owns that.`,
  };
}
