/**
 * selectAbsorptionAnatomy — the per-bar EFFORT vs DISPLACEMENT series that the
 * Founder's Asset 06 (ABSORPTION ANATOMY) is drawn from.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS, AND WHY THE EXISTING SELECTOR COULD NOT BE REUSED
 *
 * `selectAbsorption` already answers "was this window absorbed?" and
 * `AbsorptionAnatomyPanel` already renders that answer as two facing bars and a
 * verdict. Both are AGGREGATE: one effort number, one displacement number, one
 * word. That is a summary OF the invention, not the invention.
 *
 * The approved mockup is SPATIAL. Its centre panel plots, across the last
 * 20–30 bars:
 *
 *   · EFFORT (PRESSURE) — a layered field whose vertical extent at each bar is
 *     that bar's aggression intensity. "Height = aggression intensity."
 *   · PRICE DISPLACEMENT — the price path itself, riding on that field.
 *     "Flatter slope = inefficiency."
 *   · ABSORPTION ZONE — pinned AT A PRICE, where the field is tall and the
 *     path is flat. "Large effort, minimal result = absorption."
 *
 * You cannot draw that from one number. The read is the RELATIONSHIP between
 * two series, in the chart's own price/time space — which is exactly why the
 * Founder designed it as a picture and not as a sentence. So this selector
 * publishes the SERIES, per bar, normalised over the window, and the zones it
 * implies. Geometry is the consumer's job; truth is this module's job.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT "EFFORT" IS ALLOWED TO MEAN (anti-fabrication)
 *
 * The mockup's own footnote says the ratio "uses normalized effort (delta
 * volume) and displacement (ticks)". Signed delta requires a per-trade
 * aggressor side, and `selectAggressorFlow`'s header records the hard truth:
 * on live US equities that side is usually a TICK-RULE GUESS, and
 * `/api/athos/market-data/capabilities` reports AGGRESSOR_SIDE as UNAVAILABLE
 * for most instruments. Most of the trading day, signed delta DOES NOT EXIST.
 *
 * The forbidden move is to invent it so the picture looks like the mockup.
 * The other forbidden move — equally bad under §35 — is to render nothing and
 * call the invention "blocked on data", trading an overclaim for a blindness.
 *
 * So effort is TIERED, and the tier is published, never hidden:
 *
 *   SIGNED_DELTA    every bar carried a provider-asserted aggressor split.
 *                   effort = |askVol − bidVol|. This is the mockup's own basis.
 *   INFERRED_DELTA  the split exists but some or all of it was reconstructed
 *                   by heuristic. Same math, weaker claim. Weakest-link: one
 *                   inferred bar drags the whole window down to this tier.
 *   VOLUME          no aggressor split at all. effort = traded volume, which
 *                   is real, observed, unsigned, and genuinely IS effort —
 *                   this is the classic effort-vs-result read and it is not a
 *                   substitute for delta, it is a DIFFERENT, honest basis.
 *   UNMEASURED      no volume either. No field is drawn. `measured` is false
 *                   and consumers must render absence, not a flat band that
 *                   reads as "no pressure".
 *
 * `delta` is populated per bar ONLY on the two delta tiers, and is `null`
 * otherwise. A consumer that wants to colour the field by side must check it.
 * There is deliberately no fallback that signs volume by candle direction:
 * a green candle is not evidence that buyers were the aggressors.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT MAKES A ZONE (the mockup's own diagnostic checklist, enforced)
 *
 * The mockup lists what qualifies, and one item is a gate rather than a
 * description: TIME EXTENSION — "Zone holds over multiple bars (not a quick
 * sweep)". So a single tall-effort flat bar is NOT a zone here. A zone is a
 * CONTIGUOUS RUN of at least `minZoneBars` qualifying bars, and its price
 * extent is the union of those bars' high/low — the band gets pinned where the
 * auction actually happened, not at a single close.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PURE. No clock, no I/O, no chart handle. Bars with non-finite OHLC are
 * dropped (canon §Silence: never fabricate a price). All normalisation is over
 * the supplied window only, so the picture is self-scaling and never compares
 * today's volume to a number from another session.
 */

/** Which observation the effort field is built from. Always rendered, never hidden. */
export type EffortBasis = "SIGNED_DELTA" | "INFERRED_DELTA" | "VOLUME" | "UNMEASURED";

/** Per-bar aggressor provenance, mirroring `selectAggressorFlow`'s vocabulary. */
export type BarAggressorProvenance = "PROVIDER" | "INFERRED" | "MIXED" | "UNDISCLOSED";

