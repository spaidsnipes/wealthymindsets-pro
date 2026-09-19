/**
 * THE MARKET FIELD'S MATERIAL — one constant, one owner.
 *
 * ── WHY THIS MODULE EXISTS ────────────────────────────────────────────────
 * The room is warm obsidian. The masthead, the equipment doors, the decision
 * rail and the provenance plate all stand on `#07080a` (see the `FIELD` token
 * in `components/os/WMOperatingSystem.tsx`). The candles did not: the chart
 * shipped on `#0B0E1A`, a COLD NAVY inherited from the pre-OS charting build.
 *
 * MEASURED LIVE on production, /charts at 1920 wide, before this change: the
 * OS chrome above and below the canvas read warm near-black while the canvas
 * itself read blue-grey. One room, two materials, a visible seam across the
 * full width of the largest surface in the product. That is the single
 * loudest reason the live app did not read as the OS in the Canon mockups.
 *
 * ── THE REASON A DEFAULT CHANGE ALONE WOULD HAVE DONE NOTHING ─────────────
 * `ChartsDashboard` persists the WHOLE settings object on every change:
 *
 *   useEffect(() => { lsSet("wm_chartSettings", chartSettings); }, [chartSettings]);
 *
 * and rehydrates as `{ ...DEFAULT_CHART_SETTINGS, ...stored }`. So the moment
 * a trader toggled ANY unrelated setting — the grid, the clock, a candle
 * colour — every untouched default was frozen into their localStorage as an
 * explicit value. MEASURED LIVE in the founder's own browser before this
 * change, `wm_chartSettings` began:
 *
 *   {"background":"#0B0E1A","gridVisible":true,"gridColor":"#1A2035",...}
 *
 * He never picked that navy. Nobody did. But because it sits in storage as a
 * concrete value, the spread puts it on the RIGHT of the defaults and it wins
 * forever. Under that persistence shape a product default is write-once: it
 * can be set on the day the key is introduced and never improved again.
 *
 * `migrateMarketField` is the narrow cure. It runs on read, it only ever
 * touches a `background` that is STILL byte-identical to the legacy default —
 * i.e. a value the trader demonstrably never moved — and it is stamped so it
 * cannot run twice and cannot stomp a later deliberate choice.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT DO ────────────────────────────────────
 * It never REWRITES a value; it only ever DELETES one that is still
 * byte-identical to a superseded product default, which is the only evidence
 * available that the trader never moved it. Anything else in storage — a
 * colour they picked, a value from a build whose default differed — survives
 * untouched. And each rung is stamped independently, so a rung added later
 * cannot re-run an earlier one over a choice made in between.
 *
 * ── WHY ONE MODULE AND NOT TWO ────────────────────────────────────────────
 * The field's material and the chart's language are different subjects, and
 * a `candleLanguage.ts` would read tidier. They share ONE stored object and
 * ONE version stamp, though, and a version ladder split across two files is
 * a ladder that will eventually grow two rungs numbered 3. The stamp owns
 * the module boundary.
 */

/** The room's material. Byte-identical to `FIELD` in WMOperatingSystem.tsx. */
export const MARKET_FIELD_DEFAULT = "#07080a";

/**
 * The cold navy the chart shipped on before the OS. Kept as a NAMED constant
 * rather than a loose literal so the migration below can only ever recognise
 * the one exact value it is licensed to replace.
 */
export const LEGACY_MARKET_FIELD = "#0B0E1A";

