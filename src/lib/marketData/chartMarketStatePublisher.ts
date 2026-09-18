import { useEffect, useState } from "react";
import type { MarketState, Tick } from "../../hooks/useWebSocket";
import { priceSourceBadge, REST_QUOTE_SOURCES } from "../priceSource";
import { publishCanonicalMarketState } from "./publishCanonicalMarketState";
import {
  getSessionNectarSnapshot,
  type SessionNectarSnapshot,
} from "./sessionNectar";
import type { ProduceMarketStateInput } from "./produceCanonicalMarketState";
import type {
  MarketQualityState,
  MarketStateDimension,
  MarketStateDimensionKey,
} from "./canonicalMarketState";
// Value import: one owner for the dimension's name. See `unresolvedDimensions`.
import { dimensionName } from "./canonicalMarketState";
import {
  canonicalAssetClass,
  canonicalInstrumentId,
  canonicalSession,
  type CanonicalAssetClass,
} from "./canonicalIdentity";
import { deriveOrderFlowDimension } from "./deriveOrderFlowDimension";
import { deriveVolatilityDimension } from "./deriveVolatilityDimension";
import { deriveDirectionDimension, countTradeTicks } from "./deriveDirectionDimension";
import { deriveRegimeDimension } from "./deriveRegimeDimension";
import { deriveProfileDimension } from "./deriveProfileDimension";
import { deriveLocationDimension } from "./deriveLocationDimension";
import { deriveAggressionDimension } from "./deriveAggressionDimension";
import { selectAggressionResponse } from "./viewModels/selectAggressionResponse";
import { deriveStructureDimension } from "./deriveStructureDimension";
import { selectMarketStructure, type StructureBar } from "./viewModels/selectMarketStructure";
import {
  buildLivingProfileSnapshot,
  selectLivingProfile,
} from "./viewModels/selectLivingProfile";
import type { ProfileBar } from "@/lib/vpEngine";
import {
  deriveLastBarClose,
  lastBarCloseRecheckAtMs,
  type BarCloseCandidate,
} from "./deriveLastBarClose";

export interface ChartMarketStatePublicationInput {
  readonly symbol: string;
  readonly timeframe: string;
  readonly session: string;
  readonly ticker: MarketState["ticker"];
  readonly recentTicks: readonly Tick[];
  readonly source: MarketState["source"];
  readonly connected: boolean;
  readonly capturedAt: number;
  readonly nectar: SessionNectarSnapshot;
  /**
   * The candle array the surface actually loaded. This is the ONLY admissible
   * source for a bar close — `ticker.price` can be a REST quote or a
   * SYMBOL_SEEDS fallback.
   *
   * ── AN EXEMPTION THAT OUTLIVED ITS PREMISE ──────────────────────────────
   * This field used to be documented "Optional so /command-deck (which owns
   * no bars) is untouched." That was true when written. It stopped being true
   * on 2026-09-11, when Ticket T put `DeckMarketChart` into the deck's MARKET
   * section — 120 real candles fetched from /api/yahoo. The comment was never
   * revisited, so the deck kept calling this hook without `bars` and the
   * candles it was already rendering never reached canonical state.
   *
   * Measured live on production /command-deck 2026-09-16, TSLA: the chart drew
   * 120 candles with a last close of 356.58 under the words "Read just now",
   * while HeroTruth eleven pixels above printed `?` for price. Both owners
   * were internally honest; the room was not. Same class as the /charts defect
   * documented on `usePublishChartMarketState` below — a real input that never
   * arrives is indistinguishable from absent evidence at the far end.
   *
   * Still optional, because a surface that genuinely holds no candles must be
   * able to publish without inventing any. Optional is a legitimate state; an
   * un-revisited comment is what made it a silent one.
   */
  /**
   * `BarCloseCandidate` is deliberately the MINIMUM a bar must carry to own a
   * close. The OHLCV fields are intersected in as OPTIONAL because a second
   * reader — the value-area derivation below — needs high/low/volume, and a
   * surface that holds only closes must still be able to publish. Widening
   * rather than forking keeps ONE bars input: two fields would let a room feed
   * the close-owner and the profile-owner different candles.
   */
  readonly bars?: readonly (BarCloseCandidate & Partial<ProfileBar>)[] | null;
  /**
   * THE VENUE THE **CANDLES** CAME FROM — which is not always the venue the
   * TICKS came from.
   *
   * `source` above names the live tape feed. Until this field existed it was
   * also stamped onto every dimension's evidence ref, including the two that
   * are derived from CANDLES ALONE and never touch a tick. On a surface where
   * the two feeds differ, that made the evidence receipt name the wrong venue.
   *
   * FOUND FROM USE, production BTC 15m, 2026-09-18. `/charts` read
   * `STRUCTURE / RESOLVED / HIGHER HIGHS` while `/command-deck`, same symbol,
   * same timeframe, same instant, read `structure ?`. Neither surface was
   * internally wrong: `/charts` compiles the swing sequence from
   * `/api/exchange` candles (MainChart.tsx, Coinbase for a crypto symbol) and
   * the deck compiles it from `/api/yahoo` candles (DeckMarketChart.tsx). Two
   * venues, one instrument, one instant, two answers — canon Weakness #1,
   * arriving through DATA PROVENANCE rather than through a wrong computation.
   *
   * The disagreement itself is legitimate and is NOT what this field fixes:
   * two venues genuinely print different candles, and forcing them equal here
   * would be inventing agreement. What was NOT legitimate is that the deck's
   * structure evidence claimed `coinbase` as its source while the numbers came
   * from Yahoo. A reader comparing the two receipts could not even SEE why
   * they differed, because both receipts named the same venue.
   *
   * Optional, and falls back to `source` when absent — which is exactly the
   * pre-existing claim, so a caller that has not been taught the distinction
   * is left no worse than it was rather than silently relabelled.
   */
  readonly barSource?: string | null;
}

