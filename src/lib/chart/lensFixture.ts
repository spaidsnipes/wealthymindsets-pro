/**
 * LENS FIXTURE SCENE (coordinator order 2026-10-08) — `/charts?scene=lens-fixture`
 * with `state=<WEATHER STAGE>` and / or `climate=<PRESSURE CLIMATE>`.
 *
 * Proves state-by-texture for Liquidity Weather (7 stages) and Derivatives
 * Pressure (3 climates) WITHOUT waiting for the market: a deterministic
 * SYNTHETIC tape / options chain is fed, in memory, into the REAL owners
 * (`selectLiquidityWeather`, `selectDerivativesPressure`), and the chart paints
 * their readings through the same receipts it always writes
 * (`liquidityWeatherStageInk`, `derivativesPressureTint`).
 *
 * Constraints (same as the journal / profile fixture scenes):
 *   · token-gated: inert without `scene=lens-fixture` and a valid state/climate;
 *   · signed-in only (the room checks the session before using it);
 *   · zero storage writes (it is a proof scene: `proofSceneHoldsWrites`) and zero
 *     network writes — and while it is on, the live options chain is NOT fetched
 *     and the live tape's weather is NOT read for the lens (never mixed);
 *   · a banner on screen: LENS_FIXTURE_BANNER.
 *
 * The sample is positioned at the chart's own last close (`centre`) so the
 * field is on the price axis; the SHAPE (and so the stage / climate) is fixed —
 * both owners are scale-free (proved in lensFixture.test.ts).
 *
 * PURE. No IO, no storage, no clock (the caller passes `nowMs`).
 */
import type { CboeOptionRow, CboeOptionsReceipt } from "@/lib/marketData/cboeDelayedOptions";
import type { AggressorTick } from "@/lib/marketData/selectAggressorFlow";
import { selectDerivativesPressure, type Climate, type DerivativesPressureVM } from "@/lib/marketData/viewModels/selectDerivativesPressure";
import { selectLiquidityWeather, type LiquidityWeatherVM, type WeatherStage } from "@/lib/marketData/viewModels/selectLiquidityWeather";

export const LENS_FIXTURE_SCENE = "lens-fixture" as const;
export const LENS_FIXTURE_BANNER = "PROOF SCENE — sample market state, not live" as const;

export const LENS_FIXTURE_STAGES: readonly WeatherStage[] = ["AIRLESS", "THINNING", "STEADY", "THICKENING", "HEAVY", "ERRATIC", "UNMEASURED"];
export type LensFixtureClimate = Exclude<Climate, "INSUFFICIENT_EVIDENCE">;
export const LENS_FIXTURE_CLIMATES: readonly LensFixtureClimate[] = ["DAMPING", "AMPLIFYING", "MIXED"];

export interface LensFixture {
  readonly stage: WeatherStage | null;
  readonly climate: LensFixtureClimate | null;
}

/** The fixture the URL asks for, or null (inert). Unknown values are ignored, never guessed. */
export function parseLensFixture(search: string): LensFixture | null {
  let q: URLSearchParams;
  try { q = new URLSearchParams(search); } catch { return null; }
  if ((q.get("scene") ?? "").trim() !== LENS_FIXTURE_SCENE) return null;
  const s = (q.get("state") ?? "").trim().toUpperCase();
  const c = (q.get("climate") ?? "").trim().toUpperCase();
  const stage = (LENS_FIXTURE_STAGES as readonly string[]).includes(s) ? (s as WeatherStage) : null;
  const climate = (LENS_FIXTURE_CLIMATES as readonly string[]).includes(c) ? (c as LensFixtureClimate) : null;
  return stage || climate ? { stage, climate } : null;
}

/* ── the synthetic tape (shapes from the owner's own test suite) ─────────── */

const tick = (price: number, size: number, side: "buy" | "sell"): AggressorTick =>
  ({ price, size, side, trade: true, marketEvent: { aggressorMethod: "PROVIDER" as never } });

/** `prints` prints travelling `span` shape-units from `from`, fixed size. */
function leg(from: number, span: number, prints: number, size: number): { p: number; size: number; side: "buy" | "sell" }[] {
  return Array.from({ length: prints }, (_, i) => ({ p: from + (span * (i + 1)) / prints, size, side: i % 2 === 0 ? "buy" as const : "sell" as const }));
}

