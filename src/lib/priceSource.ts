/**
 * priceSource — honest provenance labelling for a displayed quote.
 *
 * WM-CHART-PROV-EMERG-01 (2026-08-06 Founder emergency): user-visible labels
 * MUST NOT name the underlying provider. Founder verbatim:
 *   "stop exposing where our api keys are from … it can say delayed
 *    but stop telling people where the apis come from"
 * Vendor identity is preserved in `provenance` for internal diagnostics, but
 * never rendered as normal trading chrome.
 *
 * Canon §Living Market Visual Systems (2026-08-27) — trader-facing
 * labels must come from the canon-approved seven-label set. Legacy
 * strings ("NO FEED", "DELAYED 15 MIN") are quarantined; this module
 * emits the canonical vocabulary for every consumer. Internal
 * comparisons use the `unresolved` flag, not the display string, so
 * a future label copy change cannot silently break the sentinel path.
 *
 * Public API: `priceSourceBadge(source, connected)` returns { label,
 * title, live, provenance, unresolved } — label is one of the canon
 * seven strings.
 */
import {
  CANONICAL_FIDELITY_LABELS,
  type CanonicalFidelityLabel,
} from "./marketData/canonicalFidelityLabels";
export type PriceSource =
  | "polygon" | "coinbase" | "binance" | "alpaca" | "finnhub" | "yahoo" | "unavailable" | string;

/**
 * Providers whose price is ONE VENUE's prints, not the consolidated tape.
 * Alpaca here is the IEX relay (see the `alpaca` arm of `priceSourceBadge`):
 * no SIP entitlement receipt exists in this tree. Read by `readCanvasHonesty`
 * so the plaque's DEGRADED carries the PARTIAL_TAPE reason rather than none.
 */
export const PARTIAL_TAPE_PROVENANCES: ReadonlySet<string> = new Set(["alpaca"]);

export interface PriceObservationEvidence {
  /** A real price was received for this selection, not merely a configured source. */
  present: boolean;
  /** Provider/event timestamp is within budget; omitted means not established. */
  fresh?: boolean;
  /**
   * How old the observed price is, measured from the PROVIDER's own timestamp
   * against the reader's clock. Omitted means NOT MEASURED — and an unmeasured
   * age is never rounded into "recent". Only `memberFeedWords` reads it, and
   * only to say in plain words how far behind a polled quote is; it never
   * changes the canonical verdict.
   */
  ageMs?: number;
}

/**
 * THE MEMBER'S WORDS FOR A DEGRADED READING (Founder, 2026-10-06 evening:
 * "the homie is signed in and all his charts say ACTIVE DEGRADED …
 * unacceptable").
 *
 * `ACTIVE DEGRADED` is the canon's ENGINE grade: "the session is active but at
 * least one capability is degraded". It is correct and it is useless to a
 * member — it does not say WHAT is degraded, and it reads as an alarm. A
 * signed-in member without the owner's broker sessions is served by public
 * sources: a polled REST quote for futures, FX, indices and (off-IEX) stocks;
 * one exchange's real-time prints (IEX) for stocks; Coinbase's public stream
 * for crypto. Every one of those has a plain name, and the chip now says it:
 *
 *   polled REST quote, measured ≤ 90s old   POLLED   · under 1 min old
 *   polled REST quote, measured older       DELAYED  · price 10 min old
 *   polled REST quote, age not measured     DELAYED  · polled quote
 *   IEX relay (one venue, real time)        IEX REAL-TIME · one exchange only
 *   owner broker lanes (uncertified)        BROKER QUOTE · not certified real-time
 *   streaming exchange, freshness unproven  SNAPSHOT · not confirmed live
 *
 * TRUTH IS UNCHANGED. The verdict (`label`), `live`, tone, health and every
 * comparison keep reading the canonical label; these words are presentation
 * only, and nothing here can reach LIVE — a polled quote is never called live.
 * The full engine grade stays in the tooltip and the aria-label.
 *
 * NO VENDOR NAMES (WM-CHART-PROV-EMERG-01, Founder 2026-08-06: "it can say
 * delayed but stop telling people where the apis come from"). IEX is the
 * EXCHANGE whose prints these are, not the API that carries them.
 */
