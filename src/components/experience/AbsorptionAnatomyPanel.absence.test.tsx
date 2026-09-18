/**
 * THE SIXTH BLOCKED READING — the one that kept printing numbers.
 *
 * `selectMissingTapeBanner` names, once and at the top of the Smart Money
 * drawer, the input this symbol's feed does not carry. Five readings deferred
 * to it. This one did not, and what it rendered instead was observed live on
 * NQ1! on 2026-09-17, a few hundred pixels below that very banner:
 *
 *   AGGRESSIVE BUYS 0 · AGGRESSIVE SELLS 0 · IMBALANCE 0% "neither side"
 *   VERDICT  UNMEASURED
 *
 * while the chart, on the same screen, in the same frame, drew its basis chip
 * as `EFFORT · VOLUME` and two live zones reading `ABSORPTION 3.86 MODERATE`
 * and `ABSORPTION 6.59 STRONG`.
 *
 * TWO DISTINCT DEFECTS, WHICH IS WHY THIS FILE HAS TWO HALVES.
 *
 *   1. `0` IS A MEASUREMENT. "Aggressive buys 0" says a count was taken and
 *      came back empty — a claim about the market. The true statement is that
 *      this tape never stated a side, which is a claim about the FEED. The
 *      panel's own `num()` helper already legislates this for the response
 *      half ("a number that is absent renders as an em dash, never as zero");
 *      the effort half went through `vol()` and was exempt.
 *
 *   2. UNMEASURED vs MODERATE IS A CONTRADICTION, NOT A REDUNDANCY. Both
 *      sentences are true — of different bases. But nothing on screen said
 *      so, so the trader had to choose, and either choice is wrong: believe
 *      the drawer and discard a reading the chart is drawing; believe the
 *      chart and think the aggressor split is known.
 *
 * The repair therefore cannot be to silence one voice. It has to name the
 * basis that is missing AND the basis the chart fell back to, which is the
 * only sentence that makes the two readings compose.
 *
 * THE GUARD THAT MATTERS MOST IS THE NEGATIVE ONE. A flag that can blank a
 * real measurement is a worse defect than the one being fixed, so the
 * suppression is conditioned on the readings ACTUALLY being empty, and that
 * is asserted here directly.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AbsorptionAnatomyPanel } from "./AbsorptionAnatomyPanel";
import type { AbsorptionVM } from "@/lib/marketData/viewModels/selectAbsorption";
import { ABSORPTION_VERSION } from "@/lib/marketData/viewModels/selectAbsorption";

/** Exactly what `selectAbsorption` returns for a feed with no aggressor side. */
const NO_TAPE: AbsorptionVM = {
  version: ABSORPTION_VERSION,
  verdict: "UNMEASURED",
  pressingSide: null,
  buyEffort: 0,
  sellEffort: 0,
  netEffort: 0,
  imbalance: 0,
  displacement: null,
  displacementInSpread: null,
  efficiency: null,
  provenance: "UNDISCLOSED",
  requiresDisclosure: true,
  detail: "no aggressor-tagged prints in this window",
};

/** A window that really was measured — sides stated, price moved. */
const MEASURED: AbsorptionVM = {
  version: ABSORPTION_VERSION,
  verdict: "ABSORBED",
  pressingSide: "BUYERS",
  buyEffort: 18_400,
  sellEffort: 6_100,
  netEffort: 12_300,
  imbalance: 0.5,
  displacement: 0.75,
  displacementInSpread: 0.2,
  efficiency: 6.1e-5,
  provenance: "PROVIDER",
  requiresDisclosure: false,
  detail: "buyers pressed and price held — effort spent, displacement withheld",
};

describe("AbsorptionAnatomyPanel — absence is not a measurement of zero", () => {
  it("prints hard zeros when nothing above has declared the absence", () => {
    // The standalone case: on a surface with no banner over it, this panel is
    // the closest voice to the whole picture and must speak in full.
    const html = renderToStaticMarkup(<AbsorptionAnatomyPanel vm={NO_TAPE} symbol="NQ1!" />);
    expect(html).toContain("0");
    expect(html).not.toContain("not carried");
    expect(html).not.toContain("Blocked by the missing input");
  });

  it("replaces the effort counts with em dashes once the banner has spoken", () => {
    const html = renderToStaticMarkup(
      <AbsorptionAnatomyPanel vm={NO_TAPE} symbol="NQ1!" absenceDeclaredAbove />,
    );
    // Two effort readings, both disclaiming rather than counting. Anchored on
    // the closing tag so this counts the VISIBLE notes only — the aria-label
    // carries the same words and would otherwise inflate the count to three
    // and quietly pass if one of the two notes were later dropped.
    expect(html.match(/not carried</g) ?? []).toHaveLength(2);
    // And the imbalance stops asserting a balanced market it never observed.
    expect(html).not.toContain("neither side");
    expect(html).toContain("no sides to weigh");
  });

  it("defers in the drawer's own words, and names the basis the chart fell back to", () => {
    const html = renderToStaticMarkup(
      <AbsorptionAnatomyPanel vm={NO_TAPE} symbol="NQ1!" absenceDeclaredAbove />,
    );
    expect(html).toContain("Blocked by the missing input named at the top of this drawer.");
    // THE CLAUSE THAT CLOSES THE CONTRADICTION. Without it the trader reads
    // UNMEASURED here and MODERATE on the glass with nothing to reconcile them.
    expect(html).toContain("volume basis");
    expect(html).toContain("never which side spent it");
  });

  it("stops the screen reader from being told a zero either", () => {
    const html = renderToStaticMarkup(
      <AbsorptionAnatomyPanel vm={NO_TAPE} symbol="NQ1!" absenceDeclaredAbove />,
    );
    expect(html).toContain("not carried by this feed");
    expect(html).not.toContain("Aggressive buy volume 0");
  });

  it("NEVER blanks a reading that exists, even with the flag set", () => {
    // The dangerous direction. A banner that can erase a real measurement is
    // a bigger truth failure than the zero this change removes, so the flag
    // is inert whenever the tape actually carried sides.
    const html = renderToStaticMarkup(
      <AbsorptionAnatomyPanel vm={MEASURED} symbol="NQ1!" absenceDeclaredAbove />,
    );
    expect(html).toContain("18,400");
    expect(html).toContain("6,100");
    expect(html).toContain("buyers pressing");
    expect(html).not.toContain("not carried");
    expect(html).not.toContain("Blocked by the missing input");
    // The verdict it earned still stands.
    expect(html).toContain("ABSORBED");
  });
});
