/**
 * /scanner?scene=scanner-fixture — PROOF SCENE for the FVG conditions strip
 * (coordinator order 2026-10-09).
 *
 * WHY: the scanner's two plain refusals — too few closed bars for ATR(14), and
 * bars too old to be a current reading — are pinned in unit tests, but no
 * listed symbol produces them on serving (44 real symbols probed 2026-10-09:
 * every one answered 59–160 daily bars with the newest on the last session).
 * This fixture hands SAMPLE daily bar sets to the REAL engine
 * (`fvgScanConditions`) in place of the bar fetch, so the engine's own
 * sentences can be read on the glass.
 *
 * PURE: no storage, no network, no clock of its own (the caller passes `nowMs`).
 * The strip uses it only when the token is present AND a trader is signed in,
 * shows the banner, asks for no bars and no options chain, and offers no chart
 * door (a sample symbol has no chart).
 */
import type { CanonicalBar } from "@/lib/marketData/canonicalBar";
import type { FvgBarFetch } from "@/lib/marketData/fvg/fvgBarSource";

export const SCANNER_FIXTURE_BANNER = "PROOF SCENE — sample bars, not the market" as const;
export const SCANNER_FIXTURE_TF = "1D" as const;

export const SCANNER_FIXTURE_SHORT = "SAMPLE-SHORT" as const;
export const SCANNER_FIXTURE_OLD = "SAMPLE-OLD" as const;
export const SCANNER_FIXTURE_FRESH = "SAMPLE-FRESH" as const;
/**
 * A spot-FX-SHAPED sample (coordinator decision 2026-10-09). The volume owner decides "no central
 * volume" from the instrument's class, so this sample is scanned under a real pair id — the engine
 * then says its own spot-FX sentence for FVG + effort→response — and is ALWAYS shown by its label,
 * under the banner, with no chart door. Its bars are synthetic like the others; none is a quote.
 */
export const SCANNER_FIXTURE_FX = "EURUSD" as const;
export const SCANNER_FIXTURE_FX_LABEL = "SAMPLE · EURUSD-shaped" as const;
export const SCANNER_FIXTURE_SYMBOLS = [SCANNER_FIXTURE_SHORT, SCANNER_FIXTURE_OLD, SCANNER_FIXTURE_FRESH, SCANNER_FIXTURE_FX] as const;

/** What the strip prints for a sample symbol: its own name, or the FX sample's label (never the bare pair). */
export function scannerFixtureLabel(symbol: string): string {
  return symbol === SCANNER_FIXTURE_FX ? SCANNER_FIXTURE_FX_LABEL : symbol;
}

/** The list's on-screen sentence (in place of "WM's fixed scanner list …"). */
export const SCANNER_FIXTURE_LINE =
  "SAMPLE list — 4 synthetic symbols built in this page: one with too few closed daily bars, one whose newest bar is old, one that reads, and one shaped like a spot-FX pair (no traded volume). Nothing is fetched, saved or sent; no symbol here is a market.";

/** Why a sample symbol has no option wall reading. */
export const SCANNER_FIXTURE_WALLS = { unavailable: "sample bars — no options chain is asked for in a proof scene" } as const;

const DAY = 86_400_000;
const SEED_FX = 20261014;
/** Closed daily bars each sample carries, and how many days back its newest bar opened. */
export const SCANNER_FIXTURE_SHAPE: Readonly<Record<(typeof SCANNER_FIXTURE_SYMBOLS)[number], { readonly bars: number; readonly newestOpenedDaysAgo: number; readonly seed: number; readonly fx?: true }>> = {
  [SCANNER_FIXTURE_SHORT]: { bars: 9, newestOpenedDaysAgo: 1, seed: 20261009 },
  [SCANNER_FIXTURE_OLD]: { bars: 160, newestOpenedDaysAgo: 12, seed: 20260927 },
  [SCANNER_FIXTURE_FRESH]: { bars: 160, newestOpenedDaysAgo: 1, seed: 20260105 },
  // Spot-FX-shaped: prices near 1.10 at five decimals, volume 0 on every bar; the seed is one whose newest
  // bar reveals a gap condition (pinned by the sentinel), so the convergence lines have something to hang on.
  [SCANNER_FIXTURE_FX]: { bars: 160, newestOpenedDaysAgo: 1, seed: SEED_FX, fx: true },
};

export function isScannerFixtureSymbol(symbol: string): symbol is (typeof SCANNER_FIXTURE_SYMBOLS)[number] {
  return (SCANNER_FIXTURE_SYMBOLS as readonly string[]).includes(symbol);
}

/**
 * The sample's closed daily bars as a bar-fetch result. Deterministic prices
 * (seeded); times are whole UTC days counted back from `nowMs`, so "old" stays
 * old and "fresh" stays fresh whenever the scene is opened.
 */
export function scannerFixtureBars(symbol: string, nowMs: number): FvgBarFetch {
  if (!isScannerFixtureSymbol(symbol)) return { ok: false, reason: `${symbol} is not one of the sample symbols.` };
  const shape = SCANNER_FIXTURE_SHAPE[symbol];
  let seed = shape.seed;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const today = Math.floor(nowMs / DAY) * DAY;
  const newest = today - shape.newestOpenedDaysAgo * DAY;
  // The FX-shaped sample walks near 1.10 in pips; the others near 100 in cents.
  const unit = shape.fx ? 0.004 : 1;
  const dp = shape.fx ? 5 : 2;
  let px = shape.fx ? 1.1 : 100;
  const bars: CanonicalBar[] = [];
  for (let i = 0; i < shape.bars; i++) {
    const o = px;
    const c = o + (rnd() - 0.5) * 2.4 * unit;
    const h = Math.max(o, c) + rnd() * 0.9 * unit;
    const l = Math.min(o, c) - rnd() * 0.9 * unit;
    px = c;
    const asOf = newest - (shape.bars - 1 - i) * DAY;
    bars.push({
      barId: `${symbol}|${SCANNER_FIXTURE_TF}|${asOf}|e0`, symbolId: symbol, sessionId: "SESSION_CONTINUOUS", timeframe: SCANNER_FIXTURE_TF,
      open: +o.toFixed(dp), high: +h.toFixed(dp), low: +l.toFixed(dp), close: +c.toFixed(dp), volume: shape.fx ? rnd() * 0 : Math.round(1000 + rnd() * 4000),
      asOf, receivedAt: asOf + DAY, fidelity: "INDICATIVE", source: "sample", provenance: "DERIVED", truthEpoch: 0,
    });
  }
  return { ok: true, bars, unpaired: 0, forming: 0, provenance: "SAMPLE", fidelity: "SAMPLE" };
}