export interface AnatomyBarInput {
  /** Bar open time, in the chart's own units (seconds). Passed through untouched. */
  readonly time: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume?: number | null;
  /** Aggressor-buy volume for this bar, when the tape supports a split. */
  readonly askVol?: number | null;
  /** Aggressor-sell volume for this bar, when the tape supports a split. */
  readonly bidVol?: number | null;
  /** How this bar's split was established. Absent is treated as UNDISCLOSED. */
  readonly aggressorProvenance?: BarAggressorProvenance | null;
}

export interface AnatomyBar {
  readonly time: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  /** Effort in the basis's own units. 0 when UNMEASURED. */
  readonly effort: number;
  /** Effort as a fraction of the window's peak effort. 0..1. */
  readonly effortNorm: number;
  /** Signed aggression (askVol − bidVol), or null when no split was observed. */
  readonly delta: number | null;
  /** Absolute price travel across the bar, |close − open|, in price units. */
  readonly displacement: number;
  /** Displacement as a fraction of the window's largest bar displacement. 0..1. */
  readonly displacementNorm: number;
  /** High effort AND weak displacement — this bar qualifies for a zone. */
  readonly absorbing: boolean;
}

/** The mockup's own three-way reading of the efficiency ratio. */
export type AbsorptionStrength = "STRONG" | "MODERATE" | "WEAK";

export interface AbsorptionZone {
  readonly startTime: number;
  readonly endTime: number;
  /** Union of the run's bar lows — where the band's lower edge is pinned. */
  readonly priceLo: number;
  /** Union of the run's bar highs — where the band's upper edge is pinned. */
  readonly priceHi: number;
  readonly barCount: number;
  /**
   * Normalised effort per unit of normalised displacement across the run.
   * `null` when the run produced literally zero displacement, which makes the
   * true ratio unbounded — see `unbounded`. Never clamped to a big number,
   * because a fabricated ceiling reads as a measurement.
   */
  readonly efficiencyRatio: number | null;
  /** The run displaced price not at all; the ratio has no finite value. */
  readonly unbounded: boolean;
  readonly strength: AbsorptionStrength;
  /** The run's first open and last close: the displacement actually achieved. */
  readonly travelFrom: number;
  readonly travelTo: number;
  /**
   * Σ(askVol − bidVol) over the run. Null unless EVERY bar of the run carried
   * a side split — a net figure over a partly-heard run would be a guess.
   */
  readonly netDelta: number | null;
  /**
   * H-701A · PASSIVE OPPOSITION HOLDING. The edge the aggression pushed toward
   * and price did not go through: net selling → LOW held, net buying → HIGH
   * held. Read from SIGNED aggression, never from where a candle closed. Null
   * on a VOLUME basis (no side is known), without a full split, or when the
   * net push is too small against the gross to name a direction
   * (`HOLDING_DOMINANCE`).
   */
  readonly holdingEdge: "LOW" | "HIGH" | null;
  /** How the sides behind `holdingEdge` were known. Null when no edge is named. */
  readonly holdingBasis: "PROVIDER" | "INFERRED" | null;
}

/**
 * The net push must be at least this share of the run's gross aggression
 * before an edge is named. Below it, buyers and sellers traded blows and
 * there was no one direction for passive interest to hold against.
 */
export const HOLDING_DOMINANCE = 0.25;

export interface AbsorptionAnatomyVM {
  readonly basis: EffortBasis;
  /** False when nothing observable backs the field. Consumers must draw absence. */
  readonly measured: boolean;
  readonly bars: readonly AnatomyBar[];
  readonly zones: readonly AbsorptionZone[];
  /** How many bars actually survived into the window. */
  readonly windowBars: number;

  /* ── CAN THIS WINDOW ANSWER THE QUESTION AT ALL? ──────────────────────────
   *
   * Every term here is normalised against the window's OWN peak effort. That
   * is what makes one scale mean the same thing on a 5-tick future and a $400
   * stock — and it has a failure mode that is invisible in the output.
   *
   * If a single bar carries almost all of the window's traded effort, every
   * other bar's `effortNorm` collapses toward 0 and can never clear
   * `effortThreshold`. `zones` then comes back EMPTY — not because the market
   * absorbed nothing, but because the arithmetic could not have produced a
   * zone no matter what the market did.
   *
   * Observed live, not imagined: on a thin crypto venue a 15-minute BTC window
   * carried volumes of 0.0003–0.137 BTC. One print held ~85% of the window and
   * the surface printed "NO ZONE QUALIFIED — no run of bars held high effort
   * against weak displacement long enough". That reads as a finding about the
   * market. It was a fact about the feed. The same window on a deep venue read
   * a healthy 5.6× max-to-median.
   *
   * So the incapacity is PUBLISHED rather than left to look like an answer.
   * `0` zones and "this window could not have produced a zone" are different
   * sentences and a reader is owed the second one.
   */

