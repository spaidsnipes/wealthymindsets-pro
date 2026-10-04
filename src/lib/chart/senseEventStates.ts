/**
 * NO SILENT NOTHING (Garden 17 master order §VIII, 2026-09-29).
 *
 * An active reading must end in one of: VISIBLE · NO EVENT · DATA UNSUPPORTED
 * · NOT ENTITLED · BROKEN. The Order Flow drawer said "DRAWING" for every
 * active reading, including Absorption when the chart's own receipt read
 * `MEASURED_NO_ZONES` — the human could not tell "on the glass" from "nothing
 * to show". This maps the chart's published receipts (the one truth of what
 * the frame painted) to the words the drawer shows. Pure: receipts in, words
 * out; a reading with no receipt yet gets no word (the drawer keeps its own).
 */

export const SENSE_ON_CAMERA = "ON CAMERA";
export const SENSE_NO_EVENT = "NO CURRENT EVENT";
export const SENSE_UNAVAILABLE = "UNAVAILABLE ON THIS FEED";
export const SENSE_NOT_ENTITLED = "NOT ENTITLED";
export const SENSE_BROKEN = "BROKEN / NOT WIRED";

/** Receipts are a DOMStringMap in the browser; a plain record in tests. */
export type Receipts = Readonly<Record<string, string | undefined>>;

export function senseEventStates(r: Receipts): Record<string, string> {
  const out: Record<string, string> = {};
  const zones = Number(r.absorptionZones ?? NaN);
  if (r.absorptionBasis === "UNMEASURED") out.ABSORPTION = SENSE_UNAVAILABLE;
  else if (Number.isFinite(zones)) out.ABSORPTION = zones > 0 ? `${SENSE_ON_CAMERA} · ${zones} ZONE${zones === 1 ? "" : "S"}` : SENSE_NO_EVENT;

  const stack = r.imbalanceStack;
  // Per-bar stacks (2026-10-04) are on the glass even when the window ladder is not.
  const barRuns = Number(/RUNS:(\d+)/.exec(r.imbalanceStackBars ?? "")?.[1] ?? 0);
  if (stack === "DRAWN" || barRuns > 0) out.IMBALANCE_STACK = barRuns > 0 && stack !== "DRAWN" ? `${SENSE_ON_CAMERA} · ${barRuns} STACK${barRuns === 1 ? "" : "S"}` : SENSE_ON_CAMERA;
  else if (stack === "NO_STACK") out.IMBALANCE_STACK = SENSE_NO_EVENT;
  else if (stack === "UNMEASURED") out.IMBALANCE_STACK = SENSE_UNAVAILABLE;

  const vc = r.valueCandle;
  if (vc === "DRAWN") out.VALUE_CANDLE = SENSE_ON_CAMERA;
  else if (vc === "UNMEASURED") out.VALUE_CANDLE = SENSE_UNAVAILABLE;

  const div = r.deltaDivergence;
  if (div === "DRAWN") out.DELTA_DIVERGENCE = SENSE_ON_CAMERA;
  else if (div === "NO_SWING" || div === "NONE") out.DELTA_DIVERGENCE = SENSE_NO_EVENT;
  else if (div === "UNMEASURED") out.DELTA_DIVERGENCE = SENSE_UNAVAILABLE;

  const wx = r.liquidityWeather;
  if (wx === "DRAWN") out.LIQUIDITY_WEATHER = SENSE_ON_CAMERA;
  else if (wx === "UNMEASURED") out.LIQUIDITY_WEATHER = SENSE_UNAVAILABLE;

  // Exhaustion and the founder anatomy events had no word (2026-10-04): the
  // Evidence Lineage rail counted them as observations while the glass held
  // nothing. `exhaustion` is the count drawn; `dualAnatomy` carries EVENTS:n.
  const ex = Number(r.exhaustion ?? NaN);
  if (Number.isFinite(ex)) out.EXHAUSTION = ex > 0 ? `${SENSE_ON_CAMERA} · ${ex}` : SENSE_NO_EVENT;
  const anat = /EVENTS:(\d+)/.exec(r.dualAnatomy ?? "");
  if (anat) out.ANATOMY_CARDS = Number(anat[1]) > 0 ? SENSE_ON_CAMERA : SENSE_NO_EVENT;

  const effort = r.effortMark;
  if (effort === "DRAWN") out.EFFORT_MARK = SENSE_ON_CAMERA;
  else if (effort === "UNREAD") out.EFFORT_MARK = SENSE_NO_EVENT;
  // A renderer fault overrides an older successful receipt from the same
  // frame. Fault text identifies the layer; it never proves missing entitlement.
  const faultOwners: Record<string, string> = {
    ABSORPTION_ANATOMY: "ABSORPTION", DUAL_ANATOMY: "ANATOMY_CARDS",
    VALUE_CANDLE: "VALUE_CANDLE", STACKED_IMBALANCE: "IMBALANCE_STACK",
    DELTA_DIVERGENCE: "DELTA_DIVERGENCE",
  };
  for (const [layer, id] of Object.entries(faultOwners)) {
    if (r.layerFaults?.includes(`${layer}:`)) out[id] = SENSE_BROKEN;
  }
  return out;
}

/** True when the drawer should say ACTIVE rather than DRAWING. */
export function senseIsQuiet(detail: string | undefined): boolean {
  return detail === SENSE_NO_EVENT || detail === SENSE_UNAVAILABLE || detail === SENSE_NOT_ENTITLED || detail === SENSE_BROKEN;
}
