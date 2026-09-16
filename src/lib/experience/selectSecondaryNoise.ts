/**
 * selectSecondaryNoise — the mockup's SECONDARY NOISE readout.
 *
 * The Founder's QUESTION-DRIVEN MODE mockup carries three things in its header
 * band, not two:
 *
 *     ACTIVE QUESTION   Is seller effort being absorbed into this level?
 *     QUESTION FOCUS    Absorption of Seller Effort
 *     SECONDARY NOISE   Quieted
 *
 * The third line is the Auto-Quiet gate made visible. Canon §4 MATERIALITY
 * ENGINE already compiles it:
 *
 *   "Not every change deserves attention. The system must distinguish state
 *    change from decision-relevant state change. Non-material changes are
 *    logged but do not compete for screen space."
 *
 * `selectMateriality` has implemented that gate since shift-F and had ZERO
 * consumers. A gate nothing renders is a gate nothing obeys — the deck was
 * quieting nothing, and the Founder had no way to know whether the screen was
 * calm because the market was calm or because the screen was asleep.
 *
 * THE LAW THIS SELECTOR EXISTS TO OBEY
 *
 *     A QUIET SCREEN AND AN UNWATCHED SCREEN LOOK IDENTICAL.
 *
 * "Quieted" is a CLAIM: it asserts that something was compared and found not
 * to matter. On the very first reading there is no prior snapshot, so nothing
 * has been compared, and printing "Quieted" would be the JPEG's $1.80 — a
 * mockup word with no producer behind it. That state gets its own word and its
 * own muted tone, exactly as "UNKNOWN has a look" requires.
 *
 * PURE. Consumes an already-compiled MaterialityReading. Derives nothing.
 */

import type { MaterialityReading } from "../marketData/viewModels/selectMateriality";

export const SECONDARY_NOISE_VERSION = "wm.secondary-noise.v1" as const;

export type SecondaryNoiseState = "UNWATCHED" | "QUIETED" | "ACTIVE";

export interface SecondaryNoiseVM {
  readonly state: SecondaryNoiseState;
  /** The word the header band prints. */
  readonly value: string;
  /** One phrase saying WHY it reads that way. Never empty. */
  readonly detail: string;
  /**
   * True when the reading is not a settled claim about the market and must
   * therefore refuse the confident ink.
   */
  readonly unresolved: boolean;
}

/**
 * @param reading The compiled materiality delta, or `null` when no PRIOR
 *   snapshot exists to compare against. Callers must pass `null` rather than
 *   synthesising a comparison against an absent past — that is the whole
 *   distinction this selector protects.
 */
export function selectSecondaryNoise(
  reading: MaterialityReading | null,
): SecondaryNoiseVM {
  if (!reading) {
    return {
      state: "UNWATCHED",
      value: "Unwatched",
      detail: "First reading — no prior snapshot to compare against.",
      unresolved: true,
    };
  }

  if (!reading.material) {
    return {
      state: "QUIETED",
      value: "Quieted",
      detail: "Compared against the last reading; nothing decision-relevant moved.",
      unresolved: false,
    };
  }

  return {
    state: "ACTIVE",
    value: "Material change",
    // The summary is already a compiled phrase. Re-wording it here would make
    // this file a SECOND owner of the reason the screen spoke up.
    detail: reading.summary,
    unresolved: false,
  };
}

export default selectSecondaryNoise;