// Asset class + instrument id + session all delegate to the single canonical
// helper module so producer/consumer identities cannot drift (b46fa64 class of
// P0). If you find yourself reaching for a local inference here, extend
// canonicalIdentity.ts and add a contract test instead.
/**
 * Keep ONLY the bars that carry a whole candle.
 *
 * A bar missing high/low/volume cannot contribute to a distribution, and
 * substituting a close for a missing high would invent a range the venue never
 * printed. So such bars are dropped rather than patched — if that leaves too
 * few, the profile compiler says it has no measurement, which is the honest
 * end state.
 */
function profileBarsFrom(
  bars: ChartMarketStatePublicationInput["bars"],
): ProfileBar[] {
  const out: ProfileBar[] = [];
  for (const bar of bars ?? []) {
    if (!bar) continue;
    const { time, open, high, low, close, volume } = bar;
    if (
      typeof time !== "number" || !Number.isFinite(time) ||
      typeof open !== "number" || !Number.isFinite(open) ||
      typeof high !== "number" || !Number.isFinite(high) ||
      typeof low !== "number" || !Number.isFinite(low) ||
      typeof close !== "number" || !Number.isFinite(close) ||
      typeof volume !== "number" || !Number.isFinite(volume)
    ) continue;
    out.push({ time, open, high, low, close, volume });
  }
  return out;
}

/**
 * Keep the bars a SWING SEQUENCE can be read from — which is not the same set.
 *
 * FOUND FROM USE, production /command-deck BTC, 2026-09-18. The deck's market
 * field disclosed "120 bars · Read just now"; the Market Object Passport below
 * it read `4/8 dimensions resolved` with the unresolved four being location,
 * aggression, structure and profile — EXACTLY the four candle-derived ones.
 *
 * Every one of them was reading `profileBarsFrom`, and `DeckMarketChart`
 * forwards no `volume` on purpose (see its `Candle` doc block: Yahoo's volume
 * is not trusted there, and `volume: 0` would be an invention). So the filter
 * above dropped all 120 bars.
 *
 * For three of those four that is the correct answer and this function does
 * not touch them: profile and location are volume-weighted DISTRIBUTIONS, and
 * aggression's "effort" axis is literally traded volume — without it there is
 * genuinely nothing to measure, and saying so is the honest end state.
 *
 * Structure is the odd one out. It is a sequence of highs and lows. It asked
 * for volume only because it borrowed the profile adapter, and that borrowing
 * cost the Founder a STRUCTURE verdict on 120 perfectly good candles while the
 * chart eleven pixels away drew every one of them — canon Weakness #1, two
 * surfaces on one page disagreeing about whether the evidence even exists.
 *
 * `open` and `close` are still required. A bar missing either is a malformed
 * candle rather than a thin one, and admitting it here would widen this beyond
 * the volume question it was written to answer.
 */
