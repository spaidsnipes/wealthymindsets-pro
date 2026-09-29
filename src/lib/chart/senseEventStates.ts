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

/** Receipts are a DOMStringMap in the browser; a plain record in tests. */
export type Receipts = Readonly<Record<string, string | undefined>>;

export function senseEventStates(r: Receipts): Record<string, string> {
  const out: Record<string, string> = {};
  const zones = Number(r.absorptionZones ?? NaN);
  if (Number.isFinite(zones)) out.ABSORPTION = zones > 0 ? `${SENSE_ON_CAMERA} · ${zones} ZONE${zones === 1 ? "" : "S"}` : SENSE_NO_EVENT;

  const stack = r.imbalanceStack;
  if (stack === "DRAWN") out.IMBALANCE_STACK = SENSE_ON_CAMERA;
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

  const effort = r.effortMark;
  if (effort === "DRAWN") out.EFFORT_MARK = SENSE_ON_CAMERA;
  else if (effort === "UNREAD") out.EFFORT_MARK = SENSE_NO_EVENT;
  return out;
}

/** True when the drawer should say ACTIVE rather than DRAWING. */
export function senseIsQuiet(detail: string | undefined): boolean {
  return detail === SENSE_NO_EVENT || detail === SENSE_UNAVAILABLE;
}
