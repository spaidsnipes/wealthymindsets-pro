/**
 * G16 §20 · A PROFILE SAYS HOW ITS VOLUME WAS KNOWN, ON THE GLASS.
 *
 * `vpEngine` builds a distribution one of two ways: from classified prints
 * (TRADE-BASED — each print placed at its price) or from bars (each bar's
 * volume spread evenly over its high–low — an ESTIMATE of where it traded).
 * Living and Structure already print "CANDLE-EST"; Composite and Visible
 * Range painted the same estimate without the word. One owner for the suffix,
 * so every species words it the same way. Unknown quality is not
 * "trade-based": it is labelled as the estimate it most likely is.
 *
 * Two forms from the ONE predicate: the caption suffix (" · CANDLE-EST") for a
 * species caption, and the short level tag ("POC EST") for a level chip whose
 * room is a few characters — Session / Fixed WM VP level names and Profile
 * Memory's S-n chips (all bar-built through computeProfileFromBars).
 */
export function profileIsEstimated(quality: string | null | undefined): boolean {
  return quality !== "trade-based";
}

export function profileEstWord(quality: string | null | undefined): string {
  return profileIsEstimated(quality) ? " · CANDLE-EST" : "";
}

/** A level's short name on a chip: "POC" when trade-based, "POC EST" when estimated. */
export function profileLevelTag(tag: string, quality: string | null | undefined): string {
  return profileIsEstimated(quality) ? `${tag} EST` : tag;
}
