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
 * It does not touch `gridColor`, the crosshair, or the candle colours. Those
 * are also pre-OS values and they are also almost certainly unchosen, but a
 * migration that rewrites everything it suspects is a migration that will
 * eventually overwrite something a trader meant. One field, one reason,
 * one version bump.
 */

/** The room's material. Byte-identical to `FIELD` in WMOperatingSystem.tsx. */
export const MARKET_FIELD_DEFAULT = "#07080a";

/**
 * The cold navy the chart shipped on before the OS. Kept as a NAMED constant
 * rather than a loose literal so the migration below can only ever recognise
 * the one exact value it is licensed to replace.
 */
export const LEGACY_MARKET_FIELD = "#0B0E1A";

/** Bump when a future migration needs to run once over stored settings. */
export const CHART_SETTINGS_SCHEMA_VERSION = 2;

/** The shape this module needs; intentionally narrower than `ChartSettings`. */
export type StoredChartSettings = {
  background?: string;
  wmSchemaVersion?: number;
  [key: string]: unknown;
};

/**
 * Drop a `background` that is still the untouched legacy default so the
 * current default can apply, then stamp the schema version.
 *
 * Returns a NEW object; the input is never mutated. Callers spread the result
 * over `DEFAULT_CHART_SETTINGS`, so a dropped key simply falls through to the
 * canonical default rather than becoming `undefined`.
 */
export function migrateMarketField(stored: StoredChartSettings): StoredChartSettings {
  const next: StoredChartSettings = { ...stored };
  const alreadyMigrated = (next.wmSchemaVersion ?? 1) >= CHART_SETTINGS_SCHEMA_VERSION;

  if (!alreadyMigrated && next.background === LEGACY_MARKET_FIELD) {
    // Not `= MARKET_FIELD_DEFAULT`. Deleting the key keeps ONE owner of the
    // default — `DEFAULT_CHART_SETTINGS` — instead of minting a second copy
    // of the value inside every trader's storage, which is the exact shape
    // that made this migration necessary in the first place.
    delete next.background;
  }

  next.wmSchemaVersion = CHART_SETTINGS_SCHEMA_VERSION;
  return next;
}
