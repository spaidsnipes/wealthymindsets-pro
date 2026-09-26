/**
 * PROOF SCENE — a canon comparison you can open by URL, without touching the
 * trader's saved chart.
 *
 * GP12 §42: "CANON left. LIVE OS right. BUILD between them." Every canon
 * comparison needs one invention on the glass at a time, on a real symbol, at
 * a chosen depth. Until now that meant rewriting the trader's own saved layer
 * switches (localStorage) and restoring them afterwards — the Founder's chart
 * was the test bench. A proof scene is read from the URL instead:
 *
 *   /charts?symbol=TSLA&tf=15m&scene=clean&on=LivingProfile,TpoProfile
 *   /charts?symbol=BTC-USD&tf=1m&scene=clean&on=fp:big-trades&bars=18
 *
 *   scene=clean   every layer switch starts OFF for this page load
 *   on=…          switches turned ON for this load. Tokens:
 *                   <Name>        → wm_of<Name>      (LivingProfile, TpoProfile, …)
 *                   sessionVP | fixedVP | absorptionAnatomy
 *                   fp:<mode>     → footprint on, that mode (bid-ask, delta,
 *                                   volume-profile, imbalance, aggressive-passive, big-trades)
 *                   scaff:<depth> → scaffolding depth (FOUNDATION, INTERMEDIATE, ADVANCED, OFF)
 *                   ask:<choice>  → the Question Lens's asked question (AUTO, ABSORPTION,
 *                                   EXHAUSTION, CONTINUATION, TRAP, HOLD, WHAT_CHANGED,
 *                                   PERMISSION) — pair with QuestionLens
 *   bars=N        the camera opens on the newest N bars (semantic depth by bar count)
 *   ind=A,B       the classic indicator set for this load (names as the
 *                 indicator menu lists them: VWAP, EMA 21, RSI, MACD, …);
 *                 with scene=clean and no ind= the set is empty
 *   select=K      Inspect opens by URL on ONE thing (GP12 §68, INSPECT = TRUTH
 *                 MICROSCOPE), through the room's one selection owner, once per
 *                 page load after the thing exists:
 *                   zone     → the compiled ZONE object nearest price (F11B Passport)
 *                   level    → the compiled LEVEL object nearest price (Passport)
 *                   bar      → the newest CLOSED bar (F05B candle anatomy)
 *                   bigtrade → the largest Big Trade disc/cluster drawn (F07B)
 *                 Unknown words are ignored. The receipt is on <html>:
 *                 data-proof-select="<kind>:<id>" | "<kind>:NONE_AVAILABLE"
 *                 (also "<kind>:PENDING" while waiting, "<kind>:RELEASED" once let go).
 *                 There is no ghost selection: the Memory Ghost is a section of
 *                 the bar ticket, so select=bar shows it.
 *
 * While a proof scene is open NOTHING is written back: layer switches, the last
 * symbol and every other persisted chart preference stay exactly as the trader
 * left them. Drop the parameters and reload to return to the saved chart.
 */

export const SCENE_PARAM = "scene";
export const ON_PARAM = "on";
export const BARS_PARAM = "bars";
export const INDICATORS_PARAM = "ind";
export const SELECT_PARAM = "select";

/** What a proof scene may open Inspect on. */
export const PROOF_SELECT_KINDS = ["zone", "level", "bar", "bigtrade"] as const;
export type ProofSelectKind = (typeof PROOF_SELECT_KINDS)[number];

/** Layer switches a clean scene turns off (booleans), plus the non-boolean scaffolding depth. */
const CLEAN_BOOLEAN_PREFIX = "wm_of";
const CLEAN_EXTRA_OFF = ["wm_fp_enabled", "wm_absorptionAnatomy", "wm_sessionVP", "wm_fixedVP"] as const;
const SCAFFOLDING_KEY = "wm_ofScaffolding";
/** What the trader asked of the Question Lens (ChartsDashboard's own key). */
const QUESTION_CHOICE_KEY = "wm_questionChoice";
const NON_BOOLEAN_OF_KEYS = new Set([SCAFFOLDING_KEY, "wm_ofStackPrefs", "wm_ofMyStack"]);
const PLAIN_TOGGLES = new Set(["sessionVP", "fixedVP", "absorptionAnatomy"]);

export interface ProofScene {
  readonly active: boolean;
  readonly clean: boolean;
  /** Explicit storage-key → value overrides for this page load. */
  readonly overrides: Readonly<Record<string, unknown>>;
  /** Newest N bars on camera, or null to keep the chart's own camera. */
  readonly bars: number | null;
  /** What Inspect opens on for this load, or null. */
  readonly select: ProofSelectKind | null;
}

export const NO_PROOF_SCENE: ProofScene = { active: false, clean: false, overrides: {}, bars: null, select: null };