function structureBarsFrom(
  bars: ChartMarketStatePublicationInput["bars"],
): StructureBar[] {
  const out: StructureBar[] = [];
  for (const bar of bars ?? []) {
    if (!bar) continue;
    const { time, open, high, low, close } = bar;
    if (
      typeof time !== "number" || !Number.isFinite(time) ||
      typeof open !== "number" || !Number.isFinite(open) ||
      typeof high !== "number" || !Number.isFinite(high) ||
      typeof low !== "number" || !Number.isFinite(low) ||
      typeof close !== "number" || !Number.isFinite(close)
    ) continue;
    out.push({ time, high, low });
  }
  return out;
}

/**
 * THE DIFFERENCE BETWEEN A QUIET MARKET AND A SILENT VENUE.
 *
 * Profile, location and aggression all rest on per-bar volume, and all three
 * correctly decline without it. But their compilers only ever see the bars
 * that SURVIVED `profileBarsFrom`, so when every bar is dropped they report
 * the same thing an empty feed would: "no volume has been distributed yet",
 * "no bar carried measurable effort". Both sentences imply that waiting, or
 * a busier tape, would fix it.
 *
 * On /command-deck neither is true. 120 candles are loaded and drawn; they are
 * invisible to those three because the venue does not publish per-bar volume
 * at all. Waiting changes nothing. A trader reading "not yet" would keep
 * looking at a number that is never coming.
 *
 * This function is the only place that can tell the two apart, because it is
 * the only place holding BOTH counts. It returns null whenever there is no
 * such contradiction to disclose — no bars at all is a genuinely empty feed
 * and the compilers' own wording is already right for it.
 */
function candleVolumeGapNote(
  rawBars: ChartMarketStatePublicationInput["bars"],
  usableCount: number,
  venue: string | null,
): string | null {
  const rawCount = rawBars?.length ?? 0;
  if (rawCount === 0 || usableCount > 0) return null;
  const where = venue && venue.trim() ? ` from ${venue.trim()}` : "";
  return (
    `${rawCount} candle${rawCount === 1 ? " is" : "s are"} loaded${where}, but `
    + `none carries per-bar volume, and this reading is a volume measurement. `
    + `Waiting will not change that — the venue does not publish it.`
  );
}

/**
 * THE DIFFERENCE BETWEEN A DEAD FEED AND A VENUE WITH NO TAPE.
 *
 * Sibling of `candleVolumeGapNote`, one lane over. Direction and volatility
 * read the PER-TRADE TAPE and nothing else, so with no ticks they both return
 * UNKNOWN carrying "No verified price evidence supplied at snapshot time."
 *
 * MEASURED LIVE, production /charts?symbol=TSLA 15m: that sentence was false.
 * 120 candles were loaded and drawn, the header printed O/H/L/C and V 57,398,
 * and the session change read +2.85%. Price evidence was abundant. What was
 * missing is the tape — and because regime is a pure composition of direction
 * and volatility, that one absence took three of eight dimensions down and the
 * story panel printed "1/8 dimensions resolved" over a fully-drawn chart.
 *
 * Only the publisher holds both lanes, so only the publisher can say which
 * absence it is. Returns null when there is no contradiction to disclose: with
 * no bars AND no ticks the feed really is silent, and the derivers' own
 * wording is already the honest answer.
 */
function tapeAbsentGapNote(
  rawBars: ChartMarketStatePublicationInput["bars"],
  tradeTickCount: number,
  venue: string | null,
): string | null {
  const rawCount = rawBars?.length ?? 0;
  if (rawCount === 0 || tradeTickCount > 0) return null;
  const where = venue && venue.trim() ? ` from ${venue.trim()}` : "";
  return (
    `${rawCount} candle${rawCount === 1 ? " is" : "s are"} loaded${where}, but `
    + `no per-trade tape has arrived, and this reading is measured trade by `
    + `trade. The candles cannot answer it.`
  );
}

function assetClassFor(symbol: string): CanonicalAssetClass {
  return canonicalAssetClass(symbol);
}

function executableIdentityFor(symbol: string, assetClass: CanonicalAssetClass): string | null {
  // Futures have no executable identity in the current WM contract (kept to
  // preserve historical null-check callers). Everything else routes through
  // the canonical helper so 'BTC' → 'BTC-USD' and equities uppercase.
  if (assetClass === "futures") return null;
  return canonicalInstrumentId(symbol, assetClass);
}

