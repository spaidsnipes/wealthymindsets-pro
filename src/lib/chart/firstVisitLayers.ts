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