  /** Share of the window's TOTAL effort held by its single largest bar, 0..1. `null` when nothing was measured. */
  readonly effortConcentration: number | null;
  /** How many bars in the window cleared the HIGH EFFORT line. */
  readonly effortQualifyingBars: number;
  /**
   * False when fewer bars cleared the effort gate than `minZoneBars` requires —
   * i.e. an empty `zones` is arithmetic, not observation.
   */
  readonly zoneQualificationPossible: boolean;
  /** One sentence naming the incapacity, or `null` when the window could answer. */
  readonly effortSpreadNote: string | null;
}

export interface AbsorptionAnatomyOptions {
  /** How many trailing bars to analyse. The mockup's window is 20–30. */
  readonly windowBars?: number;
  /** effortNorm at or above which a bar counts as HIGH EFFORT. */
  readonly effortThreshold?: number;
  /** displacementNorm at or below which a bar counts as WEAK DISPLACEMENT. */
  readonly displacementThreshold?: number;
  /** TIME EXTENSION gate — a zone must hold at least this many bars. */
  readonly minZoneBars?: number;
}

/**
 * The gates a zone bar must clear when a caller passes no options. Exported so
 * a reader that explains a zone (Inspect) prints the thresholds from here, not
 * from a copy that could drift from what the selector applied.
 */
export const ABSORPTION_ANATOMY_DEFAULTS = {
  windowBars: 30,
  effortThreshold: 0.6,
  displacementThreshold: 0.35,
  minZoneBars: 2,
} as const;
const DEFAULTS = ABSORPTION_ANATOMY_DEFAULTS;

/** The mockup's legend: > 5.0 STRONG · 2.0–5.0 MODERATE · < 2.0 WEAK. */
export function strengthOfRatio(ratio: number | null, unbounded: boolean): AbsorptionStrength {
  if (unbounded) return "STRONG";
  if (ratio == null) return "WEAK";
  if (ratio > 5) return "STRONG";
  if (ratio >= 2) return "MODERATE";
  return "WEAK";
}

function finite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Decide the window's effort basis, weakest-link.
 *
 * A window is only SIGNED_DELTA when EVERY contributing bar carried a split
 * AND every one of those splits was provider-asserted. One tick-rule bar makes
 * the whole window INFERRED_DELTA — the blended number is not "mostly known".
 */
function resolveBasis(bars: readonly AnatomyBarInput[]): EffortBasis {
  if (bars.length === 0) return "UNMEASURED";

  let everyBarHasSplit = true;
  let everySplitProviderAsserted = true;
  let anyVolume = false;

  for (const bar of bars) {
    const hasSplit = finite(bar.askVol) && finite(bar.bidVol) && bar.askVol + bar.bidVol > 0;
    if (!hasSplit) everyBarHasSplit = false;
    else if (bar.aggressorProvenance !== "PROVIDER") everySplitProviderAsserted = false;
    if (finite(bar.volume) && bar.volume > 0) anyVolume = true;
  }

  if (everyBarHasSplit) return everySplitProviderAsserted ? "SIGNED_DELTA" : "INFERRED_DELTA";
  if (anyVolume) return "VOLUME";
  return "UNMEASURED";
}