export function parseProofScene(search: string): ProofScene {
  let q: URLSearchParams;
  try { q = new URLSearchParams(search); } catch { return NO_PROOF_SCENE; }
  const clean = q.get(SCENE_PARAM) === "clean";
  const onRaw = q.get(ON_PARAM);
  const barsRaw = q.get(BARS_PARAM);
  const indRaw = q.get(INDICATORS_PARAM);
  const barsN = barsRaw != null ? Math.round(Number(barsRaw)) : NaN;
  const bars = Number.isFinite(barsN) && barsN >= 5 && barsN <= 5000 ? barsN : null;
  const selectRaw = (q.get(SELECT_PARAM) ?? "").trim().toLowerCase();
  const select = (PROOF_SELECT_KINDS as readonly string[]).includes(selectRaw) ? selectRaw as ProofSelectKind : null;
  if (!clean && !onRaw && bars == null && indRaw == null && select == null) return NO_PROOF_SCENE;

  const overrides: Record<string, unknown> = {};
  if (indRaw != null) overrides.wm_activeInds = indRaw.split(",").map(t => t.trim()).filter(Boolean);
  else if (clean) overrides.wm_activeInds = [];
  for (const token of (onRaw ?? "").split(",").map(t => t.trim()).filter(Boolean)) {
    if (/^fp:/i.test(token)) {
      overrides.wm_fp_enabled = true;
      overrides.wm_footprint = token.slice(3);
    } else if (/^scaff:/i.test(token)) {
      overrides[SCAFFOLDING_KEY] = token.slice(6).toUpperCase();
    } else if (/^ask:/i.test(token)) {
      // The room validates the id against QUESTION_CHOICES; an unknown one reads AUTO.
      overrides[QUESTION_CHOICE_KEY] = token.slice(4).toUpperCase();
    } else if (PLAIN_TOGGLES.has(token)) {
      overrides[`wm_${token}`] = true;
    } else if (/^[A-Z][A-Za-z]+$/.test(token)) {
      overrides[`${CLEAN_BOOLEAN_PREFIX}${token}`] = true;
    }
  }
  return { active: true, clean, overrides, bars, select };
}

/**
 * The value a persisted chart preference should load with under `scene`, or
 * `undefined` when the scene has no opinion (the saved value stands).
 */
export function proofSceneValue(scene: ProofScene, key: string): unknown {
  if (!scene.active) return undefined;
  if (Object.prototype.hasOwnProperty.call(scene.overrides, key)) return scene.overrides[key];
  if (!scene.clean) return undefined;
  if (key === SCAFFOLDING_KEY) return "OFF";
  if ((CLEAN_EXTRA_OFF as readonly string[]).includes(key)) return false;
  if (key.startsWith(CLEAN_BOOLEAN_PREFIX) && !key.startsWith("wm_of_") && !NON_BOOLEAN_OF_KEYS.has(key)) return false;
  return undefined;
}

let cached: { search: string; scene: ProofScene } | null = null;
/** The scene of the current page (browser only), cached per URL search string. */
export function currentProofScene(): ProofScene {
  if (typeof window === "undefined") return NO_PROOF_SCENE;
  const search = window.location.search;
  if (cached && cached.search === search) return cached.scene;
  cached = { search, scene: parseProofScene(search) };
  return cached.scene;
}

/** True while a proof scene is open: nothing may be written back to saved preferences. */
export function proofSceneHoldsWrites(): boolean {
  return currentProofScene().active;
}

/** The geometry a proof selection reads from a compiled market object. */
export interface ProofSelectObject {
  readonly objectId: string;
  readonly kind: string;
  readonly priceLow: number;
  readonly priceHigh: number;
}

/**
 * `select=zone|level`: the compiled object of that kind nearest `price` (0
 * inside its band); the first compiled wins a tie. Null when none is compiled —
 * never a guess at another kind.
 */
export function pickProofSelectObject(
  objects: readonly ProofSelectObject[],
  kind: "ZONE" | "LEVEL",
  price: number,
): string | null {
  if (!Number.isFinite(price)) return null;
  let best: { id: string; d: number } | null = null;
  for (const o of objects) {
    if (o.kind !== kind || !Number.isFinite(o.priceLow) || !Number.isFinite(o.priceHigh)) continue;
    const lo = Math.min(o.priceLow, o.priceHigh), hi = Math.max(o.priceLow, o.priceHigh);
    const d = price < lo ? lo - price : price > hi ? price - hi : 0;
    if (best === null || d < best.d) best = { id: o.objectId, d };
  }
  return best?.id ?? null;
}

/** `select=bar`: the newest bar that has CLOSED (the forming bar is skipped), or null. */
export function pickNewestClosedBar<T extends { readonly time: number }>(
  bars: readonly T[],
  isForming: (time: number) => boolean,
): T | null {
  for (let i = bars.length - 1; i >= 0; i--) {
    if (!isForming(Number(bars[i].time))) return bars[i];
  }
  return null;
}

export type ProofSelectReceiptState = "PENDING" | "NONE_AVAILABLE" | "RELEASED";

/** The receipt on <html data-proof-select>: `<kind>:<id>` or `<kind>:<STATE>`. */
export function proofSelectReceipt(kind: ProofSelectKind, idOrState: string): string {
  return `${kind}:${idOrState}`;
}