function qualityFor(
  source: MarketState["source"],
  connected: boolean,
  hasCanonicalPrice: boolean,
  tapeFresh: boolean,
): MarketQualityState {
  // A per-trade-tape recency window is only a freshness receipt for sources
  // that actually carry a per-trade tape. Handing `fresh: false` to a
  // REST-quote provider (yahoo / finnhub) short-circuits priceSourceBadge to
  // STALE PIPELINE, which is how /command-deck came to render "! STALE" for
  // NQ1! at the same instant the ticker tape 300px above it — grading the
  // SAME quote through the SAME function, but supplying no freshness field —
  // rendered ACTIVE DEGRADED. Canon Weakness #1 (multi-fidelity disagreement
  // on one page), sourced not to the evidence but to WHO ASKED.
  //
  // `undefined` is the documented "not established" value for
  // PriceObservationEvidence.fresh, and it lets the provider arm return the
  // honest ACTIVE DEGRADED -> PARTIAL verdict below.
  const fresh = REST_QUOTE_SOURCES.has(source) ? undefined : tapeFresh;
  const badge = priceSourceBadge(source, connected, undefined, {present: hasCanonicalPrice, fresh});
  if (badge.availability === "unavailable") return "UNAVAILABLE";
  if (badge.live) return hasCanonicalPrice ? "LIVE" : "PARTIAL";
  if (badge.label === "STALE PIPELINE") return "STALE";
  if (badge.label.startsWith("DELAYED")) return "DELAYED";
  // ACTIVE DEGRADED means a usable observation exists but its realtime
  // fidelity is not certified. The canonical state vocabulary represents
  // that as PARTIAL, never UNAVAILABLE and never entitlement-delayed.
  if (badge.label === "ACTIVE DEGRADED") return hasCanonicalPrice ? "PARTIAL" : "UNAVAILABLE";
  return "UNAVAILABLE";
}

function matchingPriceTick(tickerPrice: number, ticks: readonly Tick[], capturedAt: number): Tick | null {
  if (!Number.isFinite(tickerPrice) || tickerPrice <= 0) return null;
  const tolerance = Math.max(Math.abs(tickerPrice) * 1e-8, 1e-8);
  return ticks
    .filter(tick => Number.isFinite(tick.time) && tick.time > 0 && tick.time <= capturedAt && Math.abs(tick.price - tickerPrice) <= tolerance)
    .sort((a, b) => b.time - a.time)[0] ?? null;
}

