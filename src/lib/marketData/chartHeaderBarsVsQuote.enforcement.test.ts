/**
 * "DATA UNAVAILABLE beside rendered candles" — third-nesting enforcement.
 *
 * THE DEFECT, MEASURED LIVE
 * -------------------------
 * 2026-09-10, production, https://wealthymindsetspro.com/charts?symbol=NQ1!.
 * Three answers about ONE instrument inside roughly 180 vertical pixels:
 *
 *   ticker tape    NQ1!  ACTIVE DEGRADED  29,150  -299.00 (-1.02%)
 *   chart header   NQ1! — DATA UNAVAILABLE
 *   price line     29,148.25 — (change unavailable)   O=H=L=C 29148.25  V 0
 *
 * ...while three full sessions of real candles rendered underneath. This is
 * canon Weakness #1 (multi-price disagreement on one page) on the primary
 * trading surface.
 *
 * WHY THE EXISTING GUARD DID NOT CATCH IT
 * ---------------------------------------
 * `resolveChartSurfaceBadge` was built for exactly this class after H-Bkt 1
 * and again after H-Bkt 8. It inspected only `b.unresolved`. But when the
 * QUOTE is refused while the provider NAME resolves (yahoo / finnhub),
 * `priceSourceBadge` returns `unresolved: false` with
 * `availability: "unavailable"` — a second door into the same room. That
 * availability state renders the words "DATA UNAVAILABLE", which is a claim
 * about ALL data. The true fact was narrower: no certified quote, bars fine.
 *
 * THE RULE
 * --------
 * With bars on screen, no chart-chrome badge may render a total-absence
 * claim. Bars are the verified capability; the quote is the missing one, and
 * the two must stay separately reportable. Equally, bar presence may not be
 * laundered into a QUOTE claim — a refused quote must not come back as
 * ACTIVE DEGRADED just because candles loaded.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolveChartSurfaceBadge, priceSourceBadge } from "@/lib/priceSource";
import { CANONICAL_FIDELITY_LABELS as L } from "./canonicalFidelityLabels";

/** The exact live condition: a resolved provider name, a refused quote, real bars. */
const REFUSED_QUOTE = { present: false } as const;

describe("chart chrome — bars on screen forbid a total-absence claim", () => {
  it("the live NQ1! condition no longer yields an availability verdict", () => {
    // Proof the raw grader really does produce the defect, so this test is
    // not asserting a condition that cannot occur.
    const raw = priceSourceBadge("yahoo", false, null, REFUSED_QUOTE);
    expect(
      raw.availability,
      "precondition: a refused quote on a resolved provider must still be the " +
        "state that renders DATA UNAVAILABLE — otherwise this guard is vacuous",
    ).toBe("unavailable");
    expect(raw.unresolved, "and it must NOT be the unresolved path the old guard watched").toBe(false);

    // The guard must convert it once bars are known to exist.
    const guarded = resolveChartSurfaceBadge("yahoo", false, true, null, REFUSED_QUOTE);
    expect(
      guarded.availability,
      "bars are rendering; the header may not claim all data is unavailable",
    ).toBeUndefined();
    expect(guarded.label).toBe(L.HISTORICAL_BARS_VERIFIED);
    expect(guarded.live, "historical bars never imply a live tape").toBe(false);
  });

  it("a proven-closed session reports closure, not historical, with bars present", () => {
    const b = resolveChartSurfaceBadge("yahoo", false, true, false, REFUSED_QUOTE);
    expect(b.label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
    expect(b.availability).toBeUndefined();
  });

  it("zero bars still earns DATA UNAVAILABLE — the honest case is preserved", () => {
    // The fix must not blanket-suppress the availability state. With no bars
    // AND no quote, nothing is on screen and the total-absence claim is true.
    const b = resolveChartSurfaceBadge("yahoo", false, false, null, REFUSED_QUOTE);
    expect(b.availability).toBe("unavailable");
  });

  it("bar presence is never laundered into a quote claim", () => {
    // The mirror-image overclaim. Candles loading does not mean a delayed
    // quote is flowing, so ACTIVE DEGRADED (which asserts an observed price)
    // may not appear when the quote was refused.
    const b = resolveChartSurfaceBadge("yahoo", false, true, null, REFUSED_QUOTE);
    expect(b.label).not.toBe(L.ACTIVE_DEGRADED);
  });

  it("an observed quote still grades normally — the guard is not a blanket override", () => {
    const b = resolveChartSurfaceBadge("yahoo", false, true, null, { present: true });
    expect(b.label).toBe(L.ACTIVE_DEGRADED);
    expect(b.availability).toBeUndefined();
  });

  it("callers that omit the quote observation keep their prior behaviour", () => {
    // Backwards-compatibility lock: the parameter is optional and last so
    // every pre-existing call site is byte-for-byte unaffected.
    const withOut = resolveChartSurfaceBadge("unknown-provider", false, true, null);
    expect(withOut.label).toBe(L.HISTORICAL_BARS_VERIFIED);
  });
});

describe("the /charts header routes through the guard, not the raw grader", () => {
  const DASHBOARD = readFileSync(
    "src/components/chart/ChartsDashboard.tsx",
    "utf8",
  );

  it("ChartsDashboard uses resolveChartSurfaceBadge for its fidelity chip", () => {
    expect(
      DASHBOARD,
      "the /charts header must not call the raw priceSourceBadge — that grades " +
        "the QUOTE alone and printed DATA UNAVAILABLE over rendered candles in " +
        "production on 2026-09-10",
    ).toMatch(/resolveChartSurfaceBadge\(/);
  });

  it("it passes real bar evidence rather than hard-coding presence", () => {
    expect(
      DASHBOARD,
      "the badge call must be given chartBars — the evidence was already in " +
        "hand at that line and simply was not handed to the grader",
    ).toMatch(/resolveChartSurfaceBadge\([\s\S]{0,160}chartBars\.length > 0/);
  });
});
