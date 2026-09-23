/**
 * EVERY PAINTING LAYER NAMES ITS SILENCE.
 *
 * A layer that writes nothing when switched off is indistinguishable from a
 * layer that broke, and an external probe reading `canvas.dataset.<layer>`
 * cannot tell those apart. This shift established a convention across the six
 * painting layers on the tape:
 *
 *     absorption · imbalanceStack · valueCandle · deltaDivergence
 *     · liquidityWeather · effortMark · deltaLevels
 *
 * Each publishes a NAMED STATE in every render — OFF when the trader closed
 * it, and the compiler's own refusal reason otherwise. This file exists so
 * the seventh layer, which does not exist yet, cannot skip the convention.
 *
 * The join is mechanical: every key read off `layerOnRef` is by construction
 * a layer that paints, so it is the same seam `everyPaintingLayerHasADoor`
 * uses. The rule enforced here is the OTHER side of that seam — not "has a
 * door in the menu" but "names itself in the receipt when the door closes."
 *
 * A breadcrumb, not a renderer. It reads source.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

const CHART = strip(read("src/components/chart/MainChart.tsx"));

/** Every layer the overlay can quiet, by the key it reads off `layerOnRef`. */
const SWITCH_KEYS: readonly string[] = [
  ...new Set(
    [...CHART.matchAll(/layerOnRef\.current\.([A-Za-z]+)/g)].map(m => m[1]),
  ),
].sort();

/**
 * The dataset attribute a layer publishes its state into is the same word as
 * its switch key. `stack` → `imbalanceStack`? No — the switch keys are the
 * short names and the receipts spell out. That mismatch is deliberate and it
 * is what this file has to unify. So we join on the FULL receipt name, which
 * we get from the actual receipt writes.
 */
const RECEIPT_NAMES: readonly string[] = [
  ...new Set(
    [...CHART.matchAll(/\bds\.([a-z][A-Za-z]*)\s*=\s*(?:on|(?:[a-z]\w*)\s*\?)/g)]
      .map(m => m[1])
      .filter(n => /^(absorption|imbalanceStack|valueCandle|deltaDivergence|liquidityWeather|effortMark|deltaLevels)$/.test(n)),
  ),
].sort();

describe("every painting layer names its silence", () => {
  it("the receipt convention is actually being read from source", () => {
    // Without this, a rename of every receipt attribute would leave the file
    // sweeping an empty set — which is the quietest way a sentinel dies.
    expect(SWITCH_KEYS.length, "no layerOnRef keys found — did the ref move?")
      .toBeGreaterThan(3);
    expect(RECEIPT_NAMES.length, "no receipt writes found — did the convention rename?")
      .toBeGreaterThan(3);
  });

  it("EVERY LAYER PUBLISHES AN OFF STATE — silence is a state, not a gap", () => {
    for (const name of RECEIPT_NAMES) {
      // The four possible shapes this shift established:
      //   ds.X = on ? Y : "OFF"                       (single-source layers)
      //   ds.X = on ? (v ? v.reason : "NO_READING") : "OFF"   (verdict layers)
      //   ds.X = anatomy.measured ? … : "UNMEASURED"  (compiler-classified)
      //   ds.X = "OFF"                                (explicit off branch)
      const publishes = new RegExp(
        `ds\\.${name}\\s*=\\s*(?:on\\s*\\?|[a-z]\\w*\\.measured\\s*\\?|"OFF")`,
      ).test(CHART);
      expect(
        publishes,
        `\`ds.${name}\` never names an OFF (or equivalent quiet) state. ` +
          "A layer that writes nothing when the trader closes it is " +
          "indistinguishable from one that broke — the same defect this " +
          "shift closed for six layers already.",
      ).toBe(true);
    }
  });

  it("EVERY LAYER WITHDRAWS ITS ANCILLARY RECEIPTS on OFF or when unpainted", () => {
    // The stateful receipt names its state; the ancillary receipts (like
    // `valueCandleCog`, `liquidityWeatherStage`, `deltaLevelsRungs`) describe
    // paint that is no longer happening, and a stale one describes a new
    // window as though it were the old one. Each layer that publishes an
    // ancillary must also delete it.
    const withDeletes: string[] = [
      "delete ds.valueCandleCog",
      "delete ds.valueCandleRungs",
      "delete ds.imbalanceStackLevels",
      "delete ds.imbalanceStackEdge",
      "delete ds.deltaDivergenceLean",
      "delete ds.liquidityWeatherStage",
      "delete ds.liquidityWeatherShelves",
      "delete ds.effortMarkSide",
      "delete ds.deltaLevelsRungs",
      "delete ds.absorptionBasis",
      "delete ds.absorptionZones",
    ];
    for (const stmt of withDeletes) {
      expect(
        CHART.includes(stmt),
        `\`${stmt}\` is missing — a stale receipt would keep describing a ` +
          "window that no longer exists.",
      ).toBe(true);
    }
  });
});
