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
 */
export function profileEstWord(quality: string | null | undefined): string {
  return quality === "trade-based" ? "" : " · CANDLE-EST";
}