/* ── THE CHART'S LANGUAGE ────────────────────────────────────────────────────
 *
 * GOVERNING VISUAL: `WM_NewMockup_136_Fidelity_Five_Not_A_Rainbow.jpg` in the
 * Drive Visual Canon — opened and read at 1568 wide before these values were
 * chosen, per RULE ZERO. In it EVERY bar on the TSLA daily is brass. Up and
 * down are separated by VALUE, not by hue. There is no green anywhere in the
 * frame and no red anywhere in the frame. The mockup's own filename is the
 * law: NOT A RAINBOW.
 *
 * Live /charts shipped the opposite — `#00C076` / `#FF4D67`, the stock
 * TradingView casino pair, sitting inside a masthead that says A TRADING
 * SANCTUARY in warm brass. That contradiction is the loudest thing left on
 * the widest surface in the product now that the field material is fixed.
 *
 * WHERE THE NUMBERS COME FROM. They are not eyedropped from a JPEG — a JPEG
 * is lossy and an eyedropper would mint a NINTH slightly-wrong brass. They
 * are the room's own tokens, read from `components/os/WMOperatingSystem.tsx`:
 * `GOLD` for full-strength brass and `MUTED` for the recessed voice. The
 * DOWN bar is that same brass hue (~37°) held at roughly 45% of the UP bar's
 * luminance, so the two read as one material in two states rather than as two
 * materials.
 *
 * AND IT IS MORE LEGIBLE, NOT LESS. Red/green is the single worst pairing in
 * common use for the ~8% of men with a red-green deficiency: it encodes the
 * most important distinction on the screen in the one channel they cannot
 * read. A luminance pair survives that, survives greyscale printing, and
 * survives a screenshot pasted into the journal. This is the rare case where
 * the Canon's aesthetic and the accessibility answer are the same answer.
 *
 * THESE MUST STAY HEX. `ChartSettingsModal` feeds each of them to an
 * `<input type="color">`, which silently rejects `rgba()` and reports back an
 * empty string. A `rgba(196,165,116,0.10)` grid would look right on the
 * canvas and then blank the swatch in Appearance.
 */

/** Full-strength brass — the room's `GOLD` token. */
export const CANDLE_UP_DEFAULT = "#c4a574";
/** The same brass hue, recessed. Down is darker, never a different colour. */
export const CANDLE_DOWN_DEFAULT = "#6e5a3c";
/** A warm structural rule that reads on obsidian without competing with price. */
export const GRID_COLOR_DEFAULT = "#211d14";
/** The room's `MUTED` token — the crosshair is chrome, not a market claim. */
export const CROSSHAIR_COLOR_DEFAULT = "#8a8271";

/* ── VOLUME — THE ONE PLACE rgba() IS CORRECT ───────────────────────────────
 *
 * The governing mockup has NO volume pane, so the Canon does not dictate these
 * two values directly. What it dictates is the LAW, and the law is the
 * filename: no green anywhere in the frame, no red anywhere in the frame. Live
 * /charts had a brass price series sitting directly on top of a red-and-green
 * volume histogram — the rainbow simply moved one pane down.
 *
 * VOLUME IS NOT A PRICE CLAIM. It is magnitude — how much traded, not what the
 * market decided. So it takes the same brass as price, held back with alpha so
 * it recedes beneath the bars it belongs to instead of competing with them.
 * The up/down split is retained because it is real information, but it is
 * carried by the SAME two-luminance pair price uses, so the eye reads one
 * material in two states across both panes rather than two vocabularies.
 *
 * AND THESE ARE rgba(), WHICH IS THE OPPOSITE OF THE RULE ABOVE. The hex rule
 * exists because `ChartSettingsModal` feeds the candle palette to an
 * `<input type="color">`, which silently rejects a non-hex value and blanks
 * the swatch. Volume has NO Appearance control — there is no `volumeUp` key in
 * `ChartSettings` and no swatch to blank — so alpha is available here and
 * nowhere else. That asymmetry is stated rather than left for someone to
 * rediscover by blanking a control.
 */

/** Brass, well back — volume recedes beneath the price it belongs to. */
export const VOLUME_UP_DEFAULT = "rgba(196,165,116,0.38)";
/** The recessed brass, needing more alpha to read at all at this luminance. */
export const VOLUME_DOWN_DEFAULT = "rgba(110,90,60,0.62)";

/* ── THE VOLUME PROFILE — THE FOURTH COPY OF THE RAINBOW ────────────────────
 *
 * The VP shelves, the POC line and the two value-area boundaries carried their
 * OWN palette, in their OWN localStorage keys (`wm_vp_up` … `wm_vp_val`),
 * defaulted in FIVE separate places: a `useState` initialiser and a
 * `localStorage.getItem(…) || "…"` fallback in `ChartsDashboard`'s VPColorGear,
 * a `useRef` initialiser and a `??` fallback in `MainChart`, and a "Reset all
 * VP colors" button that WROTE the casino literals back into storage. Five
 * owners of one decision, none of them the room.
 *
 * MEASURED LIVE, 2026-09-19: the price-axis canvas on the serving build still
 * carried `255,77,106` over 508 px — a solid `#FF4D67` tag — after the candles
 * and the volume histogram had both gone brass. The Founder's storage held no
 * `wm_vp_dn` at all, so the literal on line 209 of `ChartsDashboard` was the
 * thing painting it. The rainbow had simply moved one series across.
 *
 * UP AND DOWN ARE ALIASES, NOT NEW VALUES. A VP shelf is the same claim a
 * candle makes — traded-up versus traded-down — so it is the same material in
 * the same two states. Minting a sixth brass here would be the exact mistake
 * this module exists to prevent, so these POINT AT the candle owner rather
 * than restating its value.
 */