/** Pure chart-runtime adapter. It never invents analytical dimensions. */
export function createChartMarketStatePublication(
  input: ChartMarketStatePublicationInput,
): { state: ProduceMarketStateInput; qualityState: MarketQualityState } {
  const normalizedSymbol = input.symbol.trim().toUpperCase();
  const assetClass = assetClassFor(normalizedSymbol);
  const priceTick = matchingPriceTick(input.ticker.price, input.recentTicks, input.capturedAt);
  const hasCanonicalPrice = priceTick != null;
  const coverage = input.nectar.channels.filter(channel =>
    channel.normalizedSymbol?.toUpperCase() === normalizedSymbol ||
    channel.instrumentId.toUpperCase() === normalizedSymbol ||
    channel.instrumentId.toUpperCase() === executableIdentityFor(normalizedSymbol, assetClass)
  );
  const qualityState = qualityFor(input.source, input.connected, hasCanonicalPrice,
    priceTick != null && input.capturedAt - priceTick.time < 20_000);

  const eventAt = priceTick?.time ?? null;
  const coverageVersion = input.nectar.updatedAt ?? input.nectar.startedAt;
  const snapshotId = [
    "chart",
    normalizedSymbol,
    input.session,
    input.timeframe,
    eventAt ?? "no-price",
    coverageVersion,
    input.capturedAt,
  ].join(":");

  // Real from-USE fix: seal an orderFlow dimension from the very same
  // per-trade ticks that the OrderFlowCockpitStrip renders. Without this
  // the Passport ORDER FLOW node always read "UNRESOLVED — No verified
  // evidence supplied at snapshot time." while the strip one row above
  // showed live aggressor volumes. The pure derivation self-degrades to
  // UNKNOWN on thin tape so nothing gets fabricated.
  const latestTickAtMs = input.recentTicks.reduce(
    (mx, t) => (Number.isFinite(t.time) && t.time > 0 ? Math.max(mx, t.time) : mx),
    0,
  );
  // The venue for CANDLE-derived evidence. Falls back to the tape source so a
  // caller that has not named a bar venue keeps making exactly the claim it
  // made before — no caller is silently relabelled by this field's arrival.
  //
  // Deliberately NOT applied to profile/location: `buildLivingProfileSnapshot`
  // chooses between the per-trade tape and the candle estimate at runtime, so
  // stamping either venue on that pair would replace one wrong attribution
  // with a different one. They keep the tape source and that limitation is
  // named here rather than left for a reader to discover.
  const barSourceName =
    typeof input.barSource === "string" && input.barSource.trim().length > 0
      ? input.barSource
      : typeof input.source === "string"
        ? input.source
        : null;
  const orderFlow = deriveOrderFlowDimension({
    ticks: input.recentTicks,
    livePrice: input.ticker.price,
    source: typeof input.source === "string" ? input.source : null,
    latestTickAtMs: latestTickAtMs > 0 ? latestTickAtMs : null,
    capturedAt: input.capturedAt,
    snapshotIdSeed: snapshotId,
  });
  // ONE note, computed ONCE, handed to both tape-only derivers. Computing it
  // twice would let the two sentences drift the day either call site grows a
  // condition — the same reason `profileBars` is hoisted below.
  const tapeGapNote = tapeAbsentGapNote(
    input.bars,
    countTradeTicks(input.recentTicks),
    barSourceName,
  );
  const volatility = deriveVolatilityDimension({
    ticks: input.recentTicks,
    source: typeof input.source === "string" ? input.source : null,
    latestTickAtMs: latestTickAtMs > 0 ? latestTickAtMs : null,
    capturedAt: input.capturedAt,
    snapshotIdSeed: snapshotId,
    evidenceGapNote: tapeGapNote,
  });
  // DIRECTION — the dimension the Founder actually reads first, because it is
  // the word rendered in the largest type on /command-deck. It was hard-coded
  // unresolved below for as long as this file has existed, so the deck hero
  // said "UNKNOWN" even while the same tape it was already rendering carried
  // a net-drift read. The derivation self-degrades to PARTIAL on thin or
  // two-sided tape — chop is not a direction — so nothing is fabricated.
  const direction = deriveDirectionDimension({
    ticks: input.recentTicks,
    source: typeof input.source === "string" ? input.source : null,
    latestTickAtMs: latestTickAtMs > 0 ? latestTickAtMs : null,
    capturedAt: input.capturedAt,
    snapshotIdSeed: snapshotId,
    evidenceGapNote: tapeGapNote,
  });

  // REGIME — pure composition of the two dimensions sealed above. It mints no
  // new evidence because it made no new observation. This is the dimension the
  // whole hero hangs on: every cheap selectMarketStory chapter guard (BALANCE,
  // TREND_EXPANSION, ROTATION) reads state.regime, so while regime was
  // hard-coded unresolved the story engine could never support a chapter and
  // /command-deck printed "UNKNOWN" in its largest type for every symbol.
  const regime = deriveRegimeDimension({
    direction,
    volatility,
    tradeCount: countTradeTicks(input.recentTicks),
  });

  // PROFILE — the third repair of one shape. Measured live on /charts
  // 2026-09-17, BTC: the Living Profile panel published VAH 76280 / POC 76000
  // / VAL 75700 from 248 populated buckets while the Market Object Passport in
  // the rail beside it read "Unresolved: location, aggression, structure,
  // profile." One screen, one instrument, one instant, two answers.
  //
  // The source decision is NOT made here. `buildLivingProfileSnapshot` is the
  // single chooser between the per-trade tape and the candle estimate, exactly
  // as ChartsDashboard calls it, so the Passport can never seal a POC the
  // panel never drew. The deriver reads that compiled VM and mints no new
  // observation of its own.
  //
  // ONE compiled VM feeds BOTH profile and location. Compiling it twice would
  // be two chooser calls on the same inputs — identical today, and a silent
  // divergence the day either path grows a tie-break.
  //
  // Hoisted rather than called twice: the COUNT is now load-bearing. See
  // `candleVolumeGapNote` — the gap it discloses is the difference between the
  // bars that arrived and the bars that survived, and two independent calls
  // would let that difference be measured against a set nobody used.
  const profileBars = profileBarsFrom(input.bars);
  const volumeGapNote = candleVolumeGapNote(input.bars, profileBars.length, barSourceName);
  const livingProfile = selectLivingProfile(
    buildLivingProfileSnapshot(input.recentTicks, profileBars),
    { livePrice: input.ticker.price },
  );
  const profileEvidenceInput = {
    vm: livingProfile,
    source: typeof input.source === "string" ? input.source : null,
    latestTickAtMs: latestTickAtMs > 0 ? latestTickAtMs : null,
    capturedAt: input.capturedAt,
    snapshotIdSeed: snapshotId,
    // Only this function holds both the raw and the usable bar count, so only
    // it can say "the venue does not publish volume" instead of "not yet".
    evidenceGapNote: volumeGapNote,
  };
  const profile = deriveProfileDimension(profileEvidenceInput);

  // LOCATION — the fourth repair of this one shape, and the cheapest, because
  // the evidence was already in the variable above. Measured live on /charts
  // 2026-09-17: the Passport read "Location unresolved — No verified evidence
  // supplied at snapshot time." while this very VM held "price is ABOVE the
  // value area".
  //
  // Location is a PROFILE reading, not a price reading: a number alone has no
  // position, and the value area is the only reference on this surface that
  // was measured rather than chosen by a settings panel.
  const location = deriveLocationDimension(profileEvidenceInput);

  // AGGRESSION — the fifth repair of this one shape. Measured live on /charts
  // 2026-09-17: the Passport read "Aggression unresolved — No verified evidence
  // supplied at snapshot time." while the Founder's own Asset 03 scatter,
  // shipped the same day, was plotting effort against response from
  // `selectAggressionResponse` with a measured efficiency ratio.
  //
  // `windowBars: 30` matches ChartsDashboard exactly. Two surfaces reading the
  // same bars over DIFFERENT windows would be the disagreement defect wearing
  // a config value.
  //
  // The deriver may not name a side unless the owner published a
  // NET_AGGRESSION axis — which requires every bar to have stated one. It does
  // not on this surface today, so the honest output is the effort/response
  // verdict at PARTIAL, carrying the owner's own sentence about why the side
  // is absent.
  const aggression = deriveAggressionDimension({
    vm: selectAggressionResponse(profileBars, { windowBars: 30 }),
    // Candles only — never a tick. So the CANDLE venue, not the tape venue.
    source: barSourceName,
    latestTickAtMs: latestTickAtMs > 0 ? latestTickAtMs : null,
    capturedAt: input.capturedAt,
    snapshotIdSeed: snapshotId,
    evidenceGapNote: volumeGapNote,
  });

  // STRUCTURE — the SIXTH and LAST repair of this one shape. Measured live on
  // /charts 2026-09-17: the Passport read "Structure unresolved — No verified
  // evidence supplied at snapshot time." while the chart beside it was drawing
  // Strong Highs/Lows, Liquidity Pools and CHoCH markers off `swingHighLow` on
  // the very same bars.
  //
  // Structure had no compiled owner — MainChart called the raw detector inline,
  // four times, at two different lookbacks. Deriving here off the raw detector
  // would have made this file a FIFTH inline caller and a second opinion about
  // the same swings, so `selectMarketStructure` was written first and this file
  // only reads it.
  //
  // The deriver carries the owner's confirmation-lag sentence on EVERY stated
  // verdict, RESOLVED included: a fractal pivot needs `lookback` bars on both
  // sides, so the newest bars can never be pivots. That caveat is permanent,
  // not a shortage a longer window would cure.
  const structure = deriveStructureDimension({
    // `structureBarsFrom`, NOT `profileBarsFrom`. A swing sequence needs no
    // volume, and routing it through the profile adapter starved this
    // dimension of 120 live candles on /command-deck. See that function.
    vm: selectMarketStructure(structureBarsFrom(input.bars)),
    // Candles only — never a tick. So the CANDLE venue, not the tape venue.
    // This is the receipt that named `coinbase` for a Yahoo-derived swing
    // sequence on /command-deck; see `barSource` on the input type.
    source: barSourceName,
    latestTickAtMs: latestTickAtMs > 0 ? latestTickAtMs : null,
    capturedAt: input.capturedAt,
    snapshotIdSeed: snapshotId,
  });

  // ONE UNKNOWN PER UNRESOLVED DIMENSION.
  //
  // Real from-USE defect (2026-09-03): this previously emitted a single
  // COMPOUND sentence naming all eight dimensions. Every consumer that counts
  // `state.unknowns.length` therefore read 1, while the Passport counted 8
  // dimensions and the decision chain counted 9 nodes — /command-deck showed
  // "1 missing", "MISSING (1)", "0/8 resolved" and "9 unknown" for the SAME
  // snapshot. Four numbers, one truth (LIVING-PIXEL LAW + single-writer canon).
  //
  // Canon grammar: Visual Systems Execution Canon Asset 07 — evidence debt is
  // a LEDGER of individually payable questions, not one lump narrative.
  //
  // THE NAMES COME FROM `dimensionName`, NOT FROM LITERALS TYPED HERE.
  // The eight literals this replaced spelled the last one "Order flow" while
  // two other surfaces spelled it "Order Flow" and two more printed the raw key
  // `orderFlow` — which is how a machine identifier reached a live trader mid
  // sentence. Nothing in the eight was WRONG, which is exactly why it survived:
  // seven of them happen to agree with the owner. Only the two-word dimension
  // was ever going to show that this list was a second author of the name.
  const dimensionResolutions: readonly (readonly [MarketStateDimensionKey, MarketStateDimension])[] = [
    ["direction", direction],
    ["location", location],
    ["aggression", aggression],
    ["regime", regime],
    ["structure", structure],
    ["volatility", volatility],
    ["profile", profile],
    ["orderFlow", orderFlow],
  ];
  const unresolvedDimensions: readonly string[] = dimensionResolutions
    .filter(([, d]) => d.resolution !== "RESOLVED")
    .map(([key]) => dimensionName(key));
  const unknowns = unresolvedDimensions.map(
    name => `${name} is unresolved until a verified engine publishes evidence.`,
  );
  // Bars, not `ticker.price`. `ticker.price` can come from a REST quote or
  // from the SYMBOL_SEEDS fallback table, so it cannot carry the provenance
  // word "bar close" (§35 PROTECTED TRUTH). The selector refuses everything
  // it cannot attribute to a loaded, timestamped bar.
  // `capturedAt` is passed so the selector can prove whether the NEWEST bar has
  // finished forming. Without it the selector still refuses to overclaim — it
  // just falls back to the bar before, costing one bar of freshness.
  const lastBar = deriveLastBarClose(input.bars ?? null, input.timeframe, input.capturedAt);

  const contradictions: string[] = [];
  if (input.ticker.price > 0 && !priceTick) {
    contradictions.push("Displayed ticker price has no matching timestamped runtime tick; canonical price evidence omitted.");
  }

  return {
    qualityState,
    state: {
      snapshotId,
      capturedAt: input.capturedAt,
      instrumentId: executableIdentityFor(normalizedSymbol, assetClass) ?? normalizedSymbol,
      normalizedSymbol,
      executableIdentity: executableIdentityFor(normalizedSymbol, assetClass),
      assetClass,
      exchange: input.source === "coinbase" || input.source === "binance"
        ? input.source.toUpperCase()
        : null,
      session: input.session,
      timeframeContext: [input.timeframe],
      price: {
        last: priceTick?.price ?? null,
        bid: null,
        ask: null,
        eventAt,
      },
      // SECOND PRICE OWNER. `price.last` above stays strict — it needs a
      // matching timestamped print — which is exactly why /charts showed
      // PRICE UNKNOWN in the MARKET tile beside a chart header rendering the
      // last candle's close. This publishes that close under its own name so
      // the trader is not asked to reconcile two owners in their head.
      // A bar close never promotes qualityState; see produceCanonicalMarketState.
      lastBar,
      coverage,
      contradictions,
      unknowns,
      dimensions: {
        orderFlow, volatility, direction, regime, profile, location, aggression, structure,
      },
    },
  };
}

