export type ObservedProviderSource = "moomoo" | "longbridge" | "webull";

export interface ObservedProviderAttempt<T> {
  source: ObservedProviderSource;
  read: () => Promise<readonly T[]>;
}

export interface ObservedProviderSelection<T> {
  source: ObservedProviderSource;
  events: readonly T[];
}

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
): Promise<ObservedProviderSelection<T> | null> {
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
