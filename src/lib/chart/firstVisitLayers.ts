/**
 * FIRST VISIT IS ONE INVENTION, NOT ALL OF THEM (Founder, 2026-10-17, on the iPad and the phone: "there's no way that
 * things can be actually seen clearly … if we're doing a thousand indicators, everything mushed together at one time.
 * Shit needs to be done one by one … browser, every device").
 *
 * The ONE owner of what a device that has never saved a choice shows: the market (candles, volume, the decision rail)
 * the Living Profile — the signature body — and one reading. Every other invention starts OFF and is switched on, one at a time,
 * from Tools. A choice the trader has saved on a device is never touched: these are defaults, read only when the
 * device holds no value for the key.
 */
// …and ONE reading, so the first chart is never blank: Absorption Anatomy, the reading that can always draw (its
// effort basis tiers down to plain traded volume — readingDefaultsFaceTheWayTheyCanDraw.sentinel).
export const FIRST_VISIT_ON: ReadonlySet<string> = new Set(["wm_ofLivingProfile", "wm_absorptionAnatomy"]);

/** The first-visit default for a layer switch's storage key. */
export function firstVisitOn(key: string): boolean {
  return FIRST_VISIT_ON.has(key);
}

/*
 * ONE RESET, ONCE PER DEVICE (Founder 2026-10-17, on his own phone: "my phone version don't look like this phone
 * version … vague, opaque lines scribbled in"). The first-visit set above only reaches a device that never saved a
 * choice; his phone still held every invention it had switched on before. On its next load each device forgets its
 * saved invention switches ONCE, at this epoch, and opens on the one-by-one view; what is switched on after that is
 * kept. Settings that are not inventions (extended hours, sessions, keys, the kill switch) are never in this list.
 */
export const LAYER_RESET_EPOCH = "2026-10-17";
export const LAYER_RESET_MARK = "wm_layerResetEpoch";
export const INVENTION_SWITCH_KEYS: readonly string[] = [
  "wm_absorptionAnatomy", "wm_bigtrades_on", "wm_breathRibbon", "wm_cvdNotch", "wm_deltaKeel", "wm_effortResponse",
  "wm_exhaustion", "wm_fixedVP", "wm_fp_enabled", "wm_ofAnatomyCards", "wm_ofBrickWalls", "wm_ofClarityCandle",
  "wm_ofCompositeProfile", "wm_ofContradiction", "wm_ofDeltaDivergence", "wm_ofDeltaLevels", "wm_ofDerivativesPressure",
  "wm_ofEffortMark", "wm_ofExpectedEnvelope", "wm_ofFlowCurrent", "wm_ofImbalanceStack", "wm_ofLiquidityLifecycle",
  "wm_ofLiquidityWeather", "wm_ofLivingProfile", "wm_ofMarketStructure", "wm_ofMemoryGhost", "wm_ofMtfAncestry",
  "wm_ofProfileDna", "wm_ofProfileFusion", "wm_ofProfileMemory", "wm_ofQuestionLens", "wm_ofRegimeLighting",
  "wm_ofRiskOnPrice", "wm_ofStructureProfile", "wm_ofTpoProfile", "wm_ofValueCandle", "wm_ofValueMigration",
  "wm_ofVisibleRangeProfile", "wm_rvolTone", "wm_sessionVP", "wm_wisdomLine",
];

type KeyStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Forget the device's saved invention switches once per epoch. Returns true when it reset. Never throws. */
export function resetInventionSwitchesOnce(store: KeyStore | null | undefined): boolean {
  try {
    if (!store || store.getItem(LAYER_RESET_MARK) === LAYER_RESET_EPOCH) return false;
    for (const k of INVENTION_SWITCH_KEYS) store.removeItem(k);
    store.setItem(LAYER_RESET_MARK, LAYER_RESET_EPOCH);
    return true;
  } catch { return false; }
}