/** A buy-dominant shelf is the same material an up candle is. */
export const VP_UP_DEFAULT = CANDLE_UP_DEFAULT;
/** A sell-dominant shelf is the same material a down candle is. */
export const VP_DOWN_DEFAULT = CANDLE_DOWN_DEFAULT;
/**
 * The Point of Control — the room's `PEARL`. POC is NOT a direction claim, it
 * is the single loudest price in the profile, so it takes the brightest token
 * in the room rather than a third brass that would blend into the shelves it
 * is supposed to name.
 */
export const VP_POC_DEFAULT = "#ede6d3";
/**
 * Both value-area boundaries — the room's `MUTED`. VAH and VAL are ONE idea
 * (where the value area ends) seen twice, and each is already labelled "VAH"
 * or "VAL" on the canvas, so the label carries the identity and the colour
 * does not need to. Blue-for-high and purple-for-low were two more hues in a
 * room that has one.
 */
export const VP_VALUE_AREA_DEFAULT = "#8a8271";

/** The pre-OS VP palette. Named so the migration can only free these. */
export const LEGACY_VP_POC = "#F0B429";
export const LEGACY_VP_VAH = "#2563EB";
export const LEGACY_VP_VAL = "#8B5CF6";

/** The pre-OS TradingView pair. Named so the migration can only free these. */
export const LEGACY_CANDLE_UP = "#00C076";
export const LEGACY_CANDLE_DOWN = "#FF4D67";
export const LEGACY_GRID_COLOR = "#1A2035";
export const LEGACY_CROSSHAIR_COLOR = "#4A6080";

/** Bump when a future migration needs to run once over stored settings. */
export const CHART_SETTINGS_SCHEMA_VERSION = 3;

/** The shape this module needs; intentionally narrower than `ChartSettings`. */
export type StoredChartSettings = {
  background?: string;
  wmSchemaVersion?: number;
  [key: string]: unknown;
};

/**
 * The keys the v3 step is licensed to free, each paired with the ONE legacy
 * value it may recognise. A key whose stored value is anything else — because
 * the trader picked it, or because a previous product default differed — is
 * left exactly as found.
 */
const LEGACY_CHART_LANGUAGE: ReadonlyArray<readonly [key: string, legacy: string]> = [
  ["candleUp", LEGACY_CANDLE_UP],
  ["candleDown", LEGACY_CANDLE_DOWN],
  ["wickUp", LEGACY_CANDLE_UP],
  ["wickDown", LEGACY_CANDLE_DOWN],
  ["borderUp", LEGACY_CANDLE_UP],
  ["borderDown", LEGACY_CANDLE_DOWN],
  ["gridColor", LEGACY_GRID_COLOR],
  ["crosshairColor", LEGACY_CROSSHAIR_COLOR],
];

/**
 * Free stored values that are STILL byte-identical to a superseded product
 * default, so the current default can apply, then stamp the schema version.
 *
 * ── THIS IS A LADDER, NOT A SWITCH ────────────────────────────────────────
 * Each step is gated on ITS OWN version, not on the current one. A single
 * `stored.version >= CURRENT` gate looks equivalent and is not: bumping to 3
 * would re-open the v2 step for every trader already stamped at 2, and a
 * trader who migrated to 2 and THEN deliberately re-picked the old navy in
 * Appearance would have that choice silently stripped by the v3 pass. The
 * whole point of stamping was that a migration runs exactly once. Adding a
 * rung must not un-stamp the rungs below it.
 *
 * Returns a NEW object; the input is never mutated. Callers spread the result
 * over `DEFAULT_CHART_SETTINGS`, so a dropped key simply falls through to the
 * canonical default rather than becoming `undefined`.
 */
