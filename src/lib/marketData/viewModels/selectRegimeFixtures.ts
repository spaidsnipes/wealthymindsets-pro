/**
 * REGIME FIXTURES — the geometry H-901's dimmer lights, measured from bars.
 *
 * Child of REGIME LIGHTING (H-901, family F15 Regime). Plate: "Regime is a
 * lighting dimmer on existing geometry, not a regime room … Geometry remains.
 * Light changes." The plate's market canvas carries two fixture classes:
 *
 *   ☆ MEAN-REVERSION MAGNETS — horizontal levels at MEAN, MEAN ± σ and
 *     MEAN ± 2σ of the price path ("attracted to mean; dims under TREND").
 *   △ TREND-CHANNEL FIXTURE  — a parallel channel riding the path: a centre
 *     line and two parallel boundaries, hatched between ("rides channel;
 *     capped under RANGE").
 *
 * This module measures both from the bars it is handed — the closes of the
 * bars on camera, in the chart's own bar order — and nothing else:
 *
 *   magnets  — mean and population σ of the closes.
 *   channel  — least-squares line of close on BAR INDEX (the chart spaces bars
 *              by index, so the line is straight on screen across session
 *              gaps), boundaries at ± CHANNEL_SIGMAS × the residual σ.
 *
 * It never classifies a regime and never decides which class is lit — that is
 * `selectRegimeLighting`, read from the one regime owner. Every price it
 * returns is a statistic of real closes; every endpoint is a real bar's time,
 * so nothing is drawn right of the newest bar (a reading, not a forecast).
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

export const REGIME_FIXTURES_VERSION = 1;
/** Fewer closes than this cannot state a mean, a spread or a slope honestly. */
export const REGIME_FIXTURES_MIN_BARS = 20;
/** The channel's boundaries sit this many residual σ either side of the line. */
export const CHANNEL_SIGMAS = 2;

export interface RegimeFixtureBar {
  readonly time: number;
  readonly close: number;
}

export type MagnetStep = -2 | -1 | 0 | 1 | 2;

export interface MagnetLevel {
  /** How many σ from the mean. */
  readonly k: MagnetStep;
  readonly price: number;
  /** The plate's own name for the level: MEAN, +σ, −σ, +2σ, −2σ. */
  readonly label: string;
}

export interface ChannelLine {
  /** −1 lower boundary, 0 centre, +1 upper boundary. */
  readonly side: -1 | 0 | 1;
  /** Price on the channel at the first measured bar. */
  readonly fromPrice: number;
  /** Price on the channel at the newest measured bar. */
  readonly toPrice: number;
}

export type RegimeFixturesReason = "DRAWN" | "FEW_BARS" | "FLAT";

export interface RegimeFixturesVM {
  readonly version: number;
  readonly drawn: boolean;
  readonly reason: RegimeFixturesReason;
  /** Closes measured. */
  readonly bars: number;
  /** The first and newest measured bar's time — the fixtures' whole span. */
  readonly fromTime: number | null;
  readonly toTime: number | null;
  readonly magnets: { readonly mean: number; readonly sigma: number; readonly levels: readonly MagnetLevel[] } | null;
  readonly channel: {
    /** Price change per bar along the centre line. */
    readonly slopePerBar: number;
    /** Residual σ about the centre line. */
    readonly sigma: number;
    /** Lower, centre, upper — in that order. */
    readonly lines: readonly ChannelLine[];
  } | null;
}

const LABEL: Readonly<Record<MagnetStep, string>> = { [-2]: "−2σ", [-1]: "−σ", 0: "MEAN", 1: "+σ", 2: "+2σ" };

const silent = (reason: RegimeFixturesReason, bars: number): RegimeFixturesVM => ({
  version: REGIME_FIXTURES_VERSION,
  drawn: false,
  reason,
  bars,
  fromTime: null,
  toTime: null,
  magnets: null,
  channel: null,
});

export function selectRegimeFixtures(bars: readonly RegimeFixtureBar[]): RegimeFixturesVM {
  // x is the bar's position in the chart's own order: a skipped (non-finite)
  // bar still occupies its slot, so the line stays on the candles it measured.
  const pts: { x: number; t: number; c: number }[] = [];
  bars.forEach((b, x) => {
    if (b && Number.isFinite(b.close) && Number.isFinite(b.time)) pts.push({ x, t: b.time, c: b.close });
  });
  const n = pts.length;
  if (n < REGIME_FIXTURES_MIN_BARS) return silent("FEW_BARS", n);

  let sc = 0, sx = 0;
  for (const p of pts) { sc += p.c; sx += p.x; }
  const mean = sc / n, xm = sx / n;
  let scc = 0, sxx = 0, sxy = 0;
  for (const p of pts) {
    const dc = p.c - mean, dx = p.x - xm;
    scc += dc * dc; sxx += dx * dx; sxy += dx * dc;
  }
  const sigma = Math.sqrt(scc / n);
  // Every close the same price: no spread to name, no slope to ride.
  if (!(sigma > 0) || !(sxx > 0)) return silent("FLAT", n);

  const slope = sxy / sxx;
  const at = (x: number) => mean + slope * (x - xm);
  let srr = 0;
  for (const p of pts) { const r = p.c - at(p.x); srr += r * r; }
  const resid = Math.sqrt(srr / n);

  const first = pts[0], last = pts[n - 1];
  const steps: MagnetStep[] = [-2, -1, 0, 1, 2];
  return {
    version: REGIME_FIXTURES_VERSION,
    drawn: true,
    reason: "DRAWN",
    bars: n,
    fromTime: first.t,
    toTime: last.t,
    magnets: {
      mean,
      sigma,
      levels: steps.map(k => ({ k, price: mean + k * sigma, label: LABEL[k] })),
    },
    channel: {
      slopePerBar: slope,
      sigma: resid,
      lines: ([-1, 0, 1] as const).map(side => ({
        side,
        fromPrice: at(first.x) + side * CHANNEL_SIGMAS * resid,
        toPrice: at(last.x) + side * CHANNEL_SIGMAS * resid,
      })),
    },
  };
}

export default selectRegimeFixtures;