export function selectAbsorptionAnatomy(
  input: readonly AnatomyBarInput[] | null | undefined,
  options: AbsorptionAnatomyOptions = {},
): AbsorptionAnatomyVM {
  const windowBars = options.windowBars ?? DEFAULTS.windowBars;
  const effortThreshold = options.effortThreshold ?? DEFAULTS.effortThreshold;
  const displacementThreshold = options.displacementThreshold ?? DEFAULTS.displacementThreshold;
  const minZoneBars = options.minZoneBars ?? DEFAULTS.minZoneBars;

  const usable = (input ?? []).filter(
    bar =>
      finite(bar?.time) &&
      finite(bar?.open) &&
      finite(bar?.high) &&
      finite(bar?.low) &&
      finite(bar?.close),
  );
  const window = windowBars > 0 ? usable.slice(-windowBars) : usable;

  const basis = resolveBasis(window);

  if (basis === "UNMEASURED" || window.length === 0) {
    return {
      basis: "UNMEASURED",
      measured: false,
      bars: [],
      zones: [],
      windowBars: window.length,
      effortConcentration: null,
      effortQualifyingBars: 0,
      // Not "the window could have answered" — an unmeasured window is not a
      // capable one. But the note stays null because `measured: false` is
      // already the louder, more specific disclosure and two sentences saying
      // the same absence is how a surface starts nagging.
      zoneQualificationPossible: false,
      effortSpreadNote: null,
    };
  }

  const useDelta = basis === "SIGNED_DELTA" || basis === "INFERRED_DELTA";

  // Pass 1 — raw effort and displacement.
  const raw = window.map(bar => {
    const delta =
      finite(bar.askVol) && finite(bar.bidVol) ? bar.askVol - bar.bidVol : null;
    const effort = useDelta
      ? Math.abs(delta ?? 0)
      : finite(bar.volume) && bar.volume > 0
        ? bar.volume
        : 0;
    return { bar, delta, effort, displacement: Math.abs(bar.close - bar.open) };
  });

  const maxEffort = raw.reduce((m, r) => (r.effort > m ? r.effort : m), 0);
  const maxDisplacement = raw.reduce((m, r) => (r.displacement > m ? r.displacement : m), 0);

  // Pass 2 — normalise over the window and apply the two-sided qualification.
  //
  // When every bar in the window displaced price by exactly the same amount,
  // `maxDisplacement` normalisation would make every bar 1.0 (or 0/0). A window
  // with no displacement spread has no "flatter" bar to point at, so no bar
  // qualifies as WEAK DISPLACEMENT by comparison — displacementNorm falls back
  // to 0 only when the window truly never moved, which the threshold then reads
  // as universally weak. That is the honest reading: nothing moved anywhere.
  const bars: AnatomyBar[] = raw.map(r => {
    const effortNorm = maxEffort > 0 ? r.effort / maxEffort : 0;
    const displacementNorm = maxDisplacement > 0 ? r.displacement / maxDisplacement : 0;
    return {
      time: r.bar.time,
      open: r.bar.open,
      high: r.bar.high,
      low: r.bar.low,
      close: r.bar.close,
      effort: r.effort,
      effortNorm,
      delta: useDelta ? r.delta : null,
      displacement: r.displacement,
      displacementNorm,
      absorbing: effortNorm >= effortThreshold && displacementNorm <= displacementThreshold,
    };
  });

  // Pass 3 — contiguous runs. TIME EXTENSION gate: a lone spike is a sweep,
  // not a zone, and the mockup says so explicitly.
  const zones: AbsorptionZone[] = [];
  let run: AnatomyBar[] = [];

  const sealRun = () => {
    if (run.length >= minZoneBars) {
      const effortNormSum = run.reduce((s, b) => s + b.effortNorm, 0);
      const displacementNormSum = run.reduce((s, b) => s + b.displacementNorm, 0);
      const unbounded = displacementNormSum === 0;
      const efficiencyRatio = unbounded ? null : effortNormSum / displacementNormSum;
      const fullySplit = useDelta && run.every(b => finite(b.delta));
      const netDelta = fullySplit ? run.reduce((s, b) => s + (b.delta as number), 0) : null;
      const grossDelta = fullySplit ? run.reduce((s, b) => s + Math.abs(b.delta as number), 0) : 0;
      const holdingEdge: AbsorptionZone["holdingEdge"] =
        netDelta == null || grossDelta <= 0 || Math.abs(netDelta) < HOLDING_DOMINANCE * grossDelta
          ? null
          : netDelta < 0 ? "LOW" : "HIGH";
      zones.push({
        startTime: run[0]!.time,
        endTime: run[run.length - 1]!.time,
        priceLo: run.reduce((m, b) => Math.min(m, b.low), Infinity),
        priceHi: run.reduce((m, b) => Math.max(m, b.high), -Infinity),
        barCount: run.length,
        efficiencyRatio,
        unbounded,
        strength: strengthOfRatio(efficiencyRatio, unbounded),
        travelFrom: run[0]!.open,
        travelTo: run[run.length - 1]!.close,
        netDelta,
        holdingEdge,
        holdingBasis: holdingEdge == null ? null : basis === "SIGNED_DELTA" ? "PROVIDER" : "INFERRED",
      });
    }
    run = [];
  };

  for (const bar of bars) {
    if (bar.absorbing) run.push(bar);
    else sealRun();
  }
  sealRun();

  // ── The window's capacity to have answered at all (see AbsorptionAnatomyVM).
  const totalEffort = raw.reduce((s, r) => s + r.effort, 0);
  const effortConcentration = totalEffort > 0 ? maxEffort / totalEffort : null;
  const effortQualifyingBars = bars.reduce(
    (n, b) => (b.effortNorm >= effortThreshold ? n + 1 : n),
    0,
  );
  const zoneQualificationPossible = effortQualifyingBars >= minZoneBars;
  const effortSpreadNote = zoneQualificationPossible
    ? null
    : `only ${effortQualifyingBars} of ${bars.length} bars reached the high-effort line`
      + (effortConcentration != null
        ? ` (one print holds ${Math.round(effortConcentration * 100)}% of the window's effort)`
        : "")
      + ` — a zone needs ${minZoneBars}, so no run could have qualified here whatever the market did`;

  return {
    basis,
    measured: true,
    bars,
    zones,
    windowBars: bars.length,
    effortConcentration,
    effortQualifyingBars,
    zoneQualificationPossible,
    effortSpreadNote,
  };
}