export function migrateMarketField(stored: StoredChartSettings): StoredChartSettings {
  const next: StoredChartSettings = { ...stored };
  const from = next.wmSchemaVersion ?? 1;

  // v2 — the market field's material.
  if (from < 2 && next.background === LEGACY_MARKET_FIELD) {
    // Not `= MARKET_FIELD_DEFAULT`. Deleting the key keeps ONE owner of the
    // default — `DEFAULT_CHART_SETTINGS` — instead of minting a second copy
    // of the value inside every trader's storage, which is the exact shape
    // that made this migration necessary in the first place.
    delete next.background;
  }

  // v3 — the chart's language. Same deletion rule, same one-value licence.
  if (from < 3) {
    for (const [key, legacy] of LEGACY_CHART_LANGUAGE) {
      if (next[key] === legacy) delete next[key];
    }
  }

  next.wmSchemaVersion = CHART_SETTINGS_SCHEMA_VERSION;
  return next;
}

/* ── THE VP PALETTE'S OWN LADDER ────────────────────────────────────────────
 *
 * The VP palette does NOT live in `wm_chartSettings`. It is five FLAT keys —
 * `wm_vp_up`, `wm_vp_dn`, `wm_vp_poc`, `wm_vp_vah`, `wm_vp_val` — so
 * `migrateMarketField` cannot reach it however much it is bumped. Hence a
 * second, deliberately separate stamp: `wm_vp_schemaVersion`.
 *
 * WHY A MIGRATION IS NEEDED AT ALL WHEN THE KEYS ARE USUALLY ABSENT. Unlike
 * the settings object, nothing writes these keys wholesale — they appear only
 * when a trader touches the gear. That would make a migration pointless,
 * except for one control: "Reset all VP colors" wrote the casino literals
 * back into storage EXPLICITLY. Anyone who ever asked the product for its own
 * defaults is now holding five frozen values that outrank every future
 * default. Same write-once trap, same narrow cure, same single licence: a key
 * is freed ONLY while it is still byte-identical to the superseded literal.
 *
 * A key that is absent stays absent. A key holding anything else — a colour
 * the trader picked, a value from a build whose default differed — is left
 * exactly as found.
 */
/* ── THE MOVING AVERAGES — THE FIFTH COPY OF THE RAINBOW ────────────────────
 *
 * GOVERNING VISUAL: the same `WM_NewMockup_136_Fidelity_Five_Not_A_Rainbow.jpg`
 * that governs the candles. Its filename is still the law.
 *
 * MEASURED LIVE, 2026-09-19, on the serving build AFTER the candles, the
 * volume histogram and the VP palette had all gone brass: the 1490×389 price
 * pane still carried `79,163,224` (blue, 406 px), `100,70,131` (violet,
 * 534 px) and `255,165,0` (orange, 394 px). The Founder's active indicator
 * set was `["Anchored VWAP","EMA 8","EMA 21","EMA 89"]`, and `MA_CFG` in
 * `MainChart` assigned those exactly `#C084FC`, `#4FA3E0` and `#FFA500`. Three
 * hues, three different materials, sitting on a brass chart. The rainbow had
 * moved a fourth time — out of the series and into the overlays.
 *
 * `MA_CFG` held NINETEEN hand-picked hues: violet, lilac, purple, two blues,
 * gold, two oranges, casino red, mint, three teals, lavender, jade, pink,
 * rose, lime. No two of them agreed on anything, and none of them was a token
 * of this room.
 *
 * ── WHY A RAMP AND NOT NINETEEN BETTER COLOURS ────────────────────────────
 * Hue encodes KIND. Every moving average is the same kind of thing: the same
 * price, remembered over a different depth. Encoding "EMA" vs "SMA" vs "HMA"
 * in hue spends the loudest channel on the least important distinction — the
 * legend already carries the name, exactly as VAH/VAL do above — while leaving
 * the distinction that actually matters at a glance, HOW FAR BACK this line
 * remembers, encoded in nothing at all.
 *
 * So depth takes luminance. A fast average sits near the price and reads
 * bright; a slow one sits deep in the room and recedes. Two lines of similar
 * period therefore read as similar, which is true — an EMA 8 and an SMA 9 ARE
 * nearly the same claim, and nineteen hues spent real ink insisting otherwise.
 *
 * ── WHY IT IS A FUNCTION AND NOT A TABLE ──────────────────────────────────
 * `MA_CFG` is not the only source of periods. Every entry can be overridden
 * per-trader via `indSettings` (`cp.length ?? p`), so a table keyed by the
 * nineteen shipped periods would hand an EMA-8 colour to a line the trader had
 * re-pointed at 150 bars. The ramp is defined over the period itself, so an
 * override lands at the depth it actually represents.
 *
 * LOG SCALE, because the periods do not run linearly — 8, 9, 13, 21, 34, 50,
 * 89, 144, 200. Half of them live below 40. On a linear ramp those nine would
 * collapse into one value and the top of the range would be empty.
 *
 * A trader's explicit `cp.color` still wins at the call site. This only
 * replaces what the PRODUCT chose on their behalf.
 */

