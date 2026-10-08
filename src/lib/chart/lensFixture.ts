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

/** `prints` prints travelling `span` (in units of `unit`) from `from`, fixed size. */
function leg(from: number, span: number, prints: number, size: number, unit: number): AggressorTick[] {
  return Array.from({ length: prints }, (_, i) =>
    tick(Number(((from + (span * (i + 1)) / prints) * unit).toFixed(6)), size, i % 2 === 0 ? "buy" : "sell"));
}

/** A deterministic tape that the real owner reads as `stage`, scaled to `centre`. */
export function lensFixtureTape(stage: WeatherStage, centre: number): AggressorTick[] {
  const u = centre > 0 && Number.isFinite(centre) ? centre / 100 : 1;
  switch (stage) {
    case "UNMEASURED": return [];
    case "STEADY": return leg(100, 2, 120, 100, u);
    case "THINNING": return [...leg(100, 1, 60, 400, u), ...leg(101, 1, 60, 40, u)];
    case "THICKENING": return [...leg(100, 1, 60, 40, u), ...leg(101, 1, 60, 400, u)];
    case "HEAVY": return [...leg(100, 2, 110, 50, u), ...Array.from({ length: 10 }, () => tick(Number((102 * u).toFixed(6)), 800, "buy"))];
    case "AIRLESS": return [...leg(100, 1, 110, 500, u), ...leg(101, 1, 10, 5, u)];
    case "ERRATIC": return Array.from({ length: 12 }, (_, s) => leg(100 + s * 0.5, 0.5, 12, s % 2 === 0 ? 20 : 2000, u)).flat();
  }
}

/** The real owner's reading of the sample tape. */
export function lensFixtureWeather(stage: WeatherStage, centre: number): LiquidityWeatherVM {
  return selectLiquidityWeather(lensFixtureTape(stage, centre));
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