/** Publish the chart command surface into the one canonical runtime owner. */
/**
 * THE SILENT DROP THIS SIGNATURE ONCE HID.
 *
 * `bars` is optional on `ChartMarketStatePublicationInput`, and destructuring
 * fewer keys than a type declares is perfectly legal TypeScript. So when this
 * hook forgot to name `bars`, ChartsDashboard passed `bars: chartBars`, the
 * compiler stayed silent, every unit test stayed green — and the hook threw
 * the candles away before `createChartMarketStatePublication` ever saw them.
 *
 * Measured live on /charts 2026-09-15, TSLA 1h: the dashboard held 178 loaded
 * bars closing at 359.02, the chart header rendered that close beside
 * HISTORICAL BARS VERIFIED, and the MARKET tile two inches away read
 * `TSLA · 1h · PRICE UNKNOWN` because canonical `lastBar` was null. The whole
 * bar-close feature was built, shipped, deployed and unreachable.
 *
 * A dropped input is indistinguishable from absent evidence at the far end of
 * the wire, which is why the screen could lie without anything failing. Name
 * every field explicitly; never let a forwarder decide by omission.
 */
export function usePublishChartMarketState(
  {
    symbol,
    timeframe,
    session,
    ticker,
    recentTicks,
    source,
    connected,
    bars,
    // Named explicitly for the reason the block above exists: an optional field
    // this forwarder does not destructure is silently discarded, and a dropped
    // input is indistinguishable from absent evidence at the far end.
    barSource,
  }: Omit<ChartMarketStatePublicationInput, "capturedAt" | "nectar">,
): void {
  // THE BAR THAT CLOSES WHILE NOTHING CHANGES.
  //
  // Every dependency below is an INPUT. But `lastBar` is not a function of the
  // inputs alone — `deriveLastBarClose`'s second proof ("barOpen + one interval
  // <= now") flips from false to true purely because the clock advanced. On a
  // quiet tape no input changes at that instant, so this effect does not re-run
  // and canonical state keeps naming the runner-up bar for up to a full
  // interval after the newest one provably closed.
  //
  // Measured live 2026-09-15T18:23:39Z on TSLA 15m: the spine read
  // `357.47 LAST 15m BAR CLOSE` (asOf 18:14:00Z) beside an OHLCV strip reading
  // `C 357.87` whose own tooltip said the interval had fully elapsed. Two
  // prices, one page, both labelled close — canon Weakness #1.
  //
  // `recheck` is a nonce bumped by a timer armed for exactly that instant, so
  // the question is re-asked when — and only when — its answer can have
  // changed. Not a poll: at most one extra publication per bar boundary, and
  // none at all once the newest bar has closed.
  const [recheck, setRecheck] = useState(0);
  useEffect(() => {
    const at = lastBarCloseRecheckAtMs(bars ?? null, timeframe, Date.now());
    if (at === null) return;
    // +1ms so the deriver's inclusive `<=` is unambiguously satisfied when the
    // handler runs; a timer that fires a hair early would re-publish the same
    // stale answer and then never re-arm.
    const delay = Math.max(0, at - Date.now() + 1);
    // setTimeout clamps anything past ~24.8 days to a spurious immediate fire.
    // A daily/weekly timeframe can exceed that, and an immediate fire would
    // re-arm instantly in a hot loop. Those intervals are far coarser than the
    // staleness this fixes, so decline rather than spin.
    if (delay > 2_147_483_647) return;
    const timer = setTimeout(() => setRecheck(n => n + 1), delay);
    return () => clearTimeout(timer);
  }, [bars, timeframe, recheck]);

  useEffect(() => {
    const publication = createChartMarketStatePublication({
      symbol,
      timeframe,
      session,
      ticker,
      recentTicks,
      source,
      connected,
      bars,
      barSource,
      capturedAt: Date.now(),
      nectar: getSessionNectarSnapshot(),
    });
    try {
      publishCanonicalMarketState(publication.state, { qualityState: publication.qualityState });
    } catch (error) {
      // Canonical state is an analytical enhancement, never a reason to take
      // down the chart. Validation remains fail-closed; the invalid packet is
      // simply not published.
      console.warn("[WM Market State] publication rejected", error);
    }
    // `bars` belongs here too. Forwarding it without depending on it would
    // leave the close frozen at whatever the first publish happened to see,
    // which is its own quiet untruth.
    //
    // `recheck` belongs here for the same reason, one level up: without it the
    // close stays frozen at whatever the last INPUT CHANGE happened to see,
    // even after the clock alone has made a newer bar provably closed.
    //
    // `barSource` belongs here for the same reason as `bars`: a surface that
    // switches candle venue without re-publishing would keep stamping the old
    // venue on new numbers — a receipt that is wrong in the one way receipts
    // are supposed to make impossible.
  }, [symbol, timeframe, session, ticker, recentTicks, source, connected, bars, barSource, recheck]);
}