export interface MemberFeedWords {
  /** Short plain verdict for the chip, e.g. "DELAYED". */
  readonly label: string;
  /** The second half — what that means, e.g. "price 10 min old". */
  readonly detail: string;
  /** One plain sentence for the tooltip. */
  readonly title: string;
}

/** A polled quote this young is "polled", not "delayed" — the same 90s budget the OS uses for a live print. */
export const POLLED_NEAR_LIVE_MS = 90_000;

function plainAge(ageMs: number): string {
  const seconds = Math.max(0, Math.floor(ageMs / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 120) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h`;
}

const OWNER_BROKER_SOURCES: ReadonlySet<string> = new Set(["moomoo", "longbridge", "webull"]);

export function memberFeedWords(
  source: PriceSource,
  label: CanonicalFidelityLabel,
  ageMs?: number,
): MemberFeedWords | undefined {
  if (label !== CANONICAL_FIDELITY_LABELS.ACTIVE_DEGRADED) return undefined;
  const age = typeof ageMs === "number" && Number.isFinite(ageMs) && ageMs >= 0 ? ageMs : undefined;
  if (REST_QUOTE_SOURCES.has(source)) {
    if (age !== undefined && age <= POLLED_NEAR_LIVE_MS) {
      return {
        label: "POLLED",
        detail: "under 1 min old",
        title: `Polled quote, refreshed every few seconds — not a streaming tape. The last price is ${plainAge(age)} old.`,
      };
    }
    if (age !== undefined) {
      return {
        label: "DELAYED",
        detail: `price ${plainAge(age)} old`,
        title: `Delayed quote — the last price is ${plainAge(age)} old. This market is polled from a free quote, not streamed in real time.`,
      };
    }
    return {
      label: "DELAYED",
      detail: "polled quote",
      title: "Polled quote, not a streaming tape, and its delay was not measured. Treat the price as behind the market.",
    };
  }
  if (PARTIAL_TAPE_PROVENANCES.has(source)) {
    return {
      label: "IEX REAL-TIME",
      detail: "one exchange only",
      title: "Real-time trades from one exchange (IEX), not the full market. Price and volume can differ from the consolidated tape, most in pre/post-market.",
    };
  }
  if (OWNER_BROKER_SOURCES.has(source)) {
    return {
      label: "BROKER QUOTE",
      detail: "not certified real-time",
      title: "Price from a connected broker. Its real-time certification is not established yet.",
    };
  }
  return {
    label: "SNAPSHOT",
    detail: "not confirmed live",
    title: "A price from a streaming-capable source, but this reading has not been confirmed fresh on the stream.",
  };
}

export interface PriceSourceBadge {
  /** Vendor-agnostic user-visible text. Canon §Living Market Visual
   *  Systems: one of the seven CANONICAL_FIDELITY_LABELS values. */
  label: CanonicalFidelityLabel;
  title: string;      // vendor-agnostic tooltip (freshness / caveat, not vendor)
  /** true only when the number is coming from a genuine real-time feed. */
  live: boolean;
  provenance: string; // INTERNAL only — never render in user chrome. Diagnostics inspector reads this.
  /** true when the price source is unresolved (no provider matched).
   *  Internal sentinel — replaces `label === "NO FEED"` filtering so
   *  callers stay decoupled from display copy. */
  unresolved: boolean;
  /**
   * No observation to grade. Availability is separate from the seven fidelity
   * labels.
   *
   * ── "unavailable" AND "awaiting" ARE NOT THE SAME FACT ─────────────────
   * `"unavailable"` means WE ASKED AND NOTHING CAME BACK. `"awaiting"` means
   * WE HAVE NOT FINISHED ASKING. Rendering the first sentence while the second
   * is true is the room accusing a healthy pipeline of being broken, and it is
   * the FIRST thing the trader reads on every single page load.
   *
   * Measured live on wealthymindsetspro.com/charts, NQ1!, 2026-09-17: for the
   * seconds between mount and the bars landing, one screen carried
   *
   *   masthead        FEED UNKNOWN
   *   chart header    No price — (change unavailable) · DATA UNAVAILABLE
   *   right rail      NQ1! · 1h · PRICE UNKNOWN
   *   footer          SOURCE UNKNOWN
   *
   * over a chart that then painted 400 candles and a +2.08% session. The API
   * was never unhealthy — `/api/yahoo?sym=NQ1!&type=quote` answered 200 with
   * `price: 29565.75` throughout. Four absence claims, all false, all about a
   * request that was still in flight.
   *
   * Canon has no eighth label for this and must not grow one: the vocabulary
   * is fixed without an amendment. Canon already answers the unknown case, in
   * `resolveCanonicalFidelityLabel`'s own words — "the surface renders no chip
   * at all (canon §silence-is-a-feature)". So `"awaiting"` renders NOTHING.
   * A room that has not finished asking says nothing, which is exactly what a
   * person who has not finished looking would do.
   */
  availability?: "unavailable" | "awaiting";
  /**
   * The member-facing words for this reading, when the canonical label is an
   * engine grade a member cannot act on (today: ACTIVE DEGRADED). Renderers
   * show these words and keep `label` in the tooltip/aria. See
   * {@link memberFeedWords}. Absent = render `label` as-is.
   */
  plain?: MemberFeedWords;
}

export interface CandleDataStatus {
  /**
   * LIVE      = realtime tape flowing, recent tick within staleAfterMs.
   * DELAYED   = we have candle data, but no realtime tape (delayed provider,
   *             or realtime source unresolved). Label may be "HISTORICAL" when
   *             the historical OHLCV fetch succeeded but no realtime feed
   *             is configured — SHIFT-H P1 fix (H-Bkt 1): the chart chrome
   *             must never say NO FEED while it is rendering real candles.
   * STALE     = realtime source is live but ticks have stopped flowing.
   * UNAVAILABLE = no candles at all — genuinely nothing on the chart.
   * AWAITING  = the bars request has not come back yet. NOT a finding, and
   *             specifically NOT UNAVAILABLE: see `PriceSourceBadge.availability`
   *             for the four false absence claims this state was split out to
   *             stop. Surfaces render NOTHING for AWAITING.
   */
  state: "LIVE" | "DELAYED" | "STALE" | "UNAVAILABLE" | "AWAITING";
  label: string;
  live: boolean;
}

/**
 * Continuous markets have no session to close. Honouring `sessionOpen: false`
 * for one of these would print SESSION CLOSED over a genuinely streaming
 * crypto tape — the mirror image of the defect this parameter exists to fix —
 * so the writer defends the invariant itself rather than trusting callers.
 *
 * EXPORTED because `compileFeedStanding` (src/lib/os/osChrome.ts) now applies
 * the same closed-session precedence, and "which markets never close" must not
 * become a fact with two owners. A second copy of this set would not fail
 * loudly — it would simply disagree with this one on the day a market is added.
 */
export const CONTINUOUS_MARKET_SOURCES: ReadonlySet<PriceSource> = new Set(["binance", "coinbase"]);

/**
 * Providers whose price arrives as a polled REST quote rather than a per-trade
 * tape. They publish on a minutes cadence BY DESIGN.
 *
 * This set exists because a tick-recency window is not a universal freshness
 * receipt. Measuring a REST-quote provider against a seconds-scale tape budget
 * and reporting `fresh: false` makes `priceSourceBadge` short-circuit to
 * STALE PIPELINE, slandering a provider that is behaving exactly as specified.
 * Canon: FIDELITY IS PER CAPABILITY, NOT A SYMBOL-WIDE INSULT — the absence of
 * a per-trade tape is a MISSING CAPABILITY, not a stalled pipeline.
 *
 * Callers that derive `fresh` from tape recency MUST pass `undefined` for
 * these sources ("not established", per `PriceObservationEvidence.fresh`) and
 * let the provider arm return the honest ACTIVE DEGRADED verdict.
 */
export const REST_QUOTE_SOURCES: ReadonlySet<PriceSource> = new Set([
  "yahoo", "finnhub",
]);

/**
 * @param sessionOpen Tri-state session truth. ONLY an explicit `false`
 *   changes the verdict; `undefined`/`null` mean "not established" and leave
 *   provider-derived labelling exactly as it was. An unknown session may
 *   never be rounded into a claim in either direction.
 */
export function priceSourceBadge(
  source: PriceSource,
  connected: boolean,
  sessionOpen?: boolean | null,
  observation?: PriceObservationEvidence,
): PriceSourceBadge {
  const badge = gradePriceSource(source, connected, sessionOpen, observation);
  const plain = memberFeedWords(source, badge.label, observation?.ageMs);
  return plain ? { ...badge, plain } : badge;
}

function gradePriceSource(
  source: PriceSource,
  connected: boolean,
  sessionOpen?: boolean | null,
  observation?: PriceObservationEvidence,
): PriceSourceBadge {
  const L = CANONICAL_FIDELITY_LABELS;
  // Session closure does not manufacture a last observation. Keep unknown
  // providers unresolved before applying the closed-market presentation rule.
  const unresolved = !["polygon", "coinbase", "binance", "alpaca", "finnhub", "yahoo", "moomoo", "longbridge", "webull", "tastytrade"].includes(source);
  if (unresolved || observation?.present !== true) {
    return {
      label: L.STALE_PIPELINE, // legacy internal fallback; availability governs rendering
      title: "No price observation received for this selection. Waiting for market data.",
      live: false, provenance: String(source ?? "unavailable"),
      unresolved, availability: "unavailable",
    };
  }
  // Canon "CLOSED IS NOT DELAYED" + §8 (the screen may never imply an active
  // session on a closed one). Closed dominates every provider verdict, exactly
  // as it does in resolveCanonicalFidelityLabel — where `sessionOpen === false`
  // is checked before entitlement, freshness and staleness. Without this the
  // yahoo/finnhub arms below assert ACTIVE DEGRADED every weekend.
  if (sessionOpen === false && !CONTINUOUS_MARKET_SOURCES.has(source)) {
    return {
      label: L.SESSION_CLOSED_LAST_VERIFIED,
      title: "Market session is closed. Showing the last verified values — nothing is streaming.",
      live: false,
      provenance: String(source ?? "unavailable"),
      unresolved: false,
    };
  }
  // Every recognized provider must honor an explicit freshness failure.
  // A fallback provider is not exempt from the observation's expiry budget.
  if (observation.fresh === false) {
    return {
      label: L.STALE_PIPELINE,
      title: "The received price is outside its freshness budget. Waiting for a current observation.",
      live: false, provenance: source, unresolved: false,
    };
  }
  // A transport flag or a provider name is not a freshness receipt.
  // Observed-but-ungraded prices remain usable without a LIVE certificate.
  if (["polygon", "coinbase", "binance", "alpaca", "tastytrade"].includes(source)
      && (!connected || observation?.fresh !== true)) {
    return {
      label: L.ACTIVE_DEGRADED,
      title: "Price observed. Realtime freshness is not verified for this selection.",
      live: false, provenance: source, unresolved: false,
    };
  }
  switch (source) {
    case "moomoo":
    case "longbridge":
    case "webull":
      // These are active WM providers, not unresolved names. Observing their
      // price does not by itself certify every upstream fidelity requirement.
      return {
        label: L.ACTIVE_DEGRADED,
        title: "Price observed. Realtime feed certification is not yet established.",
        live: false, provenance: source, unresolved: false,
      };
    case "polygon":
      return { label: L.LIVE_CERTIFIED_QUOTE, title: "Real-time trade stream", live: true, provenance: "polygon", unresolved: false };
    case "tastytrade":
      // dxFeed's /realtime stream via the owner's tastytrade account, and only
      // once the gate above has seen a connected, fresh print.
      return { label: L.LIVE_CERTIFIED_QUOTE, title: "Real-time consolidated stream", live: true, provenance: "tastytrade", unresolved: false };
    case "binance":
      return { label: L.LIVE_CERTIFIED_QUOTE, title: "Real-time crypto stream", live: true, provenance: "binance", unresolved: false };
    case "coinbase":
      return { label: L.LIVE_CERTIFIED_QUOTE, title: "Real-time crypto stream", live: true, provenance: "coinbase", unresolved: false };
    case "alpaca":
      // IEX IS ONE VENUE, NOT THE TAPE. Found 2026-09-26 at 3ff5cd7: this arm
      // printed LIVE — CERTIFIED QUOTE, which canonicalFidelityLabels defines
      // as "real-time consolidated tape … from a certified source", while the
      // capability registry grades this very path `alpaca-external-relay`
      // fidelityClass PROXY, availability PARTIAL ("IEX scope must be
      // verified"). IEX is one exchange among the US venues; its prints are
      // real and current, and they are not the market. So the strongest
      // honest word is ACTIVE DEGRADED, with the tooltip naming IEX, and
      // `live: false` — every reader of `live` treats it as the certificate
      // (green pill, "certified realtime" detail, the chart's LIVE — CERTIFIED
      // QUOTE pip). Freshness still decays: a quiet IEX tape is caught above by
      // `observation.fresh === false` → STALE PIPELINE, before this arm runs.
      // The upgrade path is a SIP entitlement receipt; none exists in this tree.
      // (The `!connected` case never reaches here: the arm above returns
      // ACTIVE DEGRADED for it.)
      return {
        label: L.ACTIVE_DEGRADED,
        title: "IEX only — one exchange's prints, not the consolidated tape. Real-time but partial; price and volume can differ from the full market, most in pre/post-market.",
        live: false,
        provenance: "alpaca",
        unresolved: false,
      };
    case "finnhub":
      // A delayed consolidated quote is flowing, but NOTHING here has proven a
      // paid-tier entitlement is the cause — the certified realtime source is
      // simply not resolved for this symbol. Monday Test 2 law: never assert
      // "DELAYED BY ENTITLEMENT" without a provider-proven entitlement edge.
      // The honest verdict is a degraded-but-usable capability.
      return { label: L.ACTIVE_DEGRADED, title: "Delayed consolidated quote — no certified realtime source resolved. Act with reduced confidence.", live: false, provenance: "finnhub", unresolved: false };
    case "yahoo":
      return { label: L.ACTIVE_DEGRADED, title: "Delayed consolidated quote — no certified realtime source resolved. Act with reduced confidence.", live: false, provenance: "yahoo", unresolved: false };
    default:
      // No provider matched — we cannot claim a certified quote and
      // we cannot claim a closed session either. Canon-honest: the
      // pipeline is stale, and the internal `unresolved` sentinel
      // lets downstream code treat this case surgically.
      return { label: L.STALE_PIPELINE, title: "No live price source resolved yet", live: false, provenance: String(source ?? "unavailable"), unresolved: true };
  }
}

/**
 * resolveChartSurfaceBadge — the H-Bkt 1 / H-Bkt 8 truth guard as a pure
 * helper so future chart-chrome pills can't recreate the "NO FEED beside
 * rendered candles" contradiction. Callers who know whether candles are
 * on-screen pass hasCandles=true; if the raw badge label is NO FEED but
 * candles exist, the label is promoted to HISTORICAL with an honest
 * tooltip. Everything else passes through unchanged.
 *
 * 2026-09-10 — THIRD NESTING of the same defect, measured live on
 * /charts?symbol=NQ1! in production: the header read
 * `NQ1! — DATA UNAVAILABLE` while three sessions of real candles rendered
 * directly beneath it, and the ticker tape one row above read
 * `ACTIVE DEGRADED 29,150 -299.00 (-1.02%)`. Three answers about one
 * instrument inside ~180px — canon Weakness #1 (multi-price disagreement
 * on one page) on the primary trading surface.
 *
 * The guard could not catch it because it only inspected `b.unresolved`.
 * When the QUOTE is refused but the provider NAME resolves (yahoo/finnhub),
 * priceSourceBadge returns `unresolved: false` with `availability:
 * "unavailable"` — a different door into the same room. `availability:
 * "unavailable"` renders the words "DATA UNAVAILABLE", which is a claim
 * about ALL data; the actual fact was "no certified QUOTE, bars verified".
 *
 * `quoteObservation` is OPTIONAL and LAST so every existing caller keeps
 * its exact behaviour (bar presence standing in for observation presence).
 * Callers that can distinguish a refused quote from a missing bar should
 * pass it, because only then can the two facts be told apart.
 *
 * `barsSettled` is OPTIONAL and LAST for the identical reason, and follows the
 * same tri-state discipline `sessionOpen` already uses in this file: ONLY an
 * explicit `false` changes a verdict. `undefined` is "nobody told me", and
 * nobody-told-me may never be rounded into a claim — that rounding is how
 * SESSION CLOSED nearly got printed over a live Tuesday, and it is how a room
 * that had not finished asking came to print DATA UNAVAILABLE four times.
 */
export function resolveChartSurfaceBadge(
  source: PriceSource,
  connected: boolean,
  hasCandles: boolean,
  sessionOpen?: boolean | null,
  quoteObservation?: PriceObservationEvidence,
  barsSettled?: boolean,
): PriceSourceBadge {
  const b = priceSourceBadge(
    source, connected, sessionOpen, quoteObservation ?? {present: hasCandles},
  );
  // BEFORE any grading: an unfinished question has no answer to grade. This
  // sits first because every branch below reads absence as a finding, and at
  // this moment absence is not a finding — it is a request in flight.
  if (barsSettled === false && !hasCandles) {
    return { ...b, availability: "awaiting", live: false };
  }
  // Canon §Living Market Visual Systems (2026-08-27): when we have
  // verified bars on screen but no live provider resolved, the honest
  // per-capability truth is HISTORICAL BARS VERIFIED — never STALE
  // PIPELINE (which implies active-session failure).
  //
  // `availability === "unavailable"` joins `unresolved` here for the reason
  // above: with bars on screen, neither state may print a total-absence
  // claim. Bars are the verified capability; the quote is the missing one.
  if ((b.unresolved || b.availability === "unavailable") && hasCandles) {
    return { ...b, availability: undefined, live: false, ...barsOnlyReading(sessionOpen) };
  }
  return b;
}

/**
 * THE BARS-ONLY READING — what the screen may say when OHLCV arrived and no
 * quote did. One owner, because it now has two readers at two different
 * altitudes and they were caught disagreeing.
 *
 * ── FOURTH NESTING, MEASURED LIVE 2026-09-17 ON wealthymindsetspro.com ─────
 * On /charts, TSLA, one screen carried FOUR answers to one question:
 *
 *   · the chart chip          HISTORICAL BARS VERIFIED   ← this rule, applied
 *   · the OS masthead         FEED UNKNOWN
 *   · the provenance footer   SOURCE UNKNOWN
 *   · the right rail          UNAVAILABLE
 *
 * …above 400 rendered candles. Three of those four say "we observed nothing",
 * and `compileFeedStanding`'s own words for it were "no observation yet" —
 * which is simply false. Bars WERE observed; one badge on the same screen
 * certifies them.
 *
 * The frame was not grading badly. It could not grade at all: its
 * `FeedObservation` carried quote evidence only, so bar presence was not in
 * the argument list. That is the identical diagnosis this file's own
 * `compileFeedStanding` docblock already records for the previous nesting —
 * "The contradiction was not avoidable by grading more carefully. It was in
 * the argument list." The defect came back because the LESSON was extracted
 * and the RULE was not.
 *
 * So the rule lives here, exported, and the frame READS it rather than
 * restating it. A fifth nesting now requires someone to write a third copy of
 * these two labels on purpose.
 */
export function barsOnlyReading(
  sessionOpen?: boolean | null,
): { readonly label: CanonicalFidelityLabel; readonly title: string } {
  // Only an explicit `false` may claim closure — an unresolved calendar is not
  // evidence of a closed market, and rounding it down would print SESSION
  // CLOSED over a live Tuesday.
  return sessionOpen === false
    ? {
        label: CANONICAL_FIDELITY_LABELS.SESSION_CLOSED_LAST_VERIFIED,
        title: "Market session is closed. Historical bars are loaded; no realtime tape is implied.",
      }
    : {
        label: CANONICAL_FIDELITY_LABELS.HISTORICAL_BARS_VERIFIED,
        title: "Historical OHLCV loaded. No realtime tape resolved yet — chart trustworthy for past-tense analysis only.",
      };
}

/**
 * A recent UI update cannot promote a delayed provider into LIVE market data.
 *
 * `sessionOpen` is the same tri-state closure signal the badges take, and it
 * is LAST in the parameter list on purpose: every existing caller and test
 * keeps working untouched, and omitting it is indistinguishable from the
 * pre-closure behaviour. Only an explicit `false` can change a verdict.
 */
export function candleDataStatus(
  source: PriceSource,
  connected: boolean,
  hasCandles: boolean,
  lastTickAt: number,
  now = Date.now(),
  staleAfterMs = 20_000,
  sessionOpen?: boolean | null,
  barsSettled?: boolean,
): CandleDataStatus {
  // Threaded, not re-implemented: closure precedence and the crypto
  // carve-out live in priceSourceBadge, so this chip can never disagree
  // with the rail above it. A proven-closed session yields
  // SESSION CLOSED — LAST VERIFIED with live=false and unresolved=false,
  // which falls through to the `!badge.live` branch below and prints
  // "SESSION CLOSED — LAST VERIFIED · LAST <time>" instead of the
  // canon-§8-banned "ACTIVE DEGRADED" on a closed session.
  const fresh = Number.isFinite(lastTickAt) && lastTickAt > 0
    && lastTickAt <= now && now - lastTickAt < staleAfterMs;
  const badge = priceSourceBadge(source, connected, sessionOpen, {present: hasCandles, fresh});
  const L = CANONICAL_FIDELITY_LABELS;
  // Neither a calendar nor provider configuration proves a last bar exists.
  // Nor does an unanswered request prove one does NOT: `!hasCandles` is two
  // different facts wearing one boolean, and only the caller knows which it
  // is holding. Explicit `false` — and nothing else — separates them.
  if (!hasCandles) {
    return barsSettled === false
      ? { state: "AWAITING", label: "", live: false }
      : { state: "UNAVAILABLE", label: "DATA UNAVAILABLE", live: false };
  }
  // Candles exist but no realtime feed is resolved — bars are the
  // verified capability.
  if (badge.unresolved) {
    return { state: "DELAYED", label: sessionOpen === false
      ? L.SESSION_CLOSED_LAST_VERIFIED : L.HISTORICAL_BARS_VERIFIED, live: false };
  }
  if (badge.label === L.STALE_PIPELINE) return {state: "STALE", label: badge.label, live: false};
  if (!badge.live) {
    return { state: "DELAYED", label: badge.label, live: false };
  }
  if (!Number.isFinite(lastTickAt) || lastTickAt <= 0 || now - lastTickAt >= staleAfterMs) {
    return { state: "STALE", label: L.STALE_PIPELINE, live: false };
  }
  return { state: "LIVE", label: L.LIVE_CERTIFIED_QUOTE, live: true };
}
