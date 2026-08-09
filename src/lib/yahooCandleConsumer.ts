export const YAHOO_CANDLE_ENVELOPE_HEADER = "X-WM-Candle-Envelope-Version";
export const YAHOO_CANDLE_CAPABILITIES_URL = "/api/timeframes/capabilities";

export type YahooCandleMode = "legacy-compatible" | "typed-required";

export interface YahooCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type YahooCandleOutcome =
  | { status: "ready"; candles: YahooCandle[]; empty: boolean }
  | { status: "unavailable" | "error" | "malformed"; candles: []; message: string; retryable: boolean; retryAfterMs?: number };

interface YahooCandleRequest {
  symbol: string;
  timeframe: string;
  bars: number;
  extendedHours?: boolean;
  signal?: AbortSignal;
  automaticRetry?: boolean;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const DEFAULT_MESSAGE = "Market data is unavailable right now.";
const MALFORMED_MESSAGE = "Market data returned an invalid response.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizedMessage(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return fallback;
  return compact.slice(0, 180);
}

function validCandle(value: unknown): value is YahooCandle {
  if (!isRecord(value)) return false;
  const values = [value.time, value.open, value.high, value.low, value.close, value.volume];
  if (!values.every((candidate): candidate is number => typeof candidate === "number" && Number.isFinite(candidate))) return false;
  const [time, open, high, low, close, volume] = values;
  return time > 0 && open >= 0 && high >= Math.max(open, close) && low <= Math.min(open, close) && low >= 0 && volume >= 0;
}

function candlesFrom(value: unknown): YahooCandle[] | null {
  if (!Array.isArray(value) || !value.every(validCandle)) return null;
  return value;
}

function malformed(): YahooCandleOutcome {
  return { status: "malformed", candles: [], message: MALFORMED_MESSAGE, retryable: false };
}

/**
 * Which envelope shape the payload actually is, decided by inspecting the payload
 * itself — never by transport metadata.
 *
 * ROLLBACK-SAFETY CONTRACT. The previous order enforced the version-header
 * requirement *before* looking at the body, so a server rollback to the
 * pre-envelope release (legacy body, no header) was indistinguishable from a
 * corrupt typed response: a latched client rejected every payload permanently and
 * the chart went dark with no recovery path.
 *
 * Classifying candidate-first separates the two questions:
 *   1. what IS this payload?      (body only)
 *   2. is that acceptable now?    (mode + header policy)
 * Only step 2 may reject, and because step 1 already identified a *valid legacy*
 * body, the consumer can recognise a rollback and unlatch instead of failing shut.
 */
export type YahooCandleShape = "typed-ok" | "typed-error" | "legacy" | "unrecognized";

export function classifyYahooCandlePayload(payload: unknown, requestedTf: string): YahooCandleShape {
  if (!isRecord(payload)) return "unrecognized";
  if (payload.ok === true || payload.ok === false) {
    return payload.ok === true ? "typed-ok" : "typed-error";
  }
  // No `ok` discriminator: legacy only if the body is genuinely well-formed.
  // A malformed body must NOT be reported as a rollback signal.
  const candles = candlesFrom(payload.candles);
  if (!candles) return "unrecognized";
  if (payload.tf !== undefined && payload.tf !== requestedTf) return "unrecognized";
  return "legacy";
}

