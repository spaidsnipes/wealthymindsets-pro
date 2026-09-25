export type ObservedProviderSource = "moomoo" | "longbridge" | "webull";

export interface ObservedProviderAttempt<T> {
  source: ObservedProviderSource;
  read: () => Promise<readonly T[]>;
}

export interface ObservedProviderSelection<T> {
  source: ObservedProviderSource;
  events: readonly T[];
}

export interface ObservedProviderFallbackOptions {
  /**
   * How long a lane that has not ANSWERED may keep the next lane waiting.
   *
   * Garden 11: "Do not freeze supported paint waiting on Moomoo. Moomoo =
   * reconnecting / NON-BLOCKING." The walk below is sequential, and an
   * unreachable OpenD bridge answers only when its 5 s client timeout fires
   * (then Longbridge's 5 s, too). Webull's prints were therefore painted up to
   * ten seconds late on every round, purely because a lane that was not
   * answering was ahead of it in the queue.
   *
   * With a hedge, the priority order is kept for every lane that answers in
   * time. A lane that stays silent past `hedgeMs` no longer blocks: the next
   * lane starts alongside it, and the first lane to answer WITH events wins
   * the round. An empty or failed answer starts the next lane at once, just as
   * the sequential walk does. No lane is asked sooner than it is today when
   * the lanes ahead of it are healthy, so a healthy primary costs the
   * fallbacks nothing.
   *
   * Absent → the strict sequential walk, unchanged.
   */
  readonly hedgeMs?: number;
  /** Injected for tests; defaults to setTimeout. */
  readonly delay?: (ms: number) => Promise<void>;
}

/**
 * The /charts hedge. Long enough that a healthy bridge (a few hundred ms
 * through the Worker) always answers inside it, so priority is unchanged in
 * the healthy case; short against the 5 s bridge timeouts it exists to beat.
 */
export const OBSERVED_LANE_HEDGE_MS = 1_500;

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

/**
 * Tries observed-provider lanes in deterministic priority order.
 *
 * A transport or parse failure belongs to that provider only. It must not
 * prevent a healthy later lane from being observed. Cancellation is different:
 * it ends the whole poll so a disposed chart cannot continue making requests.
 */
export async function selectObservedProviderFallback<T>(
  attempts: readonly ObservedProviderAttempt<T>[],
  options: ObservedProviderFallbackOptions = {},
): Promise<ObservedProviderSelection<T> | null> {
  if (options.hedgeMs === undefined) {
    for (const attempt of attempts) {
      try {
        const events = await attempt.read();
        if (events.length > 0) return { source: attempt.source, events };
      } catch (error) {
        if (isAbortError(error)) throw error;
        // Failure is isolated to this provider. Continue to the next lane.
      }
    }
    return null;
  }

  const hedgeMs = Math.max(0, options.hedgeMs);
  const delay = options.delay ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  type Outcome = { readonly index: number; readonly events: readonly T[] | null };
  const HEDGE = Symbol("hedge");

  const outcomes = new Map<number, Promise<Outcome>>();
  let next = 0;
  const launch = () => {
    const index = next++;
    const outcome = attempts[index].read().then(
      (events): Outcome => ({ index, events: events.length > 0 ? events : null }),
      (error): Outcome => {
        if (isAbortError(error)) throw error;
        // Failure is isolated to this provider, exactly as in the walk above.
        return { index, events: null };
      },
    );
    // A lane still in flight when the round is decided (or aborted) must not
    // surface as an unhandled rejection; its answer simply belongs to no one.
    outcome.catch(() => {});
    outcomes.set(index, outcome);
  };

  if (attempts.length === 0) return null;
  launch();
  while (outcomes.size > 0) {
    const contenders: Promise<Outcome | typeof HEDGE>[] = [...outcomes.values()];
    // Only a lane that has not been started yet can be hedged INTO.
    if (next < attempts.length) contenders.push(delay(hedgeMs).then(() => HEDGE));
    const settled = await Promise.race(contenders);
    if (settled === HEDGE) {
      launch();
      continue;
    }
    outcomes.delete(settled.index);
    if (settled.events) return { source: attempts[settled.index].source, events: settled.events };
    // An empty or failed answer frees the next lane at once.
    if (next < attempts.length) launch();
  }
  return null;
}
