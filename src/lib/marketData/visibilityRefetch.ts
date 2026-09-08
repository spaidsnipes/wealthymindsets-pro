/**
 * COMING BACK TO A TAB IS NOT THE SAME AS BEING OWED DATA.
 *
 * Three surfaces poll quotes on a timer and additionally refetch when the
 * document becomes visible — TickerTape, WatchlistPanel and useWebSocket's
 * REST fallback. The visibility handler exists for one real reason: browsers
 * throttle or suspend timers in a backgrounded tab, so the scheduled round may
 * genuinely have been skipped and the data may genuinely be old.
 *
 * All three implemented it as "visible? fetch." — with no reference to whether
 * anything was actually due.
 *
 * MEASURED, /command-deck 2026-09-08, freshly reloaded page (no HMR-accumulated
 * intervals): 4 visibilitychange events produced 28 quote requests through
 * TickerTape's `onVisible`, against a 10-second poll interval. The visible ->
 * hidden -> visible flickers were 140ms wide. Each 140ms flicker bought a FULL
 * 14-symbol round.
 *
 * INSTRUMENT DISCLOSURE — the dispatcher in that measurement was the preview
 * harness, not the app. The EVENT RATE is therefore an artifact and is not
 * claimed as a production observation. What is NOT an artifact is the
 * component's response to the event: a 140ms round trip to hidden and back
 * must not cost a full provider round, whoever caused it. And on a phone the
 * dispatcher is real and frequent — iOS fires visibilitychange on every app
 * switch, screen lock, notification-shade pull and Control Center swipe. A
 * trader checking his broker app between entries pays a full quote round per
 * glance, on cellular, against rate-limited free providers. That is the same
 * shape as the Finnhub 429 self-storm already on record.
 *
 * This module is the single owner of "is a refetch OWED right now?". It
 * returns a verdict with a reason rather than a boolean, because "we did not
 * refetch" is a decision each surface must be able to explain.
 */

/** The tape and watchlist both poll every 10s. Their own value wins if passed. */
export const DEFAULT_REFETCH_INTERVAL_MS = 10_000;

export type VisibilityRefetchVerdict =
  | {
      readonly kind: "REFETCH";
      /** NEVER_FETCHED: nothing has been observed at all. OVERDUE: the timer
       *  was throttled away while hidden and the round is genuinely late. */
      readonly reason: "NEVER_FETCHED" | "OVERDUE";
      readonly overdueByMs: number;
    }
  | {
      readonly kind: "SKIP";
      /** STILL_HIDDEN: visibilitychange also fires on the way OUT.
       *  IN_FLIGHT: a round is already running; a second would race it.
       *  NOT_DUE: the scheduled round has not come around yet. */
      readonly reason: "STILL_HIDDEN" | "IN_FLIGHT" | "NOT_DUE";
      readonly dueInMs: number;
    };

export interface VisibilityRefetchInput {
  /** `document.visibilityState`. Passed in, never read here — this is pure. */
  readonly visibilityState: string;
  /** When the last round STARTED. Null means no round has ever been started. */
  readonly lastRoundStartedAt: number | null;
  /** Whether a round is currently running. */
  readonly inFlight: boolean;
  readonly now: number;
  readonly intervalMs?: number;
}

/**
 * Decide whether returning to the foreground has earned a provider round.
 *
 * Precedence is deliberate and each step is load-bearing:
 *
 *   1. STILL_HIDDEN. `visibilitychange` fires on BOTH edges. Handlers that
 *      only check "visible" are still invoked on the way out, and a handler
 *      that forgot the check would poll a backgrounded tab forever.
 *   2. IN_FLIGHT. Two overlapping rounds do not produce fresher data; they
 *      produce a race over which one writes last, plus double the requests.
 *   3. NEVER_FETCHED. A surface with no observation at all is always owed one,
 *      regardless of any interval.
 *   4. OVERDUE vs NOT_DUE against the poll interval. This is the whole point:
 *      the visibility handler tops up a schedule that may have been throttled,
 *      rather than bypassing the schedule entirely.
 *
 * A `lastRoundStartedAt` in the future is clock skew and reads as NOT_DUE —
 * the safe direction, since the alternative is a burst.
 */
export function selectVisibilityRefetch(
  input: VisibilityRefetchInput,
): VisibilityRefetchVerdict {
  const intervalMs = input.intervalMs ?? DEFAULT_REFETCH_INTERVAL_MS;

  if (input.visibilityState !== "visible") {
    return { kind: "SKIP", reason: "STILL_HIDDEN", dueInMs: 0 };
  }
  if (input.inFlight) {
    return { kind: "SKIP", reason: "IN_FLIGHT", dueInMs: 0 };
  }
  const last = input.lastRoundStartedAt;
  if (typeof last !== "number" || !Number.isFinite(last)) {
    return { kind: "REFETCH", reason: "NEVER_FETCHED", overdueByMs: 0 };
  }
  const sinceMs = input.now - last;
  if (sinceMs >= intervalMs) {
    return { kind: "REFETCH", reason: "OVERDUE", overdueByMs: sinceMs - intervalMs };
  }
  return { kind: "SKIP", reason: "NOT_DUE", dueInMs: Math.max(0, intervalMs - sinceMs) };
}
