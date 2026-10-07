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

import { NEEDS_TRADED_VOLUME, needsTradedVolumeWords } from "./volumeTruth";

export const SENSE_ON_CAMERA = "ON CAMERA";
export const SENSE_NO_EVENT = "NO CURRENT EVENT";
export const SENSE_UNAVAILABLE = "UNAVAILABLE ON THIS FEED";
export const SENSE_NOT_ENTITLED = "NOT ENTITLED";
export const SENSE_BROKEN = "BROKEN / NOT WIRED";

/**
 * Every Tools switch that reads TRADED VOLUME (or its aggressor side). On a
 * market with no central volume (spot FX, spot metals) each of these is in
 * the NEEDS TRADED VOLUME state whatever its own receipt says — its receipt
 * would otherwise read NO CURRENT EVENT / WAITING and promise an event the
 * market cannot produce (FX lane, 2026-10-06). Price-only and time-only tools
 * (TPO, Structure Profile, Clarity Candle, Market Structure, …) are absent.
 */
export const VOLUME_READING_SENSES: ReadonlySet<string> = new Set([
  "FIXED_RANGE", "SESSION", "DELTA_VP", "ABSORPTION", "EXHAUSTION", "ANATOMY_CARDS",
  "IMBALANCE_STACK", "VALUE_CANDLE", "FLOW_CURRENT", "DELTA_DIVERGENCE", "LIQUIDITY_WEATHER",
  "EFFORT_MARK", "DELTA_LEVELS", "LIVING_PROFILE", "PROFILE_DNA", "VALUE_MIGRATION",
  "PROFILE_MEMORY", "COMPOSITE_PROFILE", "VISIBLE_RANGE_PROFILE", "ANCHORED_RANGE",
  "LIQUIDITY_LIFECYCLE",
]);

/** Receipts are a DOMStringMap in the browser; a plain record in tests. */
export type Receipts = Readonly<Record<string, string | undefined>>;

export function senseEventStates(r: Receipts, market?: { readonly symbol?: string | null }): Record<string, string> {
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

  // Clarity + Flow Current had no word, so the drawer read "ACTIVE ·
  // AVAILABLE" while both were painting (Founder's Chrome, 2026-10-04).
  if ((r.clarityCandle ?? "").startsWith("DRAWN")) out.CLARITY_CANDLE = SENSE_ON_CAMERA;
  const flowShown = /SHOWN:(\d+)/.exec(r.flowCurrent ?? "");
  if (flowShown) out.FLOW_CURRENT = Number(flowShown[1]) > 0 ? `${SENSE_ON_CAMERA} · ${flowShown[1]} BARS` : SENSE_NO_EVENT;
  else if (r.flowCurrent === "NO_SIDED_TAPE" || r.flowCurrent === "NO_SIDED_BARS_IN_VIEW") out.FLOW_CURRENT = SENSE_UNAVAILABLE;

  const effort = r.effortMark;
  if (effort === "DRAWN") out.EFFORT_MARK = SENSE_ON_CAMERA;
  // ORDINARY:<why> = the mark read the bar and found nothing remarkable (2026-10-04).
  else if (effort === "UNREAD" || (effort ?? "").startsWith("ORDINARY")) out.EFFORT_MARK = SENSE_NO_EVENT;
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

  // Options positioning (Derivatives Pressure / Brick Walls) had no word, so
  // on a market with no option chain (spot FX: "PRESSURE:SILENT:UNSUPPORTED",
  // "ON:SILENT:NO_CHAIN") the Evidence Lineage rail counted both as
  // observations while the glass said "no option positioning" (2026-10-06).
  const dp = r.derivativesPressure ?? "";
  if (/^PRESSURE:SILENT:(UNSUPPORTED|NO_CHAIN|NO_SPOT)/.test(dp)) out.DERIVATIVES_PRESSURE = SENSE_UNAVAILABLE;
  else if (dp.startsWith("PRESSURE:SILENT:")) out.DERIVATIVES_PRESSURE = SENSE_NO_EVENT;
  const walls = r.brickWalls ?? "";
  if (/^ON:SILENT:(UNSUPPORTED|NO_CHAIN|NO_SPOT)/.test(walls)) out.BRICK_WALLS = SENSE_UNAVAILABLE;
  else if (walls.startsWith("ON:SILENT:") || walls === "ON:NO_CURRENT_WALL_EVENT") out.BRICK_WALLS = SENSE_NO_EVENT;
  else if (/^ON:\d+$/.test(walls)) out.BRICK_WALLS = SENSE_ON_CAMERA;

  // Profile Fusion with fewer than two species on fuses nothing (serving
  // EURUSD 5m, 2026-10-06: "PROFILE FUSION · silent" on the glass while the
  // Evidence Lineage counted it as an AUCTION observation).
  const fusion = r.profileFusion ?? "";
  if (fusion === "DRAWN") out.PROFILE_FUSION = SENSE_ON_CAMERA;
  else if (fusion === "FEWER_THAN_TWO_SPECIES" || fusion === "NO_AGREEMENT") out.PROFILE_FUSION = SENSE_NO_EVENT;

  // NEEDS TRADED VOLUME (FX lane, 2026-10-06): on a market with no central
  // volume every volume-reading sense says so, outranking NO CURRENT EVENT
  // and UNAVAILABLE ON THIS FEED — no feed could answer it.
  const needs = market?.symbol ? needsTradedVolumeWords(market.symbol) : null;
  if (needs) for (const id of VOLUME_READING_SENSES) out[id] = needs;
  return out;
}

/** True when the drawer should say ACTIVE rather than DRAWING. */
export function senseIsQuiet(detail: string | undefined): boolean {
  return detail === SENSE_NO_EVENT || detail === SENSE_UNAVAILABLE || detail === SENSE_NOT_ENTITLED || detail === SENSE_BROKEN
    || senseNeedsTradedVolume(detail);
}

/** True for the NEEDS TRADED VOLUME state (a market with no central volume). */
export function senseNeedsTradedVolume(detail: string | undefined): boolean {
  return (detail ?? "").startsWith(NEEDS_TRADED_VOLUME);
}