export function parseYahooCandlePayload(
  payload: unknown,
  requestedTf: string,
  mode: YahooCandleMode,
  options: { requireVersionHeader?: boolean } = {},
): YahooCandleOutcome {
  if (!isRecord(payload)) return malformed();

  // Candidate-first: identify the shape from the body before applying policy.
  const shape = classifyYahooCandlePayload(payload, requestedTf);

  // A latched client rejects EVERY unversioned response, including a well-formed
  // legacy one. That invariant is deliberate (see the "never downgrades" test): a
  // single stray legacy body must never be honoured as data, or a flaky edge node
  // could silently downgrade the client.
  //
  // Recovery is handled one level up, not here. The consumer counts consecutive
  // confirmed-legacy sightings and unlatches the *mode* after N of them, so a real
  // server rollback recovers on the following request while no individual payload
  // is ever silently accepted. Rejecting here and recovering there is what keeps
  // both contracts intact.
  // Default-strict: an omitted `requireVersionHeader` means "not proven present",
  // so a latched parser rejects. Only an explicit `false` (the caller saw a valid
  // v1 header) opens the gate. Defaulting open here would make every direct caller
  // and every future test silently bypass the latch.
  if (mode === "typed-required" && options.requireVersionHeader !== false) {
    return malformed();
  }

  if (payload.ok === true) {
    if (
      payload.status !== "ready"
      || payload.requestedTf !== requestedTf
      || payload.returnedTf !== requestedTf
      || typeof payload.sourceMode !== "string"
      || typeof payload.provider !== "string"
      || typeof payload.assetClass !== "string"
      || typeof payload.entitlement !== "string"
      || typeof payload.registryVersion !== "string"
    ) return malformed();
    const candles = candlesFrom(payload.candles);
    return candles ? { status: "ready", candles, empty: candles.length === 0 } : malformed();
  }

  if (payload.ok === false) {
    if (
      (payload.status !== "unavailable" && payload.status !== "error")
      || (payload.requestedTf !== requestedTf && payload.requestedTf !== null)
      || (typeof payload.provider !== "string" && payload.provider !== null)
      || (typeof payload.assetClass !== "string" && payload.assetClass !== null)
      || (typeof payload.entitlement !== "string" && payload.entitlement !== null)
      || typeof payload.reasonCode !== "string"
      || typeof payload.retryable !== "boolean"
      || typeof payload.message !== "string"
      || (payload.retryAfterMs !== undefined && (typeof payload.retryAfterMs !== "number" || !Number.isFinite(payload.retryAfterMs) || payload.retryAfterMs < 0))
    ) return malformed();
    if (payload.status === "unavailable" && payload.retryable) return malformed();
    return {
      status: payload.status,
      candles: [],
      message: sanitizedMessage(payload.message, DEFAULT_MESSAGE),
      retryable: payload.retryable,
      ...(typeof payload.retryAfterMs === "number" ? { retryAfterMs: payload.retryAfterMs } : {}),
    };
  }

  // Legacy body. Accepted in legacy-compatible mode, and ALSO accepted while
  // latched typed-required — that combination is precisely a server rollback, and
  // failing shut here is what took the chart dark. The consumer counts these and
  // unlatches once the rollback is confirmed; see observeRollbackCandidate().
  if (shape !== "legacy") return malformed();
  // A legacy body is never valid data while latched — even when a valid v1 header
  // was present. That combination is a protocol violation (server promised typed,
  // sent legacy), not a rollback. Rollback is the *unversioned* case, and it is
  // handled by the consumer's mode transition, never by relaxing the parser.
  if (mode === "typed-required") return malformed();
  const candles = candlesFrom(payload.candles)!;
  return { status: "ready", candles, empty: candles.length === 0 };
}

function capabilityVersion(payload: unknown): unknown {
  if (!isRecord(payload)) return undefined;
  return payload.candleEnvelopeVersion
    ?? payload.yahooCandleEnvelopeVersion
    ?? (isRecord(payload.yahoo) ? payload.yahoo.candleEnvelopeVersion : undefined);
}

export class YahooCandleConsumer {
  private mode: YahooCandleMode;
  private initialized = false;
  private initializing: Promise<YahooCandleMode> | null = null;
  private readonly inFlight = new Map<string, Promise<YahooCandleOutcome>>();
  private readonly fetcher: FetchLike;

  constructor(options: { mode?: YahooCandleMode; fetcher?: FetchLike } = {}) {
    this.mode = options.mode ?? "legacy-compatible";
    this.fetcher = options.fetcher ?? fetch;
  }

  getMode(): YahooCandleMode {
    return this.mode;
  }

  requireTyped(): void {
    this.mode = "typed-required";
    this.rollbackCandidates = 0;
  }

