/**
 * LOCATE INVENTION — the seven states, compiled from the overlay's own receipts
 * (Founder's Garden 19 finish-line order §4, 2026-10-15).
 *
 * "ACTIVE" must mean the pipeline is running; "VISIBLE" must mean pixels were painted;
 * "NO CURRENT EVENT" must never be confused with broken data or a broken renderer. The
 * overlay already publishes a receipt per invention (`data-brick-walls`, `data-gamma-heatmap`,
 * `data-living-profile`, …) and names every silence. This owner reads those receipts — the same
 * strings the browser harness and the proof log read — and answers one of seven states per
 * invention, published as `data-invention-visibility = "ID:STATE|ID:STATE|…"`. Nothing painted
 * depends on it; a future "show me" control pans the camera from the OFF_CAMERA entries.
 *
 *   VISIBLE           the receipt says it painted on this camera
 *   OFF_CAMERA        it exists, but beyond the camera's edge (the edge chips name it)
 *   NO_EVENT          switched on, pipeline fine, nothing qualifying right now
 *   MISSING_EVIDENCE  switched on, its data source answered nothing it can use
 *   RENDER_FAULT      its layer threw (isolated and named by the painter)
 *   DISABLED          switched off by the trader
 *   UNSUPPORTED       the market cannot carry it (spot FX volume, no chain, …)
 */

export type InventionVisibility =
  | "VISIBLE" | "OFF_CAMERA" | "NO_EVENT" | "MISSING_EVIDENCE" | "RENDER_FAULT" | "DISABLED" | "UNSUPPORTED";

export type VisibilityReceipts = Readonly<Record<string, string | undefined>>;

const MISSING = /WAITING_FOR_EVIDENCE|WAITING_FOR_CHAIN|NO_CHAIN|TOO_FEW_CONTRACTS|NO_SPOT|NO_EXPOSURE|NO_LIVE|NOT_OWNER|NOT_CONNECTED|NO_SIGNED_EVIDENCE|NO_TRADED_VOLUME|FEWER_THAN_TWO_SPECIES|PROFILE_WITHHELD|WITHHELD/;
const UNSUPPORTED = /UNSUPPORTED|NO_CENTRAL_VOLUME|NOT_LISTED|SPOT_FX/;

/** One receipt → one state. `offCamera` is the companion "ABOVE:n|BELOW:n" receipt when the invention publishes one. */
export function visibilityOf(receipt: string | undefined, offCamera?: string, fault?: string): InventionVisibility {
  if (fault && fault.length > 0) return "RENDER_FAULT";
  if (receipt == null || receipt === "" || receipt === "OFF" || receipt === "FIELD_OFF") return "DISABLED";
  const r = receipt.toUpperCase();
  const beyond = !!offCamera && /ABOVE:[1-9]|BELOW:[1-9]|UP:[1-9]|DOWN:[1-9]/.test(offCamera);
  if (UNSUPPORTED.test(r)) return "UNSUPPORTED";
  // A named silence about the DATA (nothing usable arrived) comes before any "ON:" reading.
  if (/SILENT|SILENCE|REFUSED|WAITING|WITHHELD/.test(r) && MISSING.test(r)) return "MISSING_EVIDENCE";
  // Switched on, pipeline fine, nothing qualifying on this camera — or beyond its edge.
  if (/NO_CURRENT|NO_EVENT|NO_AGREEMENT|:NONE$|^NONE$|^ON:0$|^DRAWN:0\b|POS0:NEG0|^0$/.test(r)) return beyond ? "OFF_CAMERA" : "NO_EVENT";
  if (/SILENT|SILENCE|REFUSED/.test(r)) return "NO_EVENT";
  // Painted: a count, a DRAWN/MEASURED word, an ON: grade, a mark list ("CALL_OI@29725->…"), a slab.
  if (/^ON:|DRAWN|^MEASURED|^[1-9]\d*$|^SLAB:|^OPTFLOW:|^PRESSURE:|@\d/.test(r)) return "VISIBLE";
  return "NO_EVENT";
}

/** The inventions this compiler reads, each by its receipt key(s) on the overlay dataset. */
export const INVENTION_RECEIPTS: readonly { readonly id: string; readonly key: string; readonly offCamera?: string; readonly fault?: string }[] = [
  { id: "BRICK_WALLS", key: "brickWalls", offCamera: "brickWallsOffCamera", fault: "derivativesPressureFault" },
  { id: "DERIVATIVES_PRESSURE", key: "derivativesPressure", offCamera: "derivativesPressureOffCamera", fault: "derivativesPressureFault" },
  { id: "GAMMA_HEATMAP", key: "gammaHeatmap" },
  { id: "GAMMA_REGIONS", key: "gammaRegions" },
  { id: "CALL_PUT_WALLS", key: "optionWalls", offCamera: "wallsGammaEdge" },
  { id: "INDEX_MAPPED_WALLS", key: "indexMappedWalls" },
  { id: "LIVING_PROFILE", key: "livingProfile" },
  { id: "STRUCTURE_PROFILE", key: "structureProfile" },
  { id: "TPO_PROFILE", key: "tpoProfile" },
  { id: "COMPOSITE_PROFILE", key: "compositeProfile" },
  { id: "VISIBLE_RANGE_PROFILE", key: "visibleRangeProfile" },
  { id: "PROFILE_MEMORY", key: "profileMemory" },
  { id: "PROFILE_DNA", key: "profileDna" },
  { id: "PROFILE_FUSION", key: "profileFusion" },
  { id: "SESSION_VP", key: "vpDrawn" },
  { id: "FIXED_RANGE", key: "fixedRange" },
  { id: "BIG_TRADES", key: "bigTradesDrawn" },
  { id: "FVG", key: "fvg" },
  { id: "LIQUIDITY_WEATHER", key: "liquidityWeather" },
  { id: "OPTIONS_FLOW", key: "optionFlow" },
  { id: "VALUE_CANDLE", key: "valueCandle" },
  { id: "IMBALANCE_STACK", key: "imbalanceStack" },
  { id: "ABSORPTION", key: "absorptionDepthForm" },
];

/** Every listed invention's state, in the receipt order, as "ID:STATE|…". */
export function compileInventionVisibility(ds: VisibilityReceipts): string {
  const faultAll = ds.paintFault;
  return INVENTION_RECEIPTS.map(e => {
    const fault = (e.fault && ds[e.fault]) || faultAll;
    return `${e.id}:${visibilityOf(ds[e.key], e.offCamera ? ds[e.offCamera] : undefined, fault)}`;
  }).join("|");
}

/** Parse the published receipt back into a map (for the harness and the ticket). */
export function parseInventionVisibility(receipt: string): Readonly<Record<string, InventionVisibility>> {
  const out: Record<string, InventionVisibility> = {};
  for (const part of receipt.split("|")) {
    const i = part.lastIndexOf(":");
    if (i > 0) out[part.slice(0, i)] = part.slice(i + 1) as InventionVisibility;
  }
  return out;
}