/** The nearest, fastest average — the room's `PEARL`. */
export const MA_INK_NEAR = "#ede6d3";
/** The deepest, slowest average — the recessed brass the down candle uses. */
export const MA_INK_DEEP = "#6e5a3c";
/** Periods at or below this take `MA_INK_NEAR` exactly. */
export const MA_PERIOD_NEAR = 8;
/** Periods at or above this take `MA_INK_DEEP` exactly. */
export const MA_PERIOD_DEEP = 200;

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

/**
 * The ink a moving average of `period` bars is drawn in.
 *
 * Returns HEX, never `rgba()`. These values reach `addLine` today, but the
 * per-indicator colour override in `indSettings` is edited through an
 * `<input type="color">` in the indicator settings UI, and seeding that
 * control with a non-hex value blanks it — the same trap documented for the
 * candle palette above.
 *
 * A non-finite or non-positive period cannot be placed on the ramp, so it
 * takes the near end rather than producing `NaN` and painting nothing.
 */
export function movingAverageInk(period: number): string {
  if (!Number.isFinite(period) || period <= 0) return MA_INK_NEAR;
  const lo = Math.log(MA_PERIOD_NEAR);
  const hi = Math.log(MA_PERIOD_DEEP);
  const t = Math.min(1, Math.max(0, (Math.log(period) - lo) / (hi - lo)));
  const a = hexToRgb(MA_INK_NEAR);
  const b = hexToRgb(MA_INK_DEEP);
  return `#${toHex(a[0] + (b[0] - a[0]) * t)}${toHex(a[1] + (b[1] - a[1]) * t)}${toHex(a[2] + (b[2] - a[2]) * t)}`;
}

export const VP_PALETTE_SCHEMA_VERSION = 1;

/** The stamp key. Flat, like the palette it guards. */
export const VP_PALETTE_VERSION_KEY = "wm_vp_schemaVersion";

const LEGACY_VP_PALETTE: ReadonlyArray<readonly [key: string, legacy: string]> = [
  ["wm_vp_up", LEGACY_CANDLE_UP],
  ["wm_vp_dn", LEGACY_CANDLE_DOWN],
  ["wm_vp_poc", LEGACY_VP_POC],
  ["wm_vp_vah", LEGACY_VP_VAH],
  ["wm_vp_val", LEGACY_VP_VAL],
];

/** The slice of `Storage` this needs — narrower than the DOM interface. */
export type PaletteStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

/**
 * Free VP keys still byte-identical to the pre-OS literals, then stamp.
 *
 * Takes the store rather than reaching for `localStorage` so it is testable
 * without a DOM and so a caller in a non-browser render cannot crash on it.
 * Returns the number of keys freed — callers ignore it; tests do not.
 */
export function migrateVolumeProfilePalette(store: PaletteStore): number {
  let freed = 0;
  try {
    const from = Number(store.getItem(VP_PALETTE_VERSION_KEY) ?? 0);
    if (from >= VP_PALETTE_SCHEMA_VERSION) return 0;
    for (const [key, legacy] of LEGACY_VP_PALETTE) {
      if (store.getItem(key) === legacy) {
        // DELETE, never rewrite — the owner below is the only copy of the
        // value, exactly as with the candles.
        store.removeItem(key);
        freed++;
      }
    }
    store.setItem(VP_PALETTE_VERSION_KEY, String(VP_PALETTE_SCHEMA_VERSION));
  } catch {
    // A storage that throws (private mode, quota) must not take the chart
    // down with it. The palette simply falls through to the owner's defaults.
  }
  return freed;
}
