export type ProviderHealth = "HEALTHY" | "STALE_CACHE" | "RATE_LIMITED";

export interface GovernedResult<T> {
  data: T;
  health: ProviderHealth;
  cache: "HIT" | "MISS" | "COALESCED" | "STALE";
  retryAfterMs: number | null;
}

export class ProviderHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfterMs: number | null,
    message = `Provider HTTP ${status}`,
  ) {
    super(message);
    this.name = "ProviderHttpError";
  }
}

interface CacheEntry<T> {
  data?: T;
  storedAt: number;
  inFlight?: Promise<GovernedResult<T>>;
  consecutiveRateLimits: number;
  circuitUntil: number;
}

export interface GovernedRequest<T> {
  key: string;
  ttlMs: number;
  maxStaleMs: number;
  fetcher: () => Promise<T>;
}

/**
 * Per-runtime request coalescing and rate-limit circuit breaker.
 *
 * The semantic `key` must be stable. Provider URLs often contain moving time
 * windows, so URL-keyed caches silently miss every request and create storms.
 */
export class ProviderRequestGovernor {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private providerCircuitUntil = 0;
  private providerConsecutiveRateLimits = 0;
  private activeUpstreamRequests = 0;

  constructor(
    private readonly now: () => number = Date.now,
    private readonly random: () => number = Math.random,
    private readonly maxEntries = 500,
    private readonly maxConcurrentUpstream = 8,
  ) {}

  async execute<T>({ key, ttlMs, maxStaleMs, fetcher }: GovernedRequest<T>): Promise<GovernedResult<T>> {
    const now = this.now();
    const existing = this.entries.get(key);
    if (!existing && this.entries.size >= this.maxEntries) {
      for (const [oldestKey, value] of this.entries) {
        if (!value.inFlight) {
          this.entries.delete(oldestKey);
          break;
        }
      }
    }
    const entry = (existing ?? {
      storedAt: 0,
      consecutiveRateLimits: 0,
      circuitUntil: 0,
    }) as CacheEntry<T>;
    this.entries.set(key, entry as CacheEntry<unknown>);

    if (entry.data !== undefined && now - entry.storedAt < ttlMs) {
      return { data: entry.data, health: "HEALTHY", cache: "HIT", retryAfterMs: null };
    }

    const circuitUntil = Math.max(entry.circuitUntil, this.providerCircuitUntil);
    if (circuitUntil > now) {
      if (entry.data !== undefined && now - entry.storedAt <= maxStaleMs) {
        return {
          data: entry.data,
          health: "STALE_CACHE",
          cache: "STALE",
          retryAfterMs: circuitUntil - now,
        };
      }
      throw new ProviderHttpError(429, circuitUntil - now, "Provider circuit open after rate limit");
    }

    if (entry.inFlight) {
      const result = await entry.inFlight;
      return { ...result, cache: "COALESCED" };
    }

    if (this.activeUpstreamRequests >= this.maxConcurrentUpstream) {
      throw new ProviderHttpError(429, 1_000, "Provider request budget is temporarily saturated");
    }

    const request = (async (): Promise<GovernedResult<T>> => {
      this.activeUpstreamRequests += 1;
      try {
        const data = await fetcher();
        entry.data = data;
        entry.storedAt = this.now();
        entry.consecutiveRateLimits = 0;
        entry.circuitUntil = 0;
        // A request already in flight may finish after another request opened
        // the provider-wide circuit. Never let that late success reopen Alpaca.
        if (this.now() >= this.providerCircuitUntil) {
          this.providerConsecutiveRateLimits = 0;
          this.providerCircuitUntil = 0;
        }
        return { data, health: "HEALTHY", cache: "MISS", retryAfterMs: null };
      } catch (error) {
        if (error instanceof ProviderHttpError && error.status === 429) {
          entry.consecutiveRateLimits += 1;
          this.providerConsecutiveRateLimits += 1;
          const exponentialMs = Math.min(60_000, 1_000 * 2 ** (this.providerConsecutiveRateLimits - 1));
          const jitterMs = Math.floor(this.random() * 500);
          const backoffMs = Math.max(error.retryAfterMs ?? 0, exponentialMs + jitterMs);
          const nextCircuitUntil = this.now() + backoffMs;
          entry.circuitUntil = nextCircuitUntil;
          this.providerCircuitUntil = Math.max(this.providerCircuitUntil, nextCircuitUntil);

          if (entry.data !== undefined && this.now() - entry.storedAt <= maxStaleMs) {
            return {
              data: entry.data,
              health: "STALE_CACHE",
              cache: "STALE",
              retryAfterMs: backoffMs,
            };
          }
        }
        throw error;
      } finally {
        this.activeUpstreamRequests = Math.max(0, this.activeUpstreamRequests - 1);
        entry.inFlight = undefined;
      }
    })();

    entry.inFlight = request;
    return request;
  }
}

export function parseRetryAfterMs(value: string | null, now = Date.now()): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1_000);
  const dateMs = Date.parse(value);
  return Number.isFinite(dateMs) ? Math.max(0, dateMs - now) : null;
}