/** The sample's shape travels this share of price per shape-unit: the whole tape stays within ~1% of the chart's last close (on camera). */
export const LENS_FIXTURE_PRICE_STEP = 0.0015;
/** The sample's prints are spread over this many of the chart's newest bars — the lens's own span. */
export const LENS_FIXTURE_BARS = 6;

/** WHEN the sample's prints sit: the newest `LENS_FIXTURE_BARS` bars ending at `endMs`. Without it the prints are undated (the lens cannot be placed). */
export interface LensFixtureWindow { readonly endMs: number; readonly barMs: number }

/**
 * A deterministic tape that the real owner reads as `stage`. Prices are an
 * affine map of the shape round `centre` (the owner is scale-free); with a
 * `span` every print is dated, evenly, across the chart's newest bars so the
 * glass has a window and the lens is placed (serving 48bdea6: undated prints
 * read UNTIMED and the stage grain never painted).
 */
export function lensFixtureTape(stage: WeatherStage, centre: number, span: LensFixtureWindow | null = null): AggressorTick[] {
  const c = centre > 0 && Number.isFinite(centre) ? centre : 100;
  const shape = (() => {
    switch (stage) {
      case "UNMEASURED": return [];
      case "STEADY": return leg(100, 2, 120, 100);
      case "THINNING": return [...leg(100, 1, 60, 400), ...leg(101, 1, 60, 40)];
      case "THICKENING": return [...leg(100, 1, 60, 40), ...leg(101, 1, 60, 400)];
      case "HEAVY": return [...leg(100, 2, 110, 50), ...Array.from({ length: 10 }, () => ({ p: 102, size: 800, side: "buy" as const }))];
      case "AIRLESS": return [...leg(100, 1, 110, 500), ...leg(101, 1, 10, 5)];
      case "ERRATIC": return Array.from({ length: 12 }, (_, s) => leg(100 + s * 0.5, 0.5, 12, s % 2 === 0 ? 20 : 2000)).flat();
    }
  })();
  const dated = span && Number.isFinite(span.endMs) && span.barMs > 0 ? span : null;
  const startMs = dated ? dated.endMs - LENS_FIXTURE_BARS * dated.barMs : 0;
  const n = shape.length;
  return shape.map((s, i) => ({
    ...tick(Number((c * (1 + (s.p - 101) * LENS_FIXTURE_PRICE_STEP)).toFixed(8)), s.size, s.side),
    ...(dated ? { time: Math.round(startMs + ((i + 1) / n) * LENS_FIXTURE_BARS * dated.barMs) } : {}),
  }));
}

/** The real owner's reading of the sample tape. */
export function lensFixtureWeather(stage: WeatherStage, centre: number, span: LensFixtureWindow | null = null): LiquidityWeatherVM {
  return selectLiquidityWeather(lensFixtureTape(stage, centre, span));
}

/* ── the synthetic chain ─────────────────────────────────────────────────── */

/** A deterministic delayed-chain receipt the real owner reads as `climate`, strikes around `centre`. */
export function lensFixtureChain(climate: LensFixtureClimate, centre: number, nowMs: number): CboeOptionsReceipt {
  const c = centre > 0 && Number.isFinite(centre) ? centre : 100;
  const exp = new Date(nowMs + 21 * 86_400_000).toISOString().slice(0, 10);
  const row = (type: "call" | "put", k: number, oi: number): CboeOptionRow =>
    ({ contract: `SAMPLE${type}${k}`, type, expiration: exp, strike: Number((c * k / 100).toFixed(4)), openInterest: oi, gamma: null, iv: 0.4, volume: null });
  const rows = Array.from({ length: 41 }, (_, i) => 80 + i).flatMap(k =>
    climate === "DAMPING" ? [row("call", k, 1000), row("put", k, 100)]
      : climate === "AMPLIFYING" ? [row("call", k, 100), row("put", k, 1000)]
        : k < 100 ? [row("put", k, 1500)] : k > 100 ? [row("call", k, 1500)] : []);
  return { source: "CBOE_DELAYED", underlying: "SAMPLE", spot: c, iv30: 40, chainAsOf: null, underlyingAsOf: null, rows, dropped: 0 };
}

/**
 * The real owner's reading of the sample chain. No chart bars are passed: the
 * sample's positioning never meets the live candles, so no wall test is claimed.
 */
export function lensFixturePressure(climate: LensFixtureClimate, centre: number, nowMs: number): DerivativesPressureVM {
  return selectDerivativesPressure(lensFixtureChain(climate, centre, nowMs), [], nowMs);
}