  /**
   * ROLLBACK-SAFETY CONTRACT.
   *
   * Latching to typed-required is one-way *by design* — a single well-formed
   * typed response must not be undone by one stray legacy body, or an attacker or
   * a flaky edge node could downgrade the client at will.
   *
   * But a genuine server rollback also produces legacy bodies, forever. Without a
   * release valve the latch is permanent and the surface stays dark until someone
   * clears browser state. So: unlatch only after CONSECUTIVE confirmations, and
   * only when each observation is a *valid* legacy envelope with no version
   * header. Any typed response in between resets the counter.
   */
  private rollbackCandidates = 0;
  static readonly ROLLBACK_CONFIRMATIONS = 2;

  private observeRollbackCandidate(sawVersionHeader: boolean, shape: YahooCandleShape): void {
    if (this.mode !== "typed-required") return;
    if (sawVersionHeader || shape !== "legacy") {
      this.rollbackCandidates = 0;
      return;
    }
    this.rollbackCandidates += 1;
    if (this.rollbackCandidates >= YahooCandleConsumer.ROLLBACK_CONFIRMATIONS) {
      this.mode = "legacy-compatible";
      this.rollbackCandidates = 0;
      // Re-arm discovery so the next deploy can latch forward again.
      this.initialized = false;
    }
  }

  /** Test/diagnostic seam — how close the consumer is to declaring a rollback. */
  getRollbackCandidateCount(): number {
    return this.rollbackCandidates;
  }

  async initialize(signal?: AbortSignal): Promise<YahooCandleMode> {
    if (this.initialized) {
      return this.mode;
    }
    if (this.initializing) return this.initializing;
    if (this.mode === "typed-required") {
      this.initialized = true;
      return this.mode;
    }
    this.initializing = (async () => {
      try {
        const response = await this.fetcher(YAHOO_CANDLE_CAPABILITIES_URL, { cache: "no-store", signal });
        if (response.ok && capabilityVersion(await response.json()) === 1) this.requireTyped();
      } catch {
        // The pre-envelope release has no capabilities route. Stay explicitly legacy-compatible.
      } finally {
        this.initialized = true;
        this.initializing = null;
      }
      return this.mode;
    })();
    return this.initializing;
  }

  request(request: YahooCandleRequest): Promise<YahooCandleOutcome> {
    const key = [
      request.symbol, request.timeframe, request.bars,
      request.extendedHours ? "ext" : "regular",
      request.automaticRetry === false ? "single" : "bounded-retry",
    ].join(":");
    const existing = this.inFlight.get(key);
    if (existing) return existing;
    const pending = this.executeRequest(request).finally(() => {
      if (this.inFlight.get(key) === pending) this.inFlight.delete(key);
    });
    this.inFlight.set(key, pending);
    return pending;
  }

  private async executeRequest(request: YahooCandleRequest): Promise<YahooCandleOutcome> {
    await this.initialize(request.signal);
    const params = new URLSearchParams({
      sym: request.symbol,
      type: "candles",
      tf: request.timeframe,
      bars: String(request.bars),
    });
    if (request.extendedHours) params.set("ext", "1");

    const attempts = request.automaticRetry === false ? 1 : 2;
    let outcome: YahooCandleOutcome = { status: "error", candles: [], message: DEFAULT_MESSAGE, retryable: true };
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const response = await this.fetcher(`/api/yahoo?${params}`, { cache: "no-store", signal: request.signal });
        const version = response.headers.get(YAHOO_CANDLE_ENVELOPE_HEADER);
        if (version === "1") this.requireTyped();
        const payload = await response.json();
        const shape = classifyYahooCandlePayload(payload, request.timeframe);

        // Parse under the mode in force WHEN THE REQUEST WAS MADE. Observing first
        // would let the unlatch take effect on the very response that triggered it,
        // silently honouring the payload that was supposed to be rejected.
        const modeAtParse = this.mode;
        outcome = parseYahooCandlePayload(payload, request.timeframe, modeAtParse, {
          requireVersionHeader: modeAtParse === "typed-required" && version !== "1",
        });

        // Recovery is decided only after the current response has been judged.
        this.observeRollbackCandidate(version === "1", shape);
      } catch (error) {
        if (request.signal?.aborted) throw error;
        outcome = { status: "error", candles: [], message: DEFAULT_MESSAGE, retryable: true };
      }
      if (outcome.status !== "error" || !outcome.retryable || attempt + 1 >= attempts) return outcome;
    }
    return outcome;
  }
}
